import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleImageGeneration } from './image-gen-helper';

// OpenAI-compatible streaming handler
async function handleOpenAICompatibleChat(messages: any[], settings: any) {
    const { model, provider, temperature, advanced, systemInstruction, apiKeys } = settings;
    const apiKey = apiKeys?.[provider];
    const baseUrl = settings.providerSettings?.[provider]?.baseUrl ||
        (provider === 'groq' ? 'https://api.groq.com/openai' :
         provider === 'open-router' ? 'https://openrouter.ai/api' :
         provider === 'hugging-face' ? 'https://router.huggingface.co' :
         provider === 'deepseek' ? 'https://api.deepseek.com' :
         provider === 'qwen' ? 'https://dashscope.aliyuncs.com/compatible-mode' :
         provider === 'mistral' ? 'https://api.mistral.ai' :
         provider === 'openai' ? 'https://api.openai.com' :
         provider === 'anthropic' ? 'https://api.anthropic.com' :
         provider === 'nvidia' ? 'https://integrate.api.nvidia.com' :
         provider === 'perplexity' ? 'https://api.perplexity.ai' :
         provider === 'together' ? 'https://api.together.xyz' :
         provider === 'cohere' ? 'https://api.cohere.ai' :
         provider === 'custom' ? 'https://api.custom.com' :
         provider === 'azure' ? 'https://<your-resource-name>.openai.azure.com' :
         provider === 'aws' ? 'https://<your-resource-name>.amazonaws.com/openai' :
         'https://api.openai.com');

    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const chatUrl = `${normalizedBase}/v1/chat/completions`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    };

    if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        delete headers['Authorization'];
    }

    const openAIMessages: any[] = [];
    if (systemInstruction) {
        openAIMessages.push({ role: 'system', content: systemInstruction });
    }
    for (const m of messages) {
        if (m.role === 'user') {
            openAIMessages.push({ role: 'user', content: m.content || '' });
        } else if (m.role === 'assistant') {
            openAIMessages.push({
                role: 'assistant',
                content: m.content || '',
                reasoning_content: m.reasoning_content || undefined,
            });
        } else if (m.role === 'function') {
            openAIMessages.push({ role: 'function', name: m.name, content: m.content });
        }
    }

    const MAX_TOKENS_LIMITS: Record<string, number> = {
        groq: 8192,
        "open-router": 8192,
        default: 32000,
    };

    const getMaxTokensForProvider = (provider: string, maxOutputTokens: number | undefined) => {
        const limit = MAX_TOKENS_LIMITS[provider] ?? MAX_TOKENS_LIMITS.default;
        if (maxOutputTokens && maxOutputTokens > limit) {
            return limit;
        }
        if (maxOutputTokens && maxOutputTokens < 1) {
            return undefined;
        }
        return maxOutputTokens || undefined;
    };

    const body: any = {
        model,
        messages: openAIMessages,
        stream: true,
        temperature,
        max_tokens: getMaxTokensForProvider(provider, advanced?.maxOutputTokens),
        top_p: advanced?.topP || undefined,
        stop: advanced?.stopSequences?.length > 0 ? advanced.stopSequences : undefined,
    };

    const response = await fetch(chatUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
            error: `${provider} API Error (${response.status}): ${errorText}`
        }, { status: response.status });
    }

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
        async start(controller) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) { controller.close(); return; }
            try {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: ')) continue;
                        const dataStr = trimmed.slice(6).trim();
                        if (dataStr === '[DONE]') {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            continue;
                        }
                        try {
                            const data = JSON.parse(dataStr);
                            const delta = data.choices?.[0]?.delta || {};
                            const content = delta.content || '';
                            const reasoning = delta.reasoning_content || '';
                            const output = JSON.stringify({
                                choices: [{
                                    delta: { content, reasoning_content: reasoning || undefined },
                                    index: 0,
                                    finish_reason: data.choices?.[0]?.finish_reason || null,
                                }],
                            });
                            controller.enqueue(encoder.encode(`data: ${output}\n\n`));
                        } catch (e) { /* skip */ }
                    }
                }
                controller.close();
            } catch (error) { controller.error(error); }
        },
    });

    return new Response(customStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}

async function handleDeepResearch(messages: any[], apiKey: string) {
    const lastMessage = messages[messages.length - 1];
    const input = lastMessage.content;

    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
                input,
                agent: "deep-research-pro-preview-12-2025",
                background: true,
                stream: true,
                agent_config: { type: "deep-research", thinking_summaries: "auto" }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deep Research API Error: ${response.status} ${errorText}`);
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = response.body?.getReader();

        const customStream = new ReadableStream({
            async start(controller) {
                if (!reader) { controller.close(); return; }
                try {
                    let buffer = "";
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || "";
                        let currentEvent: string | null = null;
                        for (const line of lines) {
                            if (line.startsWith('event: ')) currentEvent = line.slice(7).trim();
                            else if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6).trim();
                                if (!dataStr) continue;
                                try {
                                    const data = JSON.parse(dataStr);
                                    let chunkText = "";
                                    let reasoningText = "";
                                    if (currentEvent === 'content.delta') {
                                        if (data.delta?.type === 'text') chunkText = data.delta.text;
                                        else if (data.delta?.type === 'thought_summary') reasoningText = `\nThought: ${data.delta.content.text}\n`;
                                    }
                                    if (chunkText || reasoningText) {
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                            choices: [{ delta: { content: chunkText, reasoning_content: reasoningText || undefined }, index: 0, finish_reason: null }],
                                        })}\n\n`));
                                    }
                                } catch (e) { /* ignore */ }
                            }
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (error) { controller.error(error); }
            },
        });

        return new Response(customStream, {
            headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
        });
    } catch (error: any) {
        console.error('Deep Research Error:', error);
        return NextResponse.json({ error: error.message || 'Deep Research Failed' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { messages, settings } = await req.json();
        const { model, provider, temperature, advanced, systemInstruction, apiKeys } = settings;

        const apiKey = apiKeys?.[provider];

        if (!apiKey) {
            return NextResponse.json({ error: `${provider} API Key is required. Please update your Settings.` }, { status: 400 });
        }

        if (settings.tools?.deepResearch) return await handleDeepResearch(messages, apiKey);

        const isImageModel = model.includes("image");
        if (isImageModel) return await handleImageGeneration(messages, model, apiKey);

        if (provider === 'google') {
            const genAI = new GoogleGenerativeAI(apiKey);
            const tools: any[] = [];
            const enableGoogleSearch = settings.tools?.googleSearch || settings.tools?.urlContext;
            if (enableGoogleSearch) {
                if (model.includes("1.5")) tools.push({ googleSearchRetrieval: {} });
                else tools.push({ googleSearch: {} });
            }
            if (settings.tools?.codeExecution) tools.push({ codeExecution: {} });
            if (settings.tools?.functionCalling && settings.functionDeclarations) {
                try {
                    const funcs = JSON.parse(settings.functionDeclarations);
                    if (Array.isArray(funcs) && funcs.length > 0) tools.push({ functionDeclarations: funcs });
                } catch (e) { console.warn("Failed to parse function declarations:", e); }
            }
            if (settings.tools?.urlContext) tools.push({ url_context: {} });

            let thinkingConfig: any = undefined;
            if (settings.thinking && !model.includes("2.0-flash")) {
                if (model.includes("gemini-3")) thinkingConfig = { includeThoughts: true, thinkingLevel: settings.thinkingLevel || 'medium' };
                else thinkingConfig = { includeThoughts: true, thinkingBudget: settings.thinkingBudget || 8000 };
            }

            const modelInstance = genAI.getGenerativeModel({
                model, systemInstruction: systemInstruction || undefined,
                tools: tools.length > 0 ? tools : undefined,
            });

            const generationConfig = {
                temperature, topP: advanced.topP, topK: advanced.topK,
                maxOutputTokens: advanced.maxOutputTokens,
                stopSequences: advanced.stopSequences?.length > 0 ? advanced.stopSequences : undefined,
                thinkingConfig,
            };

            const history = messages.slice(0, -1).map((m: any) => {
                if (m.role === 'function') {
                    let responseContent = {};
                    try { responseContent = JSON.parse(m.content); } catch (e) { responseContent = { result: m.content }; }
                    return { role: 'function', parts: [{ functionResponse: { name: m.name, response: responseContent } }] };
                }
                const parts: any[] = [];
                const isAssistant = m.role === 'assistant';
                const includeReasoning = !settings.excludeThinkingOnSubmit && isAssistant && m.reasoning_content;
                let textContent = m.content || "";
                if (includeReasoning) textContent = `<thought>\n${m.reasoning_content}\n</thought>\n\n${textContent}`;
                if (textContent) parts.push({ text: textContent });
                if (m.attachments?.length > 0) {
                    m.attachments.forEach((att: any) => {
                        if (att.content) parts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
                        else if (att.data?.includes('base64,')) {
                            parts.push({ inlineData: { mimeType: att.type, data: att.data.split(',')[1] } });
                        }
                    });
                }
                if (isAssistant && m.functionCalls?.length > 0) {
                    m.functionCalls.forEach((call: any) => parts.push({ functionCall: { name: call.name, args: call.args } }));
                }
                if (parts.length === 0) parts.push({ text: " " });
                return { role: m.role === 'assistant' ? 'model' : 'user', parts };
            });

            const lastMsgObj = messages[messages.length - 1];
            const lastMessageParts: any[] = [];
            if (lastMsgObj.content) lastMessageParts.push({ text: lastMsgObj.content });
            if (lastMsgObj.attachments?.length > 0) {
                lastMsgObj.attachments.forEach((att: any) => {
                    if (att.content) lastMessageParts.push({ text: `\n[File: ${att.name}]\n${att.content}\n` });
                    else if (att.data?.includes('base64,')) {
                        lastMessageParts.push({ inlineData: { mimeType: att.type, data: att.data.split(',')[1] } });
                    }
                });
            }

            const chatSession = modelInstance.startChat({ generationConfig, history });
            const result = await chatSession.sendMessageStream(lastMessageParts);

            const encoder = new TextEncoder();
            const customStream = new ReadableStream({
                async start(controller) {
                    try {
                        let groundingMetadata: any = null;
                        for await (const chunk of result.stream) {
                            const candidate = (chunk as any).candidates?.[0];
                            const parts = candidate?.content?.parts || [];
                            if (candidate?.groundingMetadata) groundingMetadata = candidate.groundingMetadata;
                            let chunkText = "", reasoningText = "";
                            const functionCalls: any[] = [];
                            for (const part of parts) {
                                if ('thought' in part && (part as any).thought === true) reasoningText += (part as any).text || "";
                                else if ('text' in part) chunkText += (part as any).text;
                                else if ('functionCall' in part) functionCalls.push((part as any).functionCall);
                            }
                            if (chunkText || reasoningText || functionCalls.length > 0) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                                    choices: [{ delta: { content: chunkText, reasoning_content: reasoningText || undefined, function_calls: functionCalls.length > 0 ? functionCalls : undefined }, index: 0, finish_reason: null }],
                                })}\n\n`));
                            }
                        }
                        if (groundingMetadata) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ groundingMetadata })}\n\n`));
                        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                        controller.close();
                    } catch (error) { controller.error(error); }
                },
            });

            return new Response(customStream, {
                headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
            });
        } else {
            return await handleOpenAICompatibleChat(messages, settings);
        }
    } catch (error: any) {
        console.error('Chat Error:', error);
        return NextResponse.json({ error: error.message || 'Terjadi kesalahan pada server' }, { status: 500 });
    }
}
