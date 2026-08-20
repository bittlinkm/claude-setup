---
name: web-tech-conventions
description: Use whenever setting up, reviewing, or extending general web-technology conventions that aren't tied to one framework — ESLint/Prettier/TypeScript code style, or CSS naming and design-token usage — in a JS/TS web project. This documents the exact baseline confirmed identical across this org's Angular app (angular-webapp-conventions) and Astro site (astro-webapp-conventions) repos, so treat it as the org's real cross-project default, not generic web-dev advice. Always layer this together with whichever framework-specific skill applies (angular-webapp-conventions, astro-webapp-conventions, or similar) rather than using it alone — this skill covers only the framework-agnostic slice; the framework skill adds its own component/template/routing rules and the project's actual token values on top.
---

# General web-tech baseline

This documents web-technology conventions confirmed identical, or identical in *principle*, across two otherwise unrelated projects in this org — an Angular app and an Astro site. Where something is confirmed identical, treat it as the org's real default for a new JS/TS web project, not textbook advice. Where two projects agree on a *principle* but differ in the concrete values (e.g. both use CSS design tokens, but the token names differ), that's called out explicitly — don't assume the token names below apply to a project that isn't one of the two this was extracted from.

**This skill is deliberately framework-agnostic.** It never covers Angular-template rules, `@angular-eslint/*`, `eslint-plugin-astro`, component/routing architecture, or either project's actual design-token names — those live in that framework's own skill (`angular-webapp-conventions`, `astro-webapp-conventions`). When working in a project one of those skills recognizes, use both together: this skill for the shared baseline, the framework skill for everything specific to that stack.

## ESLint baseline

Both confirmed projects extend `eslint.configs.recommended`, `tseslint.configs.recommended` + `stylistic`, and `eslint-plugin-security`'s recommended config as a base, then apply the same custom overrides on top:

- `'no-console': 'warn'` — allowed but flagged, not banned outright.
- Security rules: `'security/detect-object-injection': 'off'` (too noisy for normal array/object indexing) — but `detect-bidi-characters`, `detect-eval-with-expression`, `detect-pseudoRandomBytes` stay `'error'`, plus explicit `no-new-func` / `no-eval` / `no-implied-eval` errors.
- `'@typescript-eslint/explicit-function-return-type': 'warn'` — every exported function should declare its return type (`Promise<void>`, `boolean`, etc.), not rely on inference.
- `'@typescript-eslint/no-misused-promises': 'error'` — catches passing an async function where a sync callback is expected (event handlers, etc.).
- `'import/order'` enforced with alphabetized groups (builtin → external → internal → parent/sibling/index).
- `curly: ['error', 'all']` — always brace `if`/`for`/etc., never a bare-statement one-liner.

A project may add framework-specific plugins/rules on top of this (Angular-eslint, eslint-plugin-astro, etc.) — that never means these shared rules are absent, just that the framework skill documents the additional layer.

## Prettier baseline

`.prettierrc`: `printWidth: 120`, 2-space indent, single quotes, `semi: true`, `trailingComma: 'all'`, `bracketSameLine: true`. A framework's own Prettier plugin (e.g. `prettier-plugin-astro`) or a minor option like `endOfLine: 'auto'` may be added per-project — check that project's own `.prettierrc` for the full picture, but expect these base values to match.

## CSS: BEM naming syntax

Both projects name CSS classes with the same BEM syntax — one root **block** class per visually distinct component/region, with **elements** and **modifiers** as `block__element` and `block--modifier`:

```css
.news-card { }
.news-card__image { }
.news-card__image--placeholder { }
```

The *syntax* (`__element`, `--modifier`) is identical across both. The *mechanism* and the *state-toggle sub-convention* are not — check the framework skill for specifics:
- Angular nests elements/modifiers under the block with Sass `&`, and uses a separate SMACSS-style `is-*` class (not `--modifier`) for JS/state-driven toggles, reserving `--modifier` for structural/template variants.
- Astro has no Sass nesting (flat class names) and reuses the `--modifier` syntax itself for JS-driven state (`classList.toggle('site-header__nav--open')`) — there's no separate `is-*` convention there.

Don't assume either sub-convention transfers to the other project — the block/element/modifier naming shape is the shared part, not the state-handling rule.

## CSS: design tokens over hardcoded values

Both projects define CSS custom properties for color/spacing/radius and reach for them instead of hardcoding hex values or raw `px`/`rem`, rather than a utility-class framework (no Tailwind in either) or hardcoded magic numbers. The actual token names are completely different per project (Angular's come from an Angular Material theme system, `--mat-sys-*`; Astro's are hand-rolled, `--color-*`/`--space-*`) — this skill documents the *principle*, not a token vocabulary. Check the relevant framework skill's `styling.md` for the real token names before writing CSS in either project.

## Applying this in practice

- Writing new code in a recognized project: format/style choices should already match this baseline via the project's own tooling — this skill mainly matters when reasoning about *why* a lint error fired, or hand-writing something before running the formatter.
- Setting up a **new** JS/TS web project in this org: start ESLint/Prettier config from this baseline rather than each tool's stock recommended preset, use BEM for CSS naming and a CSS-custom-property token set for design values, then layer on framework-specific plugins/rules for whatever you're building.
- If a project's actual config or CSS disagrees with this baseline, trust the project's real files over this skill — this documents what was true across the two projects it was extracted from, not an immutable org policy.
