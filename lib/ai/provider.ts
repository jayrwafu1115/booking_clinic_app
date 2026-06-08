import { createOpenAiProvider } from "@/lib/ai/openai-provider";
import { createOllamaProvider } from "@/lib/ai/ollama-provider";
import type { AiProviderOption } from "@/types/database";

export type AiChatRole = "system" | "user" | "assistant" | "tool";

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiProviderRequest = {
  model: string;
  systemPrompt: string;
  messages: AiChatMessage[];
};

export type AiProviderResponse = {
  content: string;
  raw?: unknown;
};

export interface AiProvider {
  name: AiProviderOption;
  generateReply(request: AiProviderRequest): Promise<AiProviderResponse>;
}

export function getAiProvider(provider: AiProviderOption): AiProvider {
  return provider === "ollama" ? createOllamaProvider() : createOpenAiProvider();
}
