---
name: astro-webapp-conventions
description: Use whenever writing, reviewing, or extending code in the websitebbctulln project (the BBC Tulln basketball club site) — recognizable by `site: 'https://bbc-tulln.netlify.app'` in astro.config.mjs, a paired src/features/<feature>/ + src/content/<feature>/ structure, and Sveltia CMS config at public/admin/config.yml. Make sure to use this whenever the task touches pages, Astro components, Content Collections, schemas, queries, styling, or the WordPress-compatible API routes in that codebase — even if the user doesn't explicitly ask for "conventions". Covers the actual conventions this codebase follows (feature-slice folder pairing, the folder-vs-singleton Content Collection pattern, thin pages/ wrappers around features/ Page components, scoped-style BEM naming, vanilla-JS-only interactivity, Netlify Forms, the wp-json compatibility layer) so generated code matches sibling files instead of generic Astro idioms. Do not use for other Astro projects or generic Astro questions — this documents one specific repo's actual conventions, not general best practice.
---

# Conventions for websitebbctulln (BBC Tulln)

**Applicability check**: this skill documents one specific codebase, not Astro in general. Before applying anything below, confirm you're actually in it — look for `site: 'https://bbc-tulln.netlify.app'` in `astro.config.mjs` and the `src/features/` + `src/content/` folder pair. If those aren't present, this skill doesn't apply — don't carry these patterns into an unrelated Astro project.

Stack: **Astro**, fully **static output** (no adapter, no SSR/API server at runtime — see `references/architecture.md` for what that means for the "API routes" this repo does have), **Content Collections** (`glob` loader, Zod schemas) for all content, **no UI framework** (no React/Vue/Svelte integration, no `client:*` directives anywhere — interactivity is plain `<script>` + DOM APIs), plain CSS with custom-property design tokens (no Tailwind, no CSS framework), **pnpm**, hosted on **Netlify**, authored via **Sveltia CMS** (`public/admin/config.yml`, GitHub-backed). Check `package.json`/`astro.config.mjs` for exact installed versions if version-specific behavior matters — don't assume a fixed version from this skill.

There is no stylelint config and only a handful of custom ESLint rules — consistency comes from matching the sibling file you're extending, not from a linter catching drift. This codebase is notably more internally consistent than a typical grown codebase; where a pattern below is stated as a rule, it holds with no known exception unless said otherwise.

The shared ESLint/Prettier/TS-codestyle baseline (Prettier options, import ordering, security-lint subset, etc.) lives in the separate **`web-tech-conventions`** skill, not here — use both together; `references/naming-and-linting.md` below covers only what's specific to this Astro project on top of that baseline.

Read the reference file(s) relevant to the task before writing code:
- **[references/architecture.md](references/architecture.md)** — the `pages/` → `features/<feature>/*Page.astro` thin-wrapper pattern, dynamic routes (`getStaticPaths`), the static wp-json compatibility API routes, Netlify Forms, and the no-framework interactivity convention.
- **[references/content-and-data.md](references/content-and-data.md)** — Content Collections: `content.config.ts` registry, the `schema.ts`/`queries.ts` pair per feature, the folder-vs-singleton collection pattern (and why singletons look double-nested), Sveltia CMS field config as the real authoring source of truth.
- **[references/styling.md](references/styling.md)** — scoped `<style>` BEM naming, the `tokens.css` design-token system, `:global()` usage, breakpoints.
- **[references/naming-and-linting.md](references/naming-and-linting.md)** — file naming (PascalCase `.astro` vs kebab-case `.ts`), the ESLint/Prettier/tsconfig rules actually enforced.

## Non-negotiable architecture (most commonly violated)

- **Feature-slice pairing**: a feature's rendering code lives in `src/features/<feature>/` (Page components, `.schema.ts`, `.queries.ts`); its actual content lives in the *parallel* `src/content/<feature>/` folder. These are two different trees for the same feature name — don't put content under `features/` or components under `content/`.
- **`src/pages/*.astro` files are thin wrappers only** — they import a `*Page.astro` from `features/` and render it (plus `getStaticPaths` for dynamic routes). Page logic, data fetching, and markup belong in the feature's `*Page.astro`, never inlined into `src/pages/`.
- Every feature's data access goes through its own `<feature>.queries.ts` (never call `getCollection`/`getEntry` directly from a page or another feature) — see `references/content-and-data.md`.
- No client-side framework, no `client:*` directive — any interactivity is a plain `<script>` (inline for a few lines scoped to one component, an imported `.ts` file for anything longer) manipulating the DOM directly.
- Every `.astro` component's CSS lives in its own scoped `<style>` block using the BEM pattern (`.block__element`, `.block--modifier`) — see `references/styling.md`.
- `withBase()` (`features/shared/lib/withBase.ts`) wraps every internal href/src — never hardcode a `/`-rooted path, since the site can be served from a sub-path.

## Quick recipe: building a new page/feature

1. New static page → `src/features/<feature>/<Name>Page.astro` (data-fetching in its frontmatter via that feature's `queries.ts`) + a thin `src/pages/<name>.astro` that imports and renders it.
2. New content-backed feature → `src/content/<feature>/` (folder collection for repeatable entries, or a `<feature>/<feature>/index.md` singleton — see `references/content-and-data.md`) + `src/features/<feature>/<feature>.schema.ts` + `<feature>.queries.ts`, registered in `src/content.config.ts`. Add the matching collection to `public/admin/config.yml` too, or editors can't author it via the CMS.
3. Dynamic detail route → `src/pages/<feature>/[slug].astro` with `getStaticPaths` sourcing from that feature's `queries.ts`, rendering a `*DetailPage.astro` that takes the entry as a prop and `<slot />`s the rendered `<Content />`.
4. Props: always a named `interface Props` in the component frontmatter, destructured from `Astro.props`.
5. Internal links/asset paths: always `withBase(...)`, never a raw `/`-rooted string.
6. CSS: one root BEM block class per component, tokens from `tokens.css` (`--color-*`, `--space-*`, `--font-size-*`, `--radius-base`) instead of hardcoded values, `:global()` only to reach a child component's class from a parent's scoped style.
7. `<title>` convention: `${Page Title} – BBC Tulln` (en dash), except the homepage which is just `BBC Tulln`.
8. Any interactive widget: plain `<script>`, DOM APIs (`getElementById`, `addEventListener`), state toggled via a `--modifier`/`--visible`/`--open` BEM class on the element rather than inline styles.

Full rationale, code shapes, and the wp-json/Netlify-Forms specifics are in `references/`.
