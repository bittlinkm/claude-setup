# Content Collections: schema, queries, and the CMS

## Registry

`src/content.config.ts` imports every feature's `<feature>Collection` export and re-exports them as the `collections` map — this is the single file that wires a new feature into `astro:content`. Adding a collection means adding both the schema export and an entry here; nothing is auto-discovered.

## Per-feature `schema.ts` — always the same loader shape

Every collection, without exception, uses the `glob` loader over Markdown files, never a different loader type:

```ts
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

export const newsCollection = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      teaser: z.string().max(300),
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});
```

(`features/news/news.schema.ts`.) Use the `schema: ({ image }) => z.object({...})` function form whenever the collection has any image field (so `image()` is available as a validator that resolves the path relative to the entry); use the plain `schema: z.object({...})` form when it doesn't (e.g. `footer.schema.ts`, `impressum.schema.ts`, `kontakt.schema.ts`).

Field naming inside a schema is camelCase but pragmatically bilingual — English where there's an obvious term (`contactEmail`, `contactPhone`), German where the concept is Austrian-association-specific and an English name would be forced (`vereinsname`, `verantwortlichePerson`, `zvrZahl`, `taetigkeitsbereich`, `haftungsausschluss`, `bildrechte` in `impressum.schema.ts`). Match whichever the sibling schema in that feature already does — don't force full-English field names onto a legal/admin-heavy schema.

## Per-feature `queries.ts` — the only place that calls `getCollection`/`getEntry`

A feature's `*.astro` components and `pages/*.astro` routes never call `getCollection`/`getEntry` directly — they call a named function from that feature's `queries.ts`, which wraps the raw Content Collections API:

```ts
import { type CollectionEntry, getCollection } from 'astro:content';

async function getPublished(): Promise<CollectionEntry<'news'>[]> {
  const entries = await getCollection('news', ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getLatestNews(count: number): Promise<CollectionEntry<'news'>[]> {
  const published = await getPublished();
  return published.slice(0, count);
}

export async function getAllNews(): Promise<CollectionEntry<'news'>[]> {
  return getPublished();
}
```

This is where filtering (draft posts), sorting, and shaping happen — keep that logic here, not duplicated in a component. Return types are always explicit (`Promise<CollectionEntry<'x'>[]>` or `Promise<CollectionEntry<'x'> | undefined>`), matching the repo-wide explicit-return-type convention (see `naming-and-linting.md`).

## Folder collections vs. singleton collections — and why singletons look double-nested

Two different content shapes share the exact same `glob` loader pattern:

- **Folder (repeatable) collections** — `news`, `teams`, `matches`* — many entries directly under `src/content/<feature>/<entry-slug>/index.md`. Queried with `getCollection('news')` returning an array.
- **Singleton (one-off page) collections** — `footer`, `impressum`, `kontakt`, `verein`, `sponsoren`, `sommercamp`, `datenschutz` — exactly one entry, but still stored as `src/content/<feature>/<feature>/index.md` (the folder name repeated as the one entry's slug, e.g. `content/footer/footer/index.md`). This is **not a typo** — the `glob` loader has no separate "single file" mode, so a singleton fakes being a one-entry folder collection to reuse the same loader shape as everything else. Queried by taking the first (and only) result:
  ```ts
  export async function getFooter(): Promise<CollectionEntry<'footer'> | undefined> {
    const entries = await getCollection('footer');
    return entries[0];
  }
  ```
  Never `getEntry('footer', 'footer')` for these — every existing singleton query uses the `getCollection(...)[0]` shape; match it for a new singleton rather than reaching for `getEntry`.

(*`matches` is schema-wise a singleton — one Markdown file with page copy plus two screenshot images — but is registered and queried the same folder-collection way as `news`/`teams`; don't assume the collection name tells you which shape it is, check the schema.)

## Sveltia CMS (`public/admin/config.yml`) is the real authoring source of truth

The Zod schema is the validation contract the build enforces, but the **field labels, hints, required-ness, and widget types editors actually see** live in `public/admin/config.yml`, using two matching collection shapes:

- `folder`-based collections (`folder: src/content/news`, `create: true`, `delete: true`) for repeatable content — mirrors a folder Content Collection.
- `files`-based collections (`files: [{ name, file: 'src/content/<feature>/<feature>/index.md' }]`) for singletons — this is *why* the singleton's nested path exists: Sveltia's `files` collection type needs one exact file path per entry.

When adding or changing a schema field, update `config.yml` too (matching `name`, sensible `label`/`hint` in German — all existing labels/hints are German, matching the site's German-language content) — a field that exists in the Zod schema but not in `config.yml` is invisible to editors in the CMS.

## Content Markdown frontmatter

Frontmatter keys match the schema field names exactly (obviously), values are quoted strings for anything with special characters, dates as bare `YYYY-MM-DD` (coerced by `z.coerce.date()`), and image fields are relative paths to a sibling file in the same entry folder (`image: ./cover.jpg`), never an absolute or `public/`-rooted path — this relies on the `image()` schema helper resolving relative to the entry.
