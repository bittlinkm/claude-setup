# Naming and enforced linting/formatting

## File naming

- **Components** (`.astro` files): **PascalCase** always — `HomePage.astro`, `ContactForm.astro`, `BaseLayout.astro`, `SiteHeader.astro`. No exceptions expected anywhere in `src/features/` or `src/pages/`'s dynamic-route wrapper components.
- **Everything else** (`.ts` files — schemas, queries, plain modules): **kebab-case with a role suffix** — `blog.schema.ts`, `blog.queries.ts`, `withBase.ts`, `formatDate.ts`. `<feature>.schema.ts` and `<feature>.queries.ts` are named after the collection/feature, not the file's own logic.
- **Route files** under `src/pages/` mirror the URL: `about.astro` → `/about`, `blog/[slug].astro` → `/blog/:slug`.
- Content entries: `src/content/<feature>/<entry-slug>/index.md` — the slug is the URL segment (`entry.id`), always kebab-case; dated entries (e.g. blog posts) are commonly prefixed `YYYY-MM-DD-<slug>`.

## TypeScript conventions

- Every exported function has an explicit return type, including `Promise<...>` for async functions (`async function getPublished(): Promise<CollectionEntry<'blog'>[]>`) — matches the `@typescript-eslint/explicit-function-return-type` lint rule (see below).
- Component props are always a named `interface Props` block in the component frontmatter (never an inline type, never `Astro.props` destructured without a declared type) — e.g. `interface Props { entry: CollectionEntry<'blog'>; }`.
- `type` imports use the `import { type X, y } from '...'` inline form (`import { type CollectionEntry, render } from 'astro:content'`), not a separate `import type` statement.

## Linting / formatting actually enforced

The shared, framework-agnostic ESLint/Prettier baseline (`no-console`, the security-rule subset, `explicit-function-return-type`, `no-misused-promises`, alphabetized `import/order`, `curly: all`, and the core `.prettierrc` values) is documented once in the **`web-tech-conventions`** skill — read that instead of expecting it repeated here. This section covers only what's specific to Astro projects built this way, on top of that baseline.

`eslint.config.js` (flat config) typically adds `eslint-plugin-astro`'s recommended config on top of the shared base. Astro-specific notes:

- `import/order` (shared baseline, see `web-tech-conventions`) applies to both `.ts` files and `.astro` files' frontmatter imports here.
- A project may add its own rules on top of the shared base plus `eslint-plugin-astro` (e.g. `no-template-curly-in-string: 'warn'`) — check the actual `eslint.config.js` rather than assuming this skill lists every project-specific addition.

`.prettierrc` matches the shared baseline plus `prettier-plugin-astro` with an explicit `*.astro` → `parser: 'astro'` override; a project may layer its own minor overrides on top (e.g. `endOfLine: 'auto'`) — check the real file.

`tsconfig.json` commonly extends `astro/tsconfigs/strict` (Astro's own strict preset) rather than hand-rolling compiler options — don't add redundant strictness flags already covered by that preset; check what it includes before assuming a flag is missing.
