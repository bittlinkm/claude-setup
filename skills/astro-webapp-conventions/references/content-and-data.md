# Content Collections: schema, queries, and (optionally) a CMS

## Registry

`src/content.config.ts` imports every feature's `<feature>Collection` export and re-exports them as the `collections` map — this is the single file that wires a new feature into `astro:content`. Adding a collection means adding both the schema export and an entry here; nothing is auto-discovered.

## Per-feature `schema.ts` — always the same loader shape

Every collection, without exception, uses the `glob` loader over Markdown files, never a different loader type:

```ts
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

export const blogCollection = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      summary: z.string().max(300),
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});
```

(`features/blog/blog.schema.ts`.) Use the `schema: ({ image }) => z.object({...})` function form whenever the collection has any image field (so `image()` is available as a validator that resolves the path relative to the entry); use the plain `schema: z.object({...})` form when it doesn't.

Field naming inside a schema is camelCase — match whichever convention the sibling schemas in that project already use for domain-specific terms. A project may reasonably mix in non-English field names for a domain concept that has no natural English equivalent (a legal/admin page, an association-specific term); don't force a translation onto an existing schema just to make it uniformly English.

## Per-feature `queries.ts` — the only place that calls `getCollection`/`getEntry`

A feature's `*.astro` components and `pages/*.astro` routes never call `getCollection`/`getEntry` directly — they call a named function from that feature's `queries.ts`, which wraps the raw Content Collections API:

```ts
import { type CollectionEntry, getCollection } from 'astro:content';

async function getPublished(): Promise<CollectionEntry<'blog'>[]> {
  const entries = await getCollection('blog', ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getLatestPosts(count: number): Promise<CollectionEntry<'blog'>[]> {
  const published = await getPublished();
  return published.slice(0, count);
}

export async function getAllPosts(): Promise<CollectionEntry<'blog'>[]> {
  return getPublished();
}
```

This is where filtering (draft posts), sorting, and shaping happen — keep that logic here, not duplicated in a component. Return types are always explicit (`Promise<CollectionEntry<'x'>[]>` or `Promise<CollectionEntry<'x'> | undefined>`), matching the repo-wide explicit-return-type convention (see `naming-and-linting.md`).

## Folder collections vs. singleton collections — and why singletons can look double-nested

Two different content shapes share the exact same `glob` loader pattern:

- **Folder (repeatable) collections** — many entries directly under `src/content/<feature>/<entry-slug>/index.md`. Queried with `getCollection('<feature>')` returning an array.
- **Singleton (one-off page) collections** — exactly one entry (e.g. a site's `footer`, an `about`/`imprint` page), but still stored as `src/content/<feature>/<feature>/index.md` (the folder name repeated as the one entry's slug, e.g. `content/footer/footer/index.md`). This is **not a typo** — the `glob` loader has no separate "single file" mode, so a singleton fakes being a one-entry folder collection to reuse the same loader shape as everything else. Queried by taking the first (and only) result:
  ```ts
  export async function getFooter(): Promise<CollectionEntry<'footer'> | undefined> {
    const entries = await getCollection('footer');
    return entries[0];
  }
  ```
  Never `getEntry('footer', 'footer')` for these — if a project's existing singleton queries use the `getCollection(...)[0]` shape, match it for a new singleton rather than reaching for `getEntry`.

A collection's name alone doesn't tell you which shape it is — check the schema/loader config. A collection that reads like it should be a list can still be schema-wise a singleton (one Markdown entry with page copy, maybe a couple of images) registered and queried the same folder-collection way as a real list; don't assume from the name.

## If the project is authored through a Git-backed headless CMS

Some projects in this shape are authored by non-technical editors through a Git-backed CMS (e.g. Sveltia CMS, Decap CMS) configured via a YAML file (commonly `public/admin/config.yml`) rather than editing Markdown directly. When one is present, the Zod schema is the build-time validation contract, but the **field labels, hints, required-ness, and widget types editors actually see** live in that config file — the two have to be kept in sync by hand:

- A `folder`-based collection config mirrors a folder Content Collection.
- A `files`-based collection config (one exact file path per entry) is a common way to represent a singleton — this is often *why* a singleton's nested path exists in the first place, since some CMS tools' `files` collection type needs one fixed path per entry rather than a folder glob.

When adding or changing a schema field, update the CMS config too (matching field `name`, and labels/hints in whatever language the project's existing labels use) — a field that exists in the Zod schema but not in the CMS config is invisible to editors there. Check whether the project actually has a CMS config before assuming this section applies — plenty of Astro Content Collections projects are edited by hand in Markdown with no CMS layer at all.

## Content Markdown frontmatter

Frontmatter keys match the schema field names exactly (obviously), values are quoted strings for anything with special characters, dates as bare `YYYY-MM-DD` (coerced by `z.coerce.date()`), and image fields are relative paths to a sibling file in the same entry folder (`image: ./cover.jpg`), never an absolute or `public/`-rooted path — this relies on the `image()` schema helper resolving relative to the entry.
