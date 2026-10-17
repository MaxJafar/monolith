import { createChatProvider } from './chatTransport'

export const deepseekProvider = createChatProvider({
  name: 'deepseek',
  baseURL: 'https://api.deepseek.com',
  structured: 'json'
})
