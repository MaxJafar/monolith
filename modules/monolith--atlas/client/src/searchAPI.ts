import { contract, createApiClient } from '@monolith/api'

// Use the system RAG contract, authorization and index; Atlas has no shadow index.
export const searchAPI = createApiClient(contract).search
