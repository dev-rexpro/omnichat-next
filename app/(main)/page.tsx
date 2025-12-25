
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useChat } from "@/hooks/use-chat"
import { useSettings } from "@/hooks/use-settings"
import { ChatArea } from "@/components/chat-area"

// Legacy Integration Hooks
import { usePrefilledMessage } from "@/hooks/use-prefilled-message"
import { useFileUpload } from "@/hooks/use-file-upload"

export default function ChatPage() {
  // Chat logic state
  const { messages, addMessage, updateMessage, deleteMessage } = useChat()
  const { settings } = useSettings()
  const [userInput, setUserInput] = useState("")

  // Replaced simple state with advanced hook
  const fileUploadApi = useFileUpload({
    pdfAsImage: false // Default to text extraction for PDFs
  });
  const { attachments, setAttachments: _set, handleFiles } = fileUploadApi as any; // Destructure common used, keep api obj
  // Note: we just use fileUploadApi object to pass down. 

  // Need to handle manual clearing in sendMessage
  const clearAttachments = fileUploadApi.clearAttachments;

  const [isProcessing, setIsProcessing] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Prefilled Message Hook
  const { prefilledContent, isPrefilledSend } = usePrefilledMessage();

  // Handle Prefilled Message
  useEffect(() => {
    if (prefilledContent && !userInput && !isProcessing && attachments.length === 0) {
      setUserInput(prefilledContent);
      if (isPrefilledSend) {
        // Slight delay to ensure state set
        setTimeout(() => {
          sendMessage([], prefilledContent);
        }, 100);
      }
    }
  }, [prefilledContent, isPrefilledSend]);

  // --- Handlers ---

  const sendMessage = async (incomingAttachments?: Array<{ name: string, type: string, data: string }>, overrideText?: string) => {
    const currentAttachments = incomingAttachments ?? attachments;
    const text = (overrideText ?? userInput).trim()

    if (!text && (!currentAttachments || currentAttachments.length === 0)) return

    setIsProcessing(true)

    if (!overrideText) {
      setUserInput("")
      clearAttachments()
    }

    // Add user message to DB only if not regenerating
    if (!overrideText) {
      await addMessage({
        role: "user",
        content: text,
        attachments: currentAttachments.length > 0 ? currentAttachments : undefined
      });
    }

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const dbMessages = messages || [];
      const lastMessage = dbMessages[dbMessages.length - 1];

      let chatHistory: Array<{ role: string; content: string; attachments?: any[] }> = dbMessages.map(m => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments
      }));

      // In case messages hook hasn't updated yet, ensure we have the latest
      if (!lastMessage || (lastMessage.content !== text && !overrideText) || lastMessage.role !== "user") {
        chatHistory.push({
          role: "user",
          content: text,
          attachments: attachments || undefined
        });
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          settings: settings,
        }),
        signal: controller.signal,
      })
      // ... (rest of the logic)
      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error?.message || errorData.error || response.statusText;
        const debugInfo = errorData.details ? `\n\nDebug: ${JSON.stringify(errorData.details)}` : '';

        await addMessage({
          role: "assistant",
          content: `Error: ${errorMessage}${debugInfo}`,
        })
        setIsProcessing(false)
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""
      let assistantReasoning = ""

      const assistantMessageId = await addMessage({
        role: "assistant",
        content: "",
        model: settings.model
      })

      while (true) {
        const { done, value } = await (reader?.read() || { done: true, value: undefined })
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim()
            if (data === "[DONE]") continue

            try {
              const json = JSON.parse(data)

              // Handle metadata updates (Grounding or URL Context)
              if (json.groundingMetadata || json.urlContextMetadata) {
                await updateMessage(assistantMessageId, {
                  groundingMetadata: json.groundingMetadata,
                  urlContextMetadata: json.urlContextMetadata
                })
                continue
              }

              const content = json.choices?.[0]?.delta?.content || ""
              const reasoning = json.choices?.[0]?.delta?.reasoning_content || ""

              if (content || reasoning) {
                assistantContent += content
                assistantReasoning += reasoning
                await updateMessage(assistantMessageId, {
                  content: assistantContent,
                  reasoning_content: assistantReasoning || undefined
                })
              }
            } catch (e) {
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Chat Error:", error)
        await addMessage({ role: "assistant", content: "Maaf, terjadi kesalahan saat menghubungi AI." })
      }
    } finally {
      setIsProcessing(false)
      setAbortController(null)
    }
  }

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort()
    }
    setIsProcessing(false)
  }

  const onRegenerate = async () => {
    if (isProcessing || !messages || messages.length === 0) return

    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")
    if (!lastUserMsg) return

    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === "assistant" && lastMsg.id! > lastUserMsg.id!) {
      await deleteMessage(lastMsg.id!)
    }

    sendMessage(lastUserMsg.attachments, lastUserMsg.content)
  }

  const onEdit = async (id: number, content: string) => {
    await updateMessage(id, { content })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, incomingAttachments?: any[]) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isProcessing) {
        sendMessage(incomingAttachments)
      }
    }
  }

  return (
    <ChatArea
      userInput={userInput}
      setUserInput={setUserInput}
      attachments={attachments}
      fileUploadApi={fileUploadApi}
      isProcessing={isProcessing}
      sendMessage={sendMessage}
      stopGeneration={stopGeneration}
      handleKeyDown={handleKeyDown}
      onRegenerate={onRegenerate}
      onEdit={onEdit}
    />
  )
}
