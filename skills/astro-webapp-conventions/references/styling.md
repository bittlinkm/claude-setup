# CSS conventions

There is typically no stylelint config in projects built this way — only Prettier (with `prettier-plugin-astro`) formats the files. Consistency comes from matching sibling `.astro` `<style>` blocks, not a linter.

## Scoped `<style>` per component, BEM naming

Every `.astro` component's styles live in its own `<style>` block at the bottom of the file (Astro scopes these automatically — no CSS Modules, no `:host`, no separate `.scss`/`.css` sibling file). One root BEM block class per component, matching the component's purpose, with `&__element`/`&--modifier`-equivalent flat BEM classes (Astro's plain CSS has no Sass nesting, so elements/modifiers are separate flat class names, not nested selectors):

```css
.card {
  display: flex;
  ...
}
.card__image {
  ...
}
.card__image--placeholder {
  ...
}
.card__body {
  ...
}
```

The block class name is a plain kebab-case name for what the component *is* (`card`, `site-header`, `contact-form`), not prefixed with any component-library namespace — there's typically no shared UI-library prefix convention here like Angular's `beko-*` (see `angular-webapp-conventions`).

## State toggles: a `--modifier`-shaped class flipped via `classList`, not inline style

JS-driven visibility/open state reuses the BEM modifier syntax rather than a separate SMACSS `is-*` convention:

```js
nav?.classList.toggle('site-header__nav--open');
banner.classList.add('cookie-banner--visible');
```

New interactive state should follow this same `<block>--<state>` naming (`--open`, `--visible`), toggled with `classList.add`/`remove`/`toggle` from a plain `<script>` — see `architecture.md`'s interactivity section. Note this differs from Angular's convention (a separate `is-*` class for JS-driven state, `--modifier` reserved for structural variants) — see `web-tech-conventions` for that comparison, don't assume the Astro convention transfers.

## Design tokens

Projects in this shape typically define CSS custom properties in one central file (e.g. `tokens.css`) — color, spacing, typography, radius — and reach for those instead of hardcoding hex values or raw `px`/`rem`, rather than a utility-class framework (no Tailwind). The actual token names, the palette, and whether there's more than one theme (e.g. dark mode) are entirely project-specific — check the real token file before writing new CSS rather than assuming a fixed vocabulary from this skill. See `web-tech-conventions` for the shared cross-framework principle (tokens over hardcoded values), which this project's actual token names then implement.

Some projects hardcode breakpoint pixel values directly in each `@media` query rather than defining a breakpoint token — that's a legitimate choice some codebases make, not automatically a gap to "fix" by introducing tokens; match whatever the project already does rather than introducing a new convention unasked.

## `:global()` — reaching into a child component's scoped class

Astro's scoped styles are per-file, so a parent styling a child component's internals needs `:global()`, used sparingly and only for this purpose — e.g. a page laying out instances of a child card component inside a carousel (`.parent-carousel :global(.card) { flex: 0 0 14rem; }`), or spacing paragraphs inside Markdown-rendered `<Content />` which isn't scoped to the page's own style boundary (`.detail__content :global(p + p)`). Don't reach for `:global()` to fix a plain same-component styling need — only when styling something the current file didn't render as scoped markup.

## Accessibility/motion details worth matching

- `prefers-reduced-motion` is checked before any animation (a carousel's JS, a `@media (prefers-reduced-motion: reduce) { animation: none; }` rule for a CSS marquee) — replicate this for any new animated element.
- Visually-hidden-but-accessible text uses the standard clip-rect sr-only pattern, not `display: none` (which would also hide it from screen readers) or a Tailwind-style `.sr-only` utility class (there's typically no utility-class layer in projects like this — every class is component-scoped BEM).
