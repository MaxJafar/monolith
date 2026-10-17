/** Registry use is opt-in. A checkout never contacts another product's index. */
export function registryConfig(env: NodeJS.ProcessEnv = process.env) {
  const repo = env.MONOLITH_REGISTRY_REPO?.trim()
  const ref = env.MONOLITH_REGISTRY_REF?.trim() || 'main'

  if (!repo)
    throw new Error(
      'No addon registry configured. Set MONOLITH_REGISTRY_REPO=owner/repository, or use pnpm monolith addons create / pack for local addons.'
    )
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repo))
    throw new Error('MONOLITH_REGISTRY_REPO must be owner/repository')
  if (!/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(ref) || ref.includes('..'))
    throw new Error(
      'MONOLITH_REGISTRY_REF must be a valid branch, tag or commit'
    )

  return { repo, ref }
}
