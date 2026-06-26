import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { provider, baseUrl, apiKey } = await req.json();

    if (!provider || !baseUrl || !apiKey) {
      return NextResponse.json({
        models: [],
        error: 'Provider, base URL, and API key are required.'
      }, { status: 400 });
    }

    // Map provider to endpoint
    const endpoints: Record<string, string> = {
      openai: '/v1/models',
      azure: '/openai/deployments?api-version=2024-02-15-preview',
      anthropic: '/v1/models',
      mistral: '/v1/models',
      deepseek: '/v1/models',
      qwen: '/v1/models',
      groq: '/v1/models',
      'open-router': '/v1/models',
      'hugging-face': '/v1/models',
      cohere: '/v1/models',
      perplexity: '/v1/models',
      together: '/v1/models',
      nvidia: '/v1/models',
      custom: '/v1/models',
      aws: '/v1/models',
    };

    const endpoint = endpoints[provider] || '/v1/models';

    // Determine headers and auth method per provider
    let url: string;
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (provider === 'hugging-face') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (provider === 'aws') {
      url = `${baseUrl.replace(/\/+$/, '')}${endpoint}`;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Build URL
    if (provider === 'open-router') {
      url = `https://${baseUrl.replace(/^https?:\/\//, '')}${endpoint}`;
    } else if (provider === 'aws') {
      // AWS Bedrock uses S3-style paths
      url = `https://${baseUrl.replace(/^https?:\/\//, '')}${endpoint}`;
    } else {
      // Normalize baseUrl
      const normalizedBase = baseUrl.replace(/\/+$/, '');
      url = `${normalizedBase}${endpoint}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      // Disable cache to ensure fresh models
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        models: [],
        error: `HTTP ${response.status}: ${errorText}`
      }, { status: response.status });
    }

    const data = await response.json();

    let models: { id: string; name: string }[] = [];

    if (Array.isArray(data.data)) {
      models = data.data.map((m: any) => ({
        id: m.id || m.name,
        name: m.id ? (m.name || m.id.split('/').pop() || m.id) : m.name,
      }));
    } else if (typeof data.models === 'object' && data.models !== null) {
      // Mistral-style response (different shape)
      models = Object.entries(data.models).map(([id, info]: [string, any]) => ({
        id,
        name: info.id || info.displayName || id,
      }));
    } else if (Array.isArray(data)) {
      models = data.map((m: any) => ({
        id: m.id || m.name,
        name: m.id ? (m.name || m.id) : m.name,
      }));
    } else {
      return NextResponse.json({
        models: [],
        error: 'Unexpected response format from provider.'
      }, { status: 500 });
    }

    return NextResponse.json({ models });

  } catch (error: any) {
    console.error('Fetch Models Error:', error);
    return NextResponse.json({
      models: [],
      error: error.message || 'Failed to fetch models'
    }, { status: 500 });
  }
}
