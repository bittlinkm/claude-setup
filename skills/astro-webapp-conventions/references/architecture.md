# Architecture: page composition, routing, API routes, interactivity

## `pages/` vs `features/` — thin wrapper over feature Page components

`src/pages/` is Astro's file-based router, and every file in it is deliberately thin. For a static page it's a one-line import + render:

```astro
---
import HomePage from '../features/home/HomePage.astro';
---

<HomePage />
```

(`src/pages/index.astro`.) All real markup, data fetching, and `<style>` lives in the feature's own `*Page.astro` (e.g. `features/home/HomePage.astro`, `features/about/AboutPage.astro`) — treat a `pages/*.astro` file that contains anything beyond an import and a render (plus `getStaticPaths` for dynamic routes) as a smell; move the logic into `features/<feature>/`.

## Dynamic detail routes

A detail route pairs a thin `pages/<feature>/[slug].astro` with a `*DetailPage.astro` in the feature folder:

```astro
---
import { type CollectionEntry, render } from 'astro:content';
import { getAllPosts } from '../../features/blog/blog.queries';
import BlogDetailPage from '../../features/blog/BlogDetailPage.astro';

export async function getStaticPaths(): Promise<
  { params: { slug: string }; props: { entry: CollectionEntry<'blog'> } }[]
> {
  const entries = await getAllPosts();
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<BlogDetailPage entry={entry}>
  <Content />
</BlogDetailPage>
```

(`src/pages/blog/[slug].astro`.) `getStaticPaths` and `render(entry)` live in the route file (they're routing concerns — path enumeration and turning a Markdown body into a renderable `Content` component); the `*DetailPage.astro` receives `entry` as a prop and renders the passed-in `<Content />` via `<slot />`. If not every entry in a collection has a Markdown body, guard the slot with something like `hasBody = Boolean(entry.body?.trim())` rather than assuming a slotted `<Content />` is always non-empty — check the equivalent pattern for a new feature before assuming otherwise.

## Static API routes (no adapter)

A project with **no adapter** — everything prerendered at build time — can still have `src/pages/**/*.ts` API routes; they just aren't live/dynamic endpoints. A route exporting a plain `GET` handler is computed once at build time; one that needs per-entry output (e.g. one static JSON file per content entry) needs its own `getStaticPaths`, exactly like a page route. These routes are typically compatibility shims reshaping a Content Collection into a JSON contract some external consumer expects (another system's feed format, an existing API a client integration was written against) — check whether the project actually has any before assuming `pages/` only ever contains `.astro` files, and give a new route the same `getStaticPaths` treatment unless it's genuinely a single fixed output.

## Forms

If a project relies on a static-hosting form-detection feature (e.g. Netlify Forms) instead of a custom endpoint, the form must render **unconditionally in the prerendered HTML** — the host's build-time scanner looks for the form's markup in the built static output (for Netlify: `data-netlify="true"` plus a hidden `form-name` input matching the `name` attribute), so don't gate a form like this behind client-side JS or a framework island, or the host won't detect it at build time. A CSS-hidden honeypot field (not `display: none`, which some spam bots skip) is a common spam-trap addition alongside it. Check the actual project for which mechanism it uses before assuming this applies — plenty of Astro sites use a custom API route or a third-party form service instead.

## Interactivity — vanilla `<script>` only, no framework

Projects built this way typically have no `@astrojs/react`/`vue`/`svelte`/`preact` integration and no `client:*` directive anywhere in the repo — all interactivity is a plain `<script>` tag using direct DOM APIs:

- **Inline `<script>`** (no `src`, scoped to that one component) for a few lines of logic tightly coupled to that component — e.g. a header's mobile-nav toggle, or a cookie-consent banner's show/hide logic (reads/writes `localStorage`, toggles a `--visible` BEM modifier class).
- **A separate `.ts` file imported via `<script src="./name.ts"></script>`** for anything longer/more stateful — e.g. a logo or image carousel (`IntersectionObserver` + hover/focus pause + `prefers-reduced-motion` check), loaded from the owning feature's Page component.

Both patterns toggle state via classList (`nav?.classList.toggle('site-header__nav--open')`, `banner.classList.add('cookie-banner--visible')`) rather than inline `style` manipulation — match this for new interactive widgets. Always guard for `prefers-reduced-motion` before adding any animation-driven behavior, matching the `styling.md` note on motion.
