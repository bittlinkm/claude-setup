---
name: astro-webapp-conventions
description: Use whenever writing, reviewing, or extending code in an Astro project that follows this org's conventions — recognizable by a paired src/features/<feature>/ + src/content/<feature>/ structure, Content Collections built on the `glob` loader, and no UI framework (no `client:*` directives, no React/Vue/Svelte integration). Make sure to use this whenever the task touches pages, Astro components, Content Collections, schemas, queries, or styling in such a project — even if the user doesn't explicitly ask for "conventions". Covers feature-slice folder pairing, the folder-vs-singleton Content Collection pattern, thin pages/ wrappers around features/ Page components, scoped-style BEM naming, and vanilla-JS-only interactivity, so generated code matches sibling files instead of generic Astro idioms. Applies to any Astro project built this way, not one specific repo — confirm the project's actual structure before assuming every detail applies.
---

# Astro webapp conventions

**Applicability check**: this skill documents a specific architectural style — static-output Astro with Content Collections and a `src/features/` + `src/content/` folder pairing — not Astro in general. Confirm the project actually follows it (look for that folder pairing, a `glob`-loader-based `content.config.ts`, and no `client:*` directives) before applying anything below; a project scaffolded differently (SSR-first, component-library-driven, built on a UI framework) doesn't fit this skill.

Stack shape this skill assumes: **Astro**, typically fully **static output** (no adapter, no SSR/API server at runtime — see `references/architecture.md` for what that means for any "API routes" a project like this has), **Content Collections** (`glob` loader, Zod schemas) for all content, **no UI framework** (no React/Vue/Svelte integration, no `client:*` directives — interactivity is plain `<script>` + DOM APIs), plain CSS with custom-property design tokens (no Tailwind, no CSS framework). Check `package.json`/`astro.config.mjs` for the exact installed versions and hosting/CMS setup if version- or platform-specific behavior matters — don't assume a fixed toolchain from this skill.

Consistency in projects like this comes mostly from matching the sibling file you're extending, not from a linter catching drift — many don't run stylelint and rely on only a handful of custom ESLint rules. Where a pattern below is stated as a rule, treat it as the default shape to match unless the project's own code clearly diverges.

The shared ESLint/Prettier/TS-codestyle baseline (Prettier options, import ordering, security-lint subset, etc.) lives in the separate **`web-tech-conventions`** skill, not here — use both together; `references/naming-and-linting.md` below covers only what's specific to this Astro pattern on top of that baseline.

Read the reference file(s) relevant to the task before writing code:
- **[references/architecture.md](references/architecture.md)** — the `pages/` → `features/<feature>/*Page.astro` thin-wrapper pattern, dynamic routes (`getStaticPaths`), static compatibility API routes for external consumers, form handling, and the no-framework interactivity convention.
- **[references/content-and-data.md](references/content-and-data.md)** — Content Collections: `content.config.ts` registry, the `schema.ts`/`queries.ts` pair per feature, the folder-vs-singleton collection pattern (and why singletons look double-nested), keeping a Git-backed CMS config in sync with the schema when one is used.
- **[references/styling.md](references/styling.md)** — scoped `<style>` BEM naming, a `tokens.css` design-token system, `:global()` usage, breakpoints.
- **[references/naming-and-linting.md](references/naming-and-linting.md)** — file naming (PascalCase `.astro` vs kebab-case `.ts`), the ESLint/Prettier/tsconfig rules actually enforced.

## Non-negotiable architecture (most commonly violated)

- **Feature-slice pairing** (this project's shape of the org-wide Vertical Slice Architecture principle, see `web-tech-conventions`): a feature's rendering code lives in `src/features/<feature>/` (Page components, `.schema.ts`, `.queries.ts`); its actual content lives in the *parallel* `src/content/<feature>/` folder. These are two different trees for the same feature name — don't put content under `features/` or components under `content/`.
- **`src/pages/*.astro` files are thin wrappers only** — they import a `*Page.astro` from `features/` and render it (plus `getStaticPaths` for dynamic routes). Page logic, data fetching, and markup belong in the feature's `*Page.astro`, never inlined into `src/pages/`.
- Every feature's data access goes through its own `<feature>.queries.ts` (never call `getCollection`/`getEntry` directly from a page or another feature) — see `references/content-and-data.md`.
- No client-side framework, no `client:*` directive — any interactivity is a plain `<script>` (inline for a few lines scoped to one component, an imported `.ts` file for anything longer) manipulating the DOM directly.
- Every `.astro` component's CSS lives in its own scoped `<style>` block using the BEM pattern (`.block__element`, `.block--modifier`) — see `references/styling.md`.
- Internal hrefs/srcs go through a shared base-path helper (e.g. `withBase()`) rather than a hardcoded `/`-rooted path, if the project is served from a sub-path — check whether the project has one before hardcoding root-relative paths.

## Quick recipe: building a new page/feature

1. New static page → `src/features/<feature>/<Name>Page.astro` (data-fetching in its frontmatter via that feature's `queries.ts`) + a thin `src/pages/<name>.astro` that imports and renders it.
2. New content-backed feature → `src/content/<feature>/` (folder collection for repeatable entries, or a `<feature>/<feature>/index.md` singleton — see `references/content-and-data.md`) + `src/features/<feature>/<feature>.schema.ts` + `<feature>.queries.ts`, registered in `src/content.config.ts`. If the project authors content through a Git-backed CMS, add the matching collection to its config too, or editors can't author it there.
3. Dynamic detail route → `src/pages/<feature>/[slug].astro` with `getStaticPaths` sourcing from that feature's `queries.ts`, rendering a `*DetailPage.astro` that takes the entry as a prop and `<slot />`s the rendered `<Content />`.
4. Props: always a named `interface Props` in the component frontmatter, destructured from `Astro.props`.
5. Internal links/asset paths: use the project's base-path helper if it has one, never a raw `/`-rooted string.
6. CSS: one root BEM block class per component, tokens from `tokens.css` (`--color-*`, `--space-*`, `--font-size-*`, `--radius-base`) instead of hardcoded values, `:global()` only to reach a child component's class from a parent's scoped style.
7. Any interactive widget: plain `<script>`, DOM APIs (`getElementById`, `addEventListener`), state toggled via a `--modifier`/`--visible`/`--open` BEM class on the element rather than inline styles.

Full rationale and code shapes are in `references/`.
