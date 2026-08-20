# CSS / SCSS naming conventions

There is **no stylelint config** — only Prettier and `.editorconfig` format the files (2-space indent, single quotes, 120-char width). Nothing fails the build on a class-naming violation; consistency comes from matching sibling `.scss`/`.html` files.

## BEM via Sass nesting — the dominant pattern

One **block** class per visually distinct region, with **elements**/**modifiers** nested under it via Sass `&`:
```scss
.kpi-card {
  &__title { }              // element  →  .kpi-card__title
  &__value-row { }           // multi-word element, kebab-case
  &--clickable { }           // modifier on the block  →  .mobile-card--clickable
  &__header--filter { }      // modifier on an element →  .beko-table__header--filter
}
```
Examples: `shared/components/table/table.component.scss` (`.beko-table__header`, `.beko-table__body--desktop-view`), `shared/components/charts/kpi/kpi.component.scss` (`.kpi-card__value`, `.kpi-card__trend`), `shared/components/mobile-card/mobile-card.component.scss` (`.mobile-card--clickable`), `core/auth/ui/login/login.component.scss` (`.card__subtitle--first`).

- Modifiers are applied by adding the extra class **alongside** the base class in the template, not via `:host-context` or attribute selectors.
- A single component can define multiple independent sibling blocks when it has multiple unrelated regions — `login.component.scss` has `.login`, `.card`, `.form` side by side. Don't force everything into one block per file.

## `is-*` classes for JS/state-driven toggles (not `--modifier`)

For classes toggled purely by `ngClass`/`[class.x]` bindings to represent transient state (not a structural template variant), use a SMACSS-style `is-*` class compounded onto the BEM class as a sibling selector, not nested under `&`:
```scss
.kpi-card__trend.is-up { color: #14532d; background: #dcfce7; }
.kpi-card__trend.is-down { color: #991b1b; background: #fee2e2; }
```
`is-*` = JS/state-driven toggle; `--modifier` = structural/template variant.

## Flat kebab-case classes are also fine — BEM is not mandatory everywhere

Plenty of components use plain kebab-case classes with no `__`/`--` structure: `sidenav.component.scss` (`.card-panel`, `.action-button`), `edit-dialog.component.scss` (`.full-width`), `confirm-dialog.component.scss` (`.header-container`), `time-period-selector.component.scss`. Reach for BEM when a block has repeated substructure (header/body/footer, list items, several states); a handful of one-off, non-repeating regions can stay flat.

## Component selector prefix vs. root CSS class name

The root CSS block class does **not** consistently mirror the selector prefix (`app-*`/`beko-*`, see `architecture.md`) — follow the sibling classes already in the file:
- `beko-form-shell` → `.form-shell`, `beko-mobile-card` → `.mobile-card`, `beko-kpi` → `.kpi-card`, `app-login` → `.login` (prefix dropped).
- `beko-table` → `.beko-table` for the outer block, but the same file also has un-prefixed sibling blocks `.table`, `.table-cell`, `.table-actions` (prefix kept only on the outer block).

## CSS custom properties (design tokens)

- **`--mat-sys-*`** (from `src/theme-colors.scss` / `mat.theme(...)` in `src/styles.scss`) — always use these for color instead of hardcoding hex, so components stay correct across the light/dark `html[data-theme='dark']` theme.
- **App-wide tokens** in `src/styles.scss` `:root`: `--border-radius-default` (used everywhere for corner radius) and `--bp-desktop`/`--bp-laptop`/`--bp-tablet`/`--bp-phone` (1280/1024/768/480px). **Known gap, don't "fix" it unasked**: the `--bp-*` tokens are declared but unused — every `@media (max-width: …)` hardcodes the pixel value directly. New media queries should match this hardcoded-px convention.
- **Component-local tokens** on `:host` for a magic number reused ≥2 times in the same file: `--span-desktop`/`--span-tablet`/`--span-mobile` (`grid-item.component.scss`), `--login-w`, `--radius` (`login.component.scss`).

## `:host`, `::ng-deep`, and global `styles.scss` duplication

- `:host { display: block; ... }` is the near-universal first rule — Angular custom elements default to `display: inline` otherwise.
- `::ng-deep` is used deliberately to reach Material's internal DOM (`.mat-mdc-*`, `.mdc-*`), outside the component's emulated view-encapsulation boundary.
- Content Material portals into the global CDK overlay container (`mat-menu`, `mat-dialog`, `mat-select`/autocomplete panels) renders attached to `<body>`, entirely outside component style scope — `::ng-deep` doesn't reliably reach it either. The fix used throughout: **duplicate the exact class names into global `src/styles.scss`** in addition to the component file (see `.beko-table__filter-chip-set`, `.beko-table__time-filter-menu` defined in *both* `table.component.scss` and `styles.scss`). Adding a new `mat-menu`/`mat-dialog`/overlay-panel class on a shared component means adding the matching rule to `styles.scss` too.

## Global utility & app-shell classes (`src/styles.scss`)

- Small, flat, unprefixed utility classes: `.mb-025`, `.form-field`, `.page-content-header`, `.actions-row`, `.error-snackbar`, `.success-snackbar`.
- The app shell (header/footer/nav, rendered from `app.component.html`) has its styles live in `styles.scss` rather than `app.component.scss` — per a comment in `app.component.scss`, "to keep the component style budget below the Angular warning threshold" (see `naming-and-linting.md`'s `anyComponentStyle` budget note). It uses the same BEM pattern: `.site`, `.site-header`, `.site-footer`, each with `&__element` children.
