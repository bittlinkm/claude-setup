# Naming and enforced linting/formatting

## File naming

- **Components** (`.astro` files): **PascalCase** always — `HomePage.astro`, `NewsCard.astro`, `TeamDetailPage.astro`, `BaseLayout.astro`, `SiteHeader.astro`. No exceptions found anywhere in `src/features/` or `src/pages/`'s dynamic-route wrapper components.
- **Everything else** (`.ts` files — schemas, queries, plain modules): **kebab-case with a role suffix** — `news.schema.ts`, `news.queries.ts`, `withBase.ts`, `formatDate.ts`, `wpFeed.ts`. `<feature>.schema.ts` and `<feature>.queries.ts` are named after the collection/feature, not the file's own logic.
- **Route files** under `src/pages/` mirror the URL: `matches.astro` → `/matches`, `news/[slug].astro` → `/news/:slug`, `kontakt/danke.astro` → `/kontakt/danke`.
- Content entries: `src/content/<feature>/<entry-slug>/index.md` — the slug is the URL segment (`entry.id`), always kebab-case, dated entries (news) are prefixed `YYYY-MM-DD-<slug>`.

## TypeScript conventions

- Every exported function has an explicit return type, including `Promise<...>` for async functions (`async function getPublished(): Promise<CollectionEntry<'news'>[]>`) — matches the `@typescript-eslint/explicit-function-return-type` lint rule (see below).
- Component props are always a named `interface Props` block in the component frontmatter (never an inline type, never `Astro.props` destructured without a declared type) — e.g. `interface Props { entry: CollectionEntry<'news'>; }`.
- `type` imports use the `import { type X, y } from '...'` inline form (`import { type CollectionEntry, render } from 'astro:content'`), not a separate `import type` statement.

## Linting / formatting actually enforced

The shared, framework-agnostic ESLint/Prettier baseline (`no-console`, the security-rule subset, `explicit-function-return-type`, `no-misused-promises`, alphabetized `import/order`, `curly: all`, and the core `.prettierrc` values) is documented once in the **`web-tech-conventions`** skill — read that instead of expecting it repeated here. This section covers only what's specific to *this* project on top of that baseline.

`eslint.config.js` (flat config) adds `eslint-plugin-astro`'s recommended config on top of the shared base. Astro-specific notes:

- `import/order` (enforced org-wide, see `web-tech-conventions`) applies to both `.ts` files and `.astro` files' frontmatter imports here.
- `no-template-curly-in-string: 'warn'` is an addition on top of the shared security-rule subset, specific to this project.

`.prettierrc` matches the shared baseline plus `endOfLine: 'auto'` and `prettier-plugin-astro` with an explicit `*.astro` → `parser: 'astro'` override.

`tsconfig.json` extends `astro/tsconfigs/strict` (Astro's own strict preset) rather than hand-rolling compiler options — don't add redundant strictness flags already covered by that preset; check what it includes before assuming a flag is missing.
