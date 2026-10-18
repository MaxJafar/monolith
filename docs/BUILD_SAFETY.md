# Local build safety

Normal `pnpm build`, package builds, addon builds, the root postinstall build,
desktop bundles and other registered build entry points use the shared guard.
Their original commands are stored in each manifest's `monolithBuilds` map;
the scripts invoke `tools/build-guard.mjs --task <name>`.

- Turbo and pnpm workspace execution are serial.
- Only one guarded build pipeline may run on this machine at a time. A second
  command is refused before it starts a compiler. Nested package commands may
  run sequentially; parallel sibling commands are refused.
- On Windows, the compiler command and all descendants share a **4 GiB hard
  committed-memory limit**, enforced by a job object. Assignment occurs before
  the first command can execute. Native allocations count against this limit.
- Each Node child has a **2 GiB old-generation heap ceiling**. This supplements
  the Windows limit; a Node heap option alone is not a whole-process RAM cap.
- Windows builds use idle priority and two logical CPUs. Compiler worker counts
  are also reduced. At the default budget, starting requires **8 GiB free RAM**
  and less than 75% physical memory use. Below **6 GiB free** or at 80% memory use,
  the guard stops only its owned build tree. It does not retry automatically.
- Failure, cancellation or a closed launcher cleans up the owned compiler tree.
  A crashed build cannot leave a stale file lock or silently start a replacement.

For an ad-hoc compiler invocation, use the same guard:

```sh
pnpm build:safe -- pnpm exec vite build --config path/to/vite.config.ts
```

Running a compiler binary directly bypasses this launcher. Do not use unwrapped
compiler commands. New package build scripts must use the guard as well; the
coverage test checks the existing build scripts.

`MONOLITH_BUILD_MEMORY_MIB` can lower the Windows budget to 256–4096 MiB; values
above 4096 are refused. The JS heap and free-memory thresholds shrink with a
lower budget, while the 75%/80% load thresholds remain. Use a lower cap only for
small jobs or a smaller CI host. A large build may fail at its cap: do not raise
it or launch a concurrent retry to work around that failure.

The interprocess lock, serial scheduling, Node heap limit and memory-pressure
checks also apply on other platforms. The **OS-enforced process-tree limit is
Windows-specific**; Unix hosts need their own container/cgroup limits for an
equivalent hard ceiling.

Validate without rebuilding the application or opening user storage:

```sh
pnpm build:guard:test
```

The tests use small synthetic jobs in `.temp/build-guard-tests`. The OS cap test
uses a 256 MiB job and requests a rejected 512 MiB commitment without touching
that memory. It also checks nested/concurrent commands, cancellation cleanup,
exit statuses, heap settings and memory-reserve boundaries. No dependency
installation, user-data migration or application launch is needed.

## Why the earlier builds overlapped

The saved `.temp/release-build.log` begins with
`turbo build --filter="./packages/*" && turbo build --continue`. It records
overlapping Vite builds. No concurrency value was configured, so Turbo used
its default of ten tasks. Several of the concurrent Node processes observed
on 18 October 2026 were these addon/client builds. There was also no shared
lock or whole-tree memory budget to prevent another invocation from overlapping.

This explains the observed LifeForge/Monolith build pressure. It does not prove
the cause of the earlier pre-restart black desktop incident. SearchX's indexing
safety hold is separate and remains enabled.

References: [Turbo concurrency](https://turborepo.dev/docs/reference/configuration#concurrency),
[Windows job memory limits](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_extended_limit_information).
