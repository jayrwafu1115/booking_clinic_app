import type { AiProvider, AiProviderRequest, AiProviderResponse } from "@/lib/ai/provider";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

export function createOllamaProvider(): AiProvider {
  return {
    name: "ollama",
    async generateReply(request: AiProviderRequest): Promise<AiProviderResponse> {
      const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.model,
          stream: false,
          messages: [{ role: "system", content: request.systemPrompt }, ...request.messages]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama request failed: ${errorText}`);
      }

      const json = (await response.json()) as OllamaChatResponse;
      const content = json.message?.content?.trim();

      if (!content) {
        throw new Error("Ollama returned an empty response.");
      }

      return { content, raw: json };
    }
  };
}
