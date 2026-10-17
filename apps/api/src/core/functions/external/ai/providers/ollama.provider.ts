import { createChatProvider } from './chatTransport'

export const ollamaProvider = createChatProvider({
  name: 'ollama',
  baseURL: 'http://localhost:11434/v1',
  local: true,
  structured: 'schema'
})
