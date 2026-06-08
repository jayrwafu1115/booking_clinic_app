import type { AiProviderOption, AiTone } from "@/types/database";

export const AI_PROVIDERS = ["openai", "ollama"] as const satisfies readonly AiProviderOption[];
export const AI_TONES = ["professional", "friendly", "formal", "casual"] as const satisfies readonly AiTone[];

export const OPENAI_MODELS = ["gpt-4o", "gpt-4.1"] as const;
export const OLLAMA_MODELS = ["llama3", "qwen", "deepseek", "mistral"] as const;

export const DEFAULT_AI_WELCOME_MESSAGE = "Welcome! I am your AI booking assistant. How can I help you today?";

export function getModelsForProvider(provider: AiProviderOption) {
  return provider === "openai" ? OPENAI_MODELS : OLLAMA_MODELS;
}
