import type { AiProvider, AiProviderRequest, AiProviderResponse } from "@/lib/ai/provider";

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export function createOpenAiProvider(): AiProvider {
  return {
    name: "openai",
    async generateReply(request: AiProviderRequest): Promise<AiProviderResponse> {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is required for the OpenAI AI provider.");
      }

      const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com").replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: request.model,
          temperature: 0.2,
          messages: [{ role: "system", content: request.systemPrompt }, ...request.messages]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI request failed: ${errorText}`);
      }

      const json = (await response.json()) as OpenAiChatResponse;
      const content = json.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }

      return { content, raw: json };
    }
  };
}
