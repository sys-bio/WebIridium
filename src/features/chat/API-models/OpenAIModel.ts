export type OpenAiMessage = { text: string };

export type OpenAiOutput = { content: OpenAiMessage[] };

export type OpenAiResponse = { output: OpenAiOutput[] };
