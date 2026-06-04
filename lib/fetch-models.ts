import providerModels from "@/config/provider-models.json"
import type providersConfig from "@/config/inference-providers.json"

type ProviderId = keyof typeof providersConfig
type ProviderModel = { id: string; name: string }

export async function fetchProviderModels(
  provider: ProviderId,
  apiKey?: string,
  baseUrl?: string
): Promise<ProviderModel[]> {
  try {
    // For local providers, return default models
    if (["llama-cpp", "lm-studio", "ollama", "vllm"].includes(provider)) {
      return providerModels[provider as keyof typeof providerModels] || []
    }

    // For custom/unknown providers
    if (provider === "custom") {
      return providerModels.custom || []
    }

    // Try to fetch from OpenRouter API
    if (provider === "open-router" && apiKey) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          return data.data
            .map((model: any) => ({
              id: model.id,
              name: model.name || model.id,
            }))
            .slice(0, 50) // Limit to 50 models for performance
        }
      } catch (error) {
        console.warn("[v0] Failed to fetch OpenRouter models, using defaults:", error)
      }
    }

    // For other providers that might support list endpoints
    if (provider === "ollama" && baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/api/tags`)
        if (response.ok) {
          const data = await response.json()
          return (data.models || []).map((model: any) => ({
            id: model.name,
            name: model.name,
          }))
        }
      } catch (error) {
        console.warn("[v0] Failed to fetch Ollama models:", error)
      }
    }

    // Fallback to hardcoded models for the provider
    const models = providerModels[provider as keyof typeof providerModels]
    return models || []
  } catch (error) {
    console.error("[v0] Error fetching models:", error)
    // Return default/hardcoded models as fallback
    const models = providerModels[provider as keyof typeof providerModels]
    return models || []
  }
}

export function getDefaultModels(provider: ProviderId): ProviderModel[] {
  const models = providerModels[provider as keyof typeof providerModels]
  return models || []
}

export function getFirstModelId(provider: ProviderId): string {
  const models = getDefaultModels(provider)
  return models.length > 0 ? models[0].id : "default"
}
