# Monolith website

[Website](https://monolith-site-maxjafars-projects.vercel.app) · [Documentation](https://monolith-site-maxjafars-projects.vercel.app/docs) · [Collection](https://monolith-site-maxjafars-projects.vercel.app/addons)

Production access and preview protection follow the Vercel project's settings. Verify anonymous access when publishing; a successful build alone does not establish public availability.

The public product site and documentation live together in this static Astro app. It uses the shared Monolith mark, Inter and JetBrains Mono fonts, neutral theme colors and real product screenshots. No workspace API, database, analytics SDK or secrets are needed.

## Local development

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm site:dev
```

Open `http://127.0.0.1:4321`. The production build and checks are:

```sh
pnpm site:build
pnpm site:check
pnpm site:test
```

The browser suite uses the root Playwright installation with Chromium and WebKit. Install browsers if needed with `pnpm exec playwright install chromium webkit`. On a Linux CI host use `pnpm exec playwright install --with-deps chromium webkit`. Tests cover search and failure recovery, keyboard focus, combined collection filters, theme persistence, mobile navigation, 320–1440px layouts and no-JavaScript content access.

`site:check` runs Astro diagnostics and checks every built local link, image, script, fragment, unique page title, description, social preview and sitemap entry. Run `site:build` first. `SITE_TEST_URL` can point the browser suite at a deployed copy.

## Content and branding

- `src/content/*.md`: public guides with title, description, section and order frontmatter.
- `src/data/products.ts`: product pages and the addon/widget collection.
- `src/layouts`: shared site and documentation shells.
- `src/styles/site.css`: semantic CSS classes and Monolith theme variables; no utility framework.
- `src/scripts/site.ts`: local search, theme, keyboard tabs, collection filters and code copying.
- `public`: reviewed public files only. Search is generated at build time from the public guides.

Technical source guides remain in the repository’s `docs/` directory. Keep public guides aligned with them when behavior changes. Do not automatically publish research files, local verification output, credentials or private workspace content.

The GitHub README is the product overview: centered Monolith mark, workspace screenshots, feature groups, setup paths and a task-based documentation map. Public guides include a first-workspace walkthrough and an architecture overview. Keep its links aligned with these routes, and keep release availability distinct from documentation publication.

Regenerate local copies of the logo, fonts and optimized screenshots with `pnpm exec node apps/site/scripts/prepare-assets.mjs`. This maintenance script uses the existing API package’s Sharp installation; it is not part of the website build. Source screenshots use synthetic data. Fonts retain their OFL notices in `public/fonts`.

Format only this app with `pnpm --filter @monolith/site format`.

## Vercel deployment

The dedicated project is `monolith-site` in the `maxjafars-projects` Vercel team. Public production and protected previews can be configured independently. Use the authenticated Vercel connector or CLI; do not put tokens in commands or source files.

For the current local release, publish only verified static output:

```sh
pnpm site:build
pnpm site:check
pnpm site:test
pnpm --filter @monolith/site stage:deploy
```

The stage command creates a fresh folder under `.temp/site-publish/` and writes its exact path to `.temp/site-publish.json`. That folder contains only the built public site and a static Vercel configuration. Deploy the printed folder with an explicit project and scope:

```sh
pnpm exec vercel deploy <printed-folder> --project monolith-site --scope maxjafars-projects --prod --skip-domain
```

Verify the staged deployment, then promote its returned deployment URL using `pnpm exec vercel promote <deployment-url> --scope maxjafars-projects`. This deploys the tested static build without uploading the rest of the dirty monorepo. The live release is a workspace snapshot, not a claim that the current Git commit contains these files.

After the website source and lockfile reach the chosen Git branch, the same project can be connected to GitHub for automatic deployments. Configure Root Directory `apps/site`, allow source files outside that directory, framework Astro, build `pnpm --filter @monolith/site build`, install `pnpm install --frozen-lockfile --ignore-scripts`, and output `dist`. Do not connect an older remote branch that does not yet contain the app.

`SITE_URL` overrides the canonical origin at build time. When changing domains, update the default in `astro.config.mjs` and the GitHub-facing links, rebuild and verify canonical metadata, robots.txt and sitemap.xml against the final public domain. Do not set it to an untrusted request header.

The static host serves real 404s instead of rewriting every URL to a single-page app. Search terms remain in the browser. Deployment verification must confirm public anonymous access, assets, search, docs deep links, response headers and the 404 page.
