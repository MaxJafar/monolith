// Explicit script files stay bundled, including relative-looking entry module IDs.
// Bare package imports, extensionless subpaths, and Node built-ins stay external.
export const externalDependencyRegex =
  /^(?!.*\/[^/]+\.(?:[cm]?[jt]sx?)$)(?:node:|(?![/.]))(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+(?:\/(?!\.{1,2}(?:\/|$))[a-zA-Z0-9_.-]+)*$/
