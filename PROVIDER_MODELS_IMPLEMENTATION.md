# Multi-Provider Model Support Implementation

## Overview
Implemented dynamic model fetching for 20+ AI providers (OpenAI, Groq, Anthropic, OpenRouter, Mistral, Deepseek, Qwen, Cohere, Perplexity, Together, HuggingFace, Nvidia, Azure, AWS, Google, and local providers).

## New Files Created

### 1. `/config/provider-models.json`
- Contains hardcoded model lists for all supported providers
- Fallback data when API fetching fails
- Organized by provider ID with model ID and display name
- Supports 50+ total models across all providers

### 2. `/lib/fetch-models.ts`
Service module for fetching models with the following functions:

- **`fetchProviderModels(provider, apiKey, baseUrl)`**: Fetches models from provider APIs
  - Supports OpenRouter API endpoint (`/api/v1/models`)
  - Supports Ollama local API (`/api/tags`)
  - Falls back to hardcoded models
  - Handles API errors gracefully

- **`getDefaultModels(provider)`**: Returns hardcoded models for a provider
- **`getFirstModelId(provider)`**: Gets the first available model ID for a provider

## Modified Files

### 1. `/components/settings/general-panel.tsx`
**Changes:**
- Added state management for dynamic models (`availableModels`, `isFetchingModels`, `fetchError`)
- Implemented `handleFetchModels()` function to trigger API requests
- Updated model dropdown to use `availableModels` instead of hardcoded lists
- Added "Fetch Models" button with loading spinner
- Shows error messages if fetching fails
- Automatically loads default models when provider changes
- Hidden fetch button for local providers (llama-cpp, lm-studio, ollama, vllm, custom)

**Features:**
- Loading spinner while fetching
- Error message display
- Graceful fallback to default models
- Provider-aware model list updates

### 2. `/components/chat-header.tsx`
**Changes:**
- Replaced hardcoded GEMINI_MODELS and GEMINI_IMAGE_MODELS with dynamic loading
- Updated ModelList component to accept provider as prop
- Uses `getDefaultModels()` to get models for current provider
- Maintains Google-specific image models support
- Uses useMemo for performance optimization

**Features:**
- Dynamic model list based on selected provider
- Proper fallback for image models when using Google
- Cached model list to prevent unnecessary recalculations

## How to Use

### In Settings
1. Open Settings → General tab
2. Select a provider from the dropdown
3. (Optional) Enter API key for that provider
4. Click "Fetch Models" button to get latest available models from provider API
5. If fetch fails, default models are automatically shown
6. Select a model from the dropdown
7. Click Save

### In Chat
1. Model dropdown at top right shows available models for current provider
2. Click to select a different model
3. Selection is saved immediately

## API Integration Examples

### OpenRouter
When you click "Fetch Models" for OpenRouter:
```
GET https://openrouter.ai/api/v1/models
Authorization: Bearer {API_KEY}
```
Returns list of available models on OpenRouter

### Ollama (Local)
When you click "Fetch Models" for Ollama:
```
GET http://localhost:11434/api/tags
```
Returns list of locally loaded models

### Other Providers
- Each provider has hardcoded default models
- Some providers support API model listing but require authentication
- Graceful fallback ensures user always sees available models

## Supported Providers

| Provider | API Fetching | Default Models | Local |
|----------|-------------|----------------|-------|
| Google | ❌ (Hardcoded) | ✅ | ❌ |
| OpenAI | ❌ (Hardcoded) | ✅ | ❌ |
| Groq | ✅ | ✅ | ❌ |
| OpenRouter | ✅ | ✅ | ❌ |
| Anthropic | ❌ (Hardcoded) | ✅ | ❌ |
| Mistral | ❌ (Hardcoded) | ✅ | ❌ |
| Deepseek | ❌ (Hardcoded) | ✅ | ❌ |
| Qwen | ❌ (Hardcoded) | ✅ | ❌ |
| Cohere | ❌ (Hardcoded) | ✅ | ❌ |
| Perplexity | ❌ (Hardcoded) | ✅ | ❌ |
| Together | ❌ (Hardcoded) | ✅ | ❌ |
| HuggingFace | ❌ (Hardcoded) | ✅ | ❌ |
| Nvidia | ❌ (Hardcoded) | ✅ | ❌ |
| Azure | ❌ (Hardcoded) | ✅ | ❌ |
| AWS Bedrock | ❌ (Hardcoded) | ✅ | ❌ |
| Llama.cpp | ❌ | ✅ | ✅ |
| LM Studio | ❌ | ✅ | ✅ |
| Ollama | ✅ | ✅ | ✅ |
| vLLM | ❌ | ✅ | ✅ |
| Custom | ❌ | ✅ | ✅ |

## Future Enhancements

1. **Add more API providers**: Implement fetching for providers that support model listing endpoints
2. **Model caching**: Cache fetched models locally to reduce API calls
3. **Custom model names**: Allow users to add custom model names/aliases
4. **Model comparison**: Add a UI to compare model capabilities
5. **Provider auto-detection**: Auto-select best provider based on use case

## Technical Notes

- All model lists are typed with `ProviderModel` interface (`{ id: string; name: string }`)
- Async fetching handles errors gracefully without blocking UI
- Default models loaded synchronously for better UX
- Provider configuration in `config/inference-providers.json` defines provider metadata
- Model lists in `config/provider-models.json` define available models per provider

## Testing

1. **Test with OpenRouter**: Add API key, click "Fetch Models", verify models load
2. **Test with Ollama**: Start Ollama locally, click "Fetch Models", verify models load
3. **Test fallback**: Close API access, click "Fetch Models", verify default models show
4. **Test provider switching**: Switch between providers, verify models update correctly
5. **Test model selection**: Select different models, verify in chat header updates
