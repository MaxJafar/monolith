import { createChatProvider } from './chatTransport'

export const openrouterProvider = createChatProvider({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  structured: 'json',
  extra: { reasoning: { enabled: false } }
})
