export interface ProviderMeta {
  id: string;
  name: string;
  envKey: string;
  defaultModel: string;
  keyPlaceholder: string;
  docsUrl: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-6',
    keyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModel: 'gemini-2.0-flash',
    keyPlaceholder: 'AI...',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    envKey: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-large-latest',
    keyPlaceholder: '...',
    docsUrl: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-3-mini',
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://console.x.ai',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
];
