import { createChatProvider } from './chatTransport'

export const groqProvider = createChatProvider({
  name: 'groq',
  baseURL: 'https://api.groq.com/openai/v1',
  structured: 'none'
})
