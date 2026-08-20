# Architecture: page composition, routing, API routes, interactivity

## `pages/` vs `features/` — thin wrapper over feature Page components

`src/pages/` is Astro's file-based router, and every file in it is deliberately thin. For a static page it's a one-line import + render:

```astro
---
import HomePage from '../features/home/HomePage.astro';
---

<HomePage />
```

(`src/pages/index.astro`.) All real markup, data fetching, and `<style>` lives in the feature's own `*Page.astro` (e.g. `features/home/HomePage.astro`, `features/kontakt/KontaktPage.astro`) — treat a `pages/*.astro` file that contains anything beyond an import and a render (plus `getStaticPaths` for dynamic routes) as a smell; move the logic into `features/<feature>/`.

## Dynamic detail routes

A detail route pairs a thin `pages/<feature>/[slug].astro` with a `*DetailPage.astro` in the feature folder:

```astro
---
import { type CollectionEntry, render } from 'astro:content';
import { getAllNews } from '../../features/news/news.queries';
import NewsDetailPage from '../../features/news/NewsDetailPage.astro';

export async function getStaticPaths(): Promise<
  { params: { slug: string }; props: { entry: CollectionEntry<'news'> } }[]
> {
  const entries = await getAllNews();
  return entries.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

const { entry } = Astro.props;
const { Content } = await render(entry);
---

<NewsDetailPage entry={entry}>
  <Content />
</NewsDetailPage>
```

(`src/pages/news/[slug].astro`.) `getStaticPaths` and `render(entry)` live in the route file (they're routing concerns — path enumeration and turning a Markdown body into a renderable `Content` component); the `*DetailPage.astro` receives `entry` as a prop and renders the passed-in `<Content />` via `<slot />`. `teams/[slug].astro` follows the identical shape, with one addition: it guards the slot with `hasBody = Boolean(entry.body?.trim())`, since not every team page has a Markdown body — check the equivalent before assuming a slotted `<Content />` is always non-empty for a new feature.

## The wp-json compatibility API routes — not generic Astro API routes

`src/pages/wp-json/wp/v2/posts.ts` and `.../media/[id].ts` are a deliberate compatibility shim: an external consumer (referenced in code comments as "KASU") expects a WordPress REST API-shaped feed, so these routes reshape the `news` collection into the WP `posts`/`media` JSON contract (see `src/features/news/wpFeed.ts` for the `toWpPost`/`toWpMedia` mappers and the synthetic numeric `stableId()` derived from the entry slug, since WP IDs are numeric but Astro's are string slugs).

Because this site has **no adapter — everything is prerendered at build time**, these aren't live dynamic endpoints: `posts.ts` exports a plain `GET` handler (all news, computed once at build); `media/[id].ts` additionally exports `getStaticPaths` to enumerate one static JSON file per news entry with an image, exactly like a page route. If you add another wp-json-style route, it needs the same `getStaticPaths` treatment unless it's truly a single fixed output like `posts.ts`.

`wpFeed.ts`'s `renderContentHtml()` uses `experimental_AstroContainer` to render a collection entry's Markdown `Content` to an HTML string *outside* of a normal `.astro` page render — necessary because this runs from a plain `.ts` endpoint with no page to render into, and because raw `entry.rendered.html` still has unresolved `__ASTRO_IMAGE_` placeholders until rendered through a real render pass. It also rewrites root-relative `src`/`href` URLs to absolute ones, since the external consumer isn't fetching from a page on this domain and can't resolve relative paths. Reuse this helper rather than re-deriving rendered HTML by hand if you add another external-facing feed.

## Forms — Netlify Forms, not a custom endpoint

`KontaktPage.astro`'s contact form is handled entirely by Netlify's build-time form detection, not a Astro API route: `data-netlify="true"`, a hidden `form-name` input matching the `name` attribute, and a `data-netlify-honeypot` spam-trap field (`bot-field`, visually hidden via CSS, `autocomplete="off"`). It posts to a static "danke" (thank-you) page (`withBase('/kontakt/danke')` → `KontaktDankePage.astro`) rather than being intercepted by JS. Because Netlify's form parser scans the **built static HTML** for `data-netlify` forms, a new form must render unconditionally in the prerendered markup — don't gate it behind client-side JS or a framework island, or Netlify won't detect it at build time.

## Interactivity — vanilla `<script>` only, no framework

There is no `@astrojs/react`/`vue`/`svelte`/`preact` integration and no `client:*` directive anywhere in the repo. All interactivity is a plain `<script>` tag using direct DOM APIs:

- **Inline `<script>`** (no `src`, scoped to that one component) for a few lines of logic tightly coupled to that component — e.g. `SiteHeader.astro`'s mobile-nav toggle, `CookieBanner.astro`'s consent-banner logic (reads/writes `localStorage`, toggles a `--visible` BEM modifier class).
- **A separate `.ts` file imported via `<script src="./name.ts"></script>`** for anything longer/more stateful — e.g. `features/home/home.ts`, which drives the team-logo carousel (IntersectionObserver + hover/focus pause + `prefers-reduced-motion` check) and is loaded from `HomePage.astro`.

Both patterns toggle state via classList (`nav?.classList.toggle('site-header__nav--open')`, `banner.classList.add('cookie-banner--visible')`) rather than inline `style` manipulation — match this for new interactive widgets. Always guard for `prefers-reduced-motion` before adding any animation-driven behavior (see `home.ts`), matching the existing carousel and the `styling.md` note on the marquee animation.
