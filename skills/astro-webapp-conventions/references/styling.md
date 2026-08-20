# CSS conventions

There is no stylelint config — only Prettier (with `prettier-plugin-astro`) formats the files. Consistency comes from matching sibling `.astro` `<style>` blocks, not a linter.

## Scoped `<style>` per component, BEM naming

Every `.astro` component's styles live in its own `<style>` block at the bottom of the file (Astro scopes these automatically — no CSS Modules, no `:host`, no separate `.scss`/`.css` sibling file). One root BEM block class per component, matching the component's purpose, with `&__element`/`&--modifier`-equivalent flat BEM classes (Astro's plain CSS has no Sass nesting, so elements/modifiers are separate flat class names, not nested selectors):

```css
.news-card {
  display: flex;
  ...
}
.news-card__image {
  ...
}
.news-card__image--placeholder {
  ...
}
.news-card__body {
  ...
}
```

(`features/news/NewsCard.astro`; the identical shape appears in `TeamCard.astro` as `.team-card`/`.team-card__image`/`.team-card__badge`, `SiteHeader.astro` as `.site-header__*`, `CookieBanner.astro` as `.cookie-banner__*`.) The block class name is a plain kebab-case name for what the component *is* (`news-card`, `team-card`, `site-header`, `kontakt-form`), not prefixed with any component-library namespace — there's no shared UI-library prefix convention here like Angular's `beko-*`.

## State toggles: a `--modifier`-shaped class flipped via `classList`, not inline style

JS-driven visibility/open state reuses the BEM modifier syntax rather than a separate SMACSS `is-*` convention:

```js
nav?.classList.toggle('site-header__nav--open');
banner.classList.add('cookie-banner--visible');
```

New interactive state should follow this same `<block>--<state>` naming (`--open`, `--visible`), toggled with `classList.add`/`remove`/`toggle` from a plain `<script>` — see `architecture.md`'s interactivity section.

## Design tokens (`features/shared/styles/tokens.css`)

A single `:root` custom-property set, no light/dark theme (unlike more complex apps, this site has exactly one palette):

- **Color**: `--color-primary`/`--color-primary-dark`/`--color-gold`/`--color-gray`/`--color-red` (brand palette) plus `--color-bg`/`--color-bg-muted`/`--color-bg-dark`/`--color-text`/`--color-text-muted`/`--color-text-on-dark`/`--color-border` (semantic). Always reach for these instead of a hardcoded hex — the one common exception already in the codebase is literal `#fff`/`color: #fff` on a few primary-colored buttons/CTAs (`.site-header__cta`, `.kontakt-form__submit`) where the token set has no dedicated "text on primary" token; matching that existing shortcut is fine, don't invent a new token for one-off cases.
- **Spacing**: `--space-1` through `--space-6`, then `--space-8` (note: no `--space-7` — the scale isn't a strict arithmetic progression, it's just the sizes actually used). Always use these over a raw `rem`/`px` value for padding/margin/gap.
- **Typography**: `--font-family-headline`/`--font-family-base` (both currently Roboto, kept as separate tokens in case they diverge), `--font-size-sm` through `--font-size-3xl`.
- **Misc**: `--radius-base` (the only border-radius token — every rounded corner in the app uses it), `--shadow-base`.

There is no breakpoint token (no `--bp-*`) — every `@media` query hardcodes its pixel value directly (`@media (min-width: 640px)`, `768px`). This is simply how the codebase does it, not a gap to "fix" by introducing breakpoint tokens.

## `:global()` — reaching into a child component's scoped class

Astro's scoped styles are per-file, so a parent styling a child component's internals needs `:global()`, used sparingly and only for this purpose — e.g. `HomePage.astro`'s `.home-teams-carousel :global(.team-card) { flex: 0 0 14rem; }` to lay out `TeamCard.astro` instances inside the parent's carousel, and `NewsDetailPage.astro`'s `.news-detail__content :global(p + p)` to space paragraphs inside Markdown-rendered `<Content />` (which isn't scoped to the page's own style boundary). Don't reach for `:global()` to fix a plain same-component styling need — only when styling something the current file didn't render as scoped markup.

## Accessibility/motion details worth matching

- `prefers-reduced-motion` is checked before any animation (`home.ts`'s carousel, the marquee's `@media (prefers-reduced-motion: reduce) { animation: none; }` in `HomePage.astro`) — replicate this for any new animated element.
- Visually-hidden-but-accessible text uses the standard clip-rect sr-only pattern (`.site-header__sr-only` in `SiteHeader.astro`), not `display: none` (which would also hide it from screen readers) or a Tailwind-style `.sr-only` utility class (there's no utility-class layer in this codebase — every class is component-scoped BEM).
