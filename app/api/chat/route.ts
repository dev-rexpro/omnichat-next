import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        const { messages, settings } = await req.json();
        const { model, provider, temperature, advanced, systemInstruction, apiKeys } = settings;

        const apiKey = apiKeys?.[provider];

        if (!apiKey) {
            return NextResponse.json({
                error: `${provider} API Key is required. Please update your Settings.`
            }, { status: 400 });
        }

        // Initialize Google Generative AI
        const genAI = new GoogleGenerativeAI(apiKey);

        // Tools configuration
        const tools: any[] = [];
        if (settings.tools?.googleSearch) {
            tools.push({ googleSearchRetrieval: {} });
        }
        if (settings.tools?.codeExecution) {
            tools.push({ codeExecution: {} });
        }

        // Thinking configuration
        let thinkingConfig: any = undefined;
        if (settings.thinking && !model.includes("2.0-flash")) {
            if (model.includes("gemini-3")) {
                thinkingConfig = {
                    includeThoughts: true,
                    thinkingLevel: settings.thinkingLevel || 'medium'
                };
            } else {
                // For 1.5-pro, 2.5-pro, etc. that support budget
                thinkingConfig = {
                    includeThoughts: true,
                    thinkingBudget: settings.thinkingBudget || 8000
                };
            }
        }

        // Configuration model
        const modelInstance = genAI.getGenerativeModel({
            model: model,
            systemInstruction: systemInstruction || undefined,
            tools: tools.length > 0 ? tools : undefined,
        });

        const generationConfig = {
            temperature: temperature,
            topP: advanced.topP,
            topK: advanced.topK,
            maxOutputTokens: advanced.maxOutputTokens,
            stopSequences: advanced.stopSequences?.length > 0 ? advanced.stopSequences : undefined,
            // @ts-ignore
            thinkingConfig: thinkingConfig,
        };

        // Format messages untuk Gemini SDK (alternating user/model)
        const history = messages.slice(0, -1).map((m: any) => {
            const parts: any[] = [];

            const isAssistant = m.role === 'assistant';
            const includeReasoning = !settings.excludeThinkingOnSubmit && isAssistant && m.reasoning_content;

            let textContent = m.content || "";
            if (includeReasoning) {
                textContent = `<thought>\n${m.reasoning_content}\n</thought>\n\n${textContent}`;
            }

            if (textContent) {
                parts.push({ text: textContent });
            }

            if (m.attachments && m.attachments.length > 0) {
                m.attachments.forEach((att: any) => {
                    if (att.content) {
                        parts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
                    } else if (att.data && att.data.includes('base64,')) {
                        // Extract base64 data from Data URI: "data:image/png;base64,iVBOR..."
                        const base64Data = att.data.split(',')[1];
                        parts.push({
                            inlineData: {
                                mimeType: att.type,
                                data: base64Data
                            }
                        });
                    }
                });
            }

            // Gemini doesn't like completely empty parts, so add a space if both are missing
            if (parts.length === 0) {
                parts.push({ text: " " });
            }

            return {
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: parts,
            };
        });

        const lastMsgObj = messages[messages.length - 1];
        const lastMessageContent = lastMsgObj.content;
        const lastMessageParts: any[] = [];

        if (lastMessageContent) {
            lastMessageParts.push({ text: lastMessageContent });
        }

        if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
            lastMsgObj.attachments.forEach((att: any) => {
                if (att.content) {
                    lastMessageParts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
                } else if (att.data && att.data.includes('base64,')) {
                    const base64Data = att.data.split(',')[1];
                    lastMessageParts.push({
                        inlineData: {
                            mimeType: att.type,
                            data: base64Data
                        }
                    });
                }
            });
        }

        const chatSession = modelInstance.startChat({
            generationConfig,
            history,
        });

        // Mulai streaming
        const result = await chatSession.sendMessageStream(lastMessageParts);

        // Transform stream Gemini ke format OpenAI-compatible (untuk front-end yang sudah ada)
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const parts = (chunk as any).candidates?.[0]?.content?.parts || [];
                        let chunkText = "";
                        let reasoningText = "";

                        for (const part of parts) {
                            if ('thought' in part && (part as any).thought === true) {
                                reasoningText += (part as any).text || "";
                            } else if ('text' in part) {
                                chunkText += part.text;
                            }
                        }

                        if (chunkText || reasoningText) {
                            const data = JSON.stringify({
                                choices: [
                                    {
                                        delta: {
                                            content: chunkText,
                                            reasoning_content: reasoningText || undefined
                                        },
                                        index: 0,
                                        finish_reason: null,
                                    },
                                ],
                            });
                            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Gemini SDK Error:', error);
        return NextResponse.json({
            error: error.message || 'Terjadi kesalahan pada Google Gemini SDK'
        }, { status: 500 });
    }
}
