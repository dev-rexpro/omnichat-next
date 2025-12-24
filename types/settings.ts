
export interface Settings {
  model: string;
  provider: string;
  systemInstruction: string;
  temperature: number;
  mediaResolution: 'default' | 'low' | 'high';
  thinking: boolean;
  thinkingLevel: 'minimal' | 'low' | 'medium' | 'high';
  thinkingBudget: number;
  tools: {
    structuredOutput: boolean;

    functionCalling: boolean;
    googleSearch: boolean;
    urlContext: boolean;
  };
  expandThinking: boolean;
  excludeThinkingOnSubmit: boolean;
  enablePythonInterpreter: boolean;
  displayUserMessagesRaw: boolean;
  displayModelMessagesRaw: boolean;
  apiKeys: Record<string, string>;
  advanced: {
    stopSequences: string[];
    maxOutputTokens: number;
    topP: number;
    topK: number;
  };
}
