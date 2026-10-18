# Shared Mac mini AI

Monolith and Golden Retriever use one authenticated inference gateway over the existing pinned Tailscale SSH connection. The gateway and model servers listen on Mac loopback only. A persistent Windows SSH forward exposes `127.0.0.1:8771`; each application has a different private credential. Indexes and application databases remain on their existing hosts.

| Role                          | Runtime                               | Mac port             | Model                                                        |
| ----------------------------- | ------------------------------------- | -------------------- | ------------------------------------------------------------ |
| Text and vision               | llama.cpp b11588, Metal               | 1244                 | Gemma 4 E2B QAT Q4_0 and matching projector                  |
| Embeddings                    | llama.cpp b11588, Metal               | 1235                 | EmbeddingGemma 2 Q8_0, 768 dimensions                        |
| English decisions             | llama.cpp b11588, Metal               | 1236                 | Laya Q8_0                                                    |
| Multilingual decisions        | pinned llama.cpp PR 29363, native CPU | private stdin/stdout | Existing Laya multilingual checkpoint converted to F16       |
| Authenticated application API | Python 3.12 standard library          | 8771                 | No Torch, Transformers, LM Studio, or LM Link during serving |

Multilingual support is experimental: [upstream PR 29363](https://github.com/ggml-org/llama.cpp/pull/29363) was still unmerged at installation. It uses commit `ffc55c93bc33c1935983c0177375669bf0d7de35`. `prepare-multilingual.py` adds a line-oriented JSON daemon to the upstream CLI so weights and tokenization stay loaded between requests; it does not change inference. Non-ASCII text and text without enough English evidence route conservatively to the multilingual model. Decisions that exceed the trained context abstain in Golden Retriever.

The official server/runtime archive is `llama-b11588-bin-macos-arm64.tar.gz`, SHA-256 `95039180209cb8b9a2fadedd03e061c5131fed17e1eb423b3dcf8c7848d12b9d`.

Verified model hashes:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| Gemma text GGUF             | `fa401b55b07ee70a54c6dae3903c783a6e65064312529ea57175cb5f8dec6634` |
| Gemma projector             | `021059cce659fe7f9170d5599761d7bbaf644b798dab9503aca30dc43e6beb14` |
| EmbeddingGemma 2            | `2188ac1deca4b77dffefd603c2776a9d76d9d74ec01841392982ebb840b09135` |
| English Laya                | `c06528c5746d3bb8baa72a27938be95abbfd0b226f8471e8a9e365ed0bb066d2` |
| Converted multilingual Laya | `eb49211d0212e83a6c9ad1cc2d62753bf1eda2be42b73929989fd616c004ec42` |

The first three GGUF files reuse their existing Mac model cache under `~/.lmstudio/models`. These are ordinary files; serving does not call or launch LM Studio. Laya GGUFs are under `~/services/monolith-ai/models/native`.

## Tuning

Host files are in `/Users/maksud555/services/monolith-ai`. The Windows private deployment configuration is `C:\Users\user\.monolith-ai\config.json`; it includes credentials, so never commit or share its contents. Edit its `engines` entries to change context size, batch size, GPU layers, CPU threads, and additional llama.cpp flags. Change `multilingual.threads` for its native CPU engine. Source deployment preserves those tuning entries.

Deploy from the Monolith workspace with:

```powershell
pnpm exec node tools/ai-host/deploy.mjs
```

This copies source and private configuration, then restarts the Mac LaunchAgent. Wait for active indexing to finish before restarting. The service label is `com.monolith.shared-ai`; it starts at login and restarts failed engines. The Windows startup shortcut is `Monolith Shared AI Tunnel.lnk`, and reconnects the SSH forward after connection failures.

To rebuild the multilingual daemon on the Mac after reinstalling the pinned source:

```sh
PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/python3.12 \
  ~/services/monolith-ai/prepare-multilingual.py \
  ~/services/monolith-ai/llama/llama.cpp-ffc55c93bc33c1935983c0177375669bf0d7de35
```

Checkpoint conversion uses the dedicated Mac AI virtual environment. The user authorized pip only in that environment. Serving uses system Python and native binaries; it does not import the conversion dependencies.

## Application connections and checks

Monolith's backend has authenticated `ai.shared.status`, `embed`, `rerank`, and `generate` routes. Its `SHARED_AI_*` settings live in `env/.env.local`; the token stays in a private file and is never returned to browsers. Global content indexing and the search UI are separate work.

Golden Retriever uses the gateway's OpenAI-compatible `/v1` API for all four roles. `model=laya` chat requests adapt its existing relevance protocol to native decisions. Moving from native DigUp embeddings to the API creates a separate embedding index; an index-only rebuild preserves the 35,710 collected file rows and existing native index. Meaning search uses the new partial index while the rebuild runs; word search remains available.

Verified live: 768-dimensional document/query embeddings, Gemma text, image color recognition, structured analysis through Golden Retriever, English/Chinese relevance ordering, and Monolith's actual shared client. All seven upstream multilingual golden fixtures matched tokenization and decisions, with logits inside the upstream tolerance. Gateway and client boundary tests cover credentials, browser origins, unknown models, duplicate IDs, remote images, output limits, multilingual routing, abstention, redirects, unsafe endpoints, response schemas and size limits.

```powershell
pnpm exec C:/Users/user/.searchx/app/.venv/Scripts/python.exe tools/ai-host/test_gateway.py
pnpm exec node --experimental-strip-types --test tools/ai-host/test-client.mjs
```

Prompts, image pixels and credentials are not logged. Service logs contain lifecycle messages and error types only.
