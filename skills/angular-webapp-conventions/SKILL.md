---
name: angular-webapp-conventions
description: Use whenever writing, reviewing, or extending Angular code in the angular-webapp-template project — recognizable by provideZonelessChangeDetection() in src/app/app.config.ts, a Supabase-backed data layer, and a features/<feature>/ vertical-slice folder structure. Make sure to use this whenever the task touches new components, services, state, routing, forms, i18n, or SCSS in that codebase — even if the user doesn't explicitly ask for "conventions". Covers the actual conventions this codebase follows (feature-slice project layout, inject()-only DI, signal-based stores, the data-access token pattern, @if/@for templates, Reactive Forms without FormBuilder, Transloco usage, BEM-style SCSS naming) and explicitly calls out where the codebase is inconsistent, so generated code matches sibling files instead of generic Angular/CSS idioms. Do not use for other Angular projects or generic Angular questions — this documents one specific repo's actual, sometimes non-standard conventions, not general best practice.
---

# Frontend conventions for angular-webapp-template

**Applicability check**: this skill documents one specific codebase, not Angular in general. Before applying anything below, confirm you're actually in it — look for `provideZonelessChangeDetection()` in `src/app/app.config.ts` and a Supabase client service (e.g. `supabase-client.service.ts`). If those aren't present, this skill doesn't apply — don't carry these patterns into an unrelated Angular project.

Stack: **Angular**, **zoneless change detection** (`provideZonelessChangeDetection()` in `src/app/app.config.ts`), **standalone-only** (no NgModules anywhere), Angular Material + CDK, Transloco for i18n, Supabase as the backend, no NgRx. Karma/Jasmine is configured but **zero `.spec.ts` files exist** — see `references/testing.md`. Check `package.json` for the exact installed versions if version-specific behavior matters — don't assume a fixed version from this skill.

There is no stylelint config and only a handful of custom ESLint rules — consistency comes from matching the sibling file you're extending, not from a linter catching drift. Read the closest existing file before inventing a new pattern.

The shared ESLint/Prettier/TS-codestyle baseline (Prettier options, import ordering, security-lint subset, etc.) lives in the separate **`web-tech-conventions`** skill, not here — use both together; `references/naming-and-linting.md` below covers only what's specific to this Angular project on top of that baseline.

Read the reference file(s) relevant to the task before writing code:
- **[references/architecture.md](references/architecture.md)** — Vertical Slice project structure (`core`/`features`/`shared`), component conventions (`standalone`, `OnPush` split, `inject()`, signals vs RxJS, `@if`/`@for`), services and the data-access token pattern, signal-based state management, routing and functional guards.
- **[references/styling.md](references/styling.md)** — BEM-via-Sass naming, `is-*` state classes, design tokens (`--mat-sys-*`, `--border-radius-default`), `:host`/`::ng-deep`/global `styles.scss` overlay duplication.
- **[references/cross-cutting.md](references/cross-cutting.md)** — RxJS conventions (`takeUntilDestroyed`, `toSignal`), Reactive Forms without `FormBuilder`, Transloco i18n usage.
- **[references/naming-and-linting.md](references/naming-and-linting.md)** — file/class naming, known repo inconsistencies (don't "fix" these unasked), and the ESLint/Prettier/tsconfig rules actually enforced.
- **[references/testing.md](references/testing.md)** — there is no existing spec convention; what to default to if tests are requested.

## Non-negotiable architecture (most commonly violated)

- **Vertical Slice Architecture**: a feature's UI, state, data-access, models, and routes all live together under `features/<feature>/`, not spread across layer-based top-level folders. Full detail in `references/architecture.md`.
- Every component: `standalone: true` explicit; `ChangeDetectionStrategy.OnPush` only on `shared/components/**`, omitted on feature pages.
- DI is `inject()` only, field-initialized — never constructor injection.
- Templates use `@if`/`@for`/`@switch` exclusively — never `*ngIf`/`*ngFor`.
- State = a `providedIn: 'root'` service with a private `signal()` exposed `.asReadonly()`/`computed()` — no NgRx, no `BehaviorSubject` (one legacy exception, don't copy it).
- New feature CRUD follows the three-piece data-access token pattern (`InjectionToken` + interface, Supabase implementation, binding in `app.config.ts`) — see `references/architecture.md`.
- Reactive Forms only, built with `new FormGroup()`/`new FormControl()` — `FormBuilder` is never used.
- No barrel files (`index.ts`) anywhere — always import the concrete file path.

## Quick recipe: building a new feature or component

1. New feature page → `features/<feature>/pages/<name>/<name>.component.{ts,html,scss}`; new feature CRUD → the three-piece data-access token pattern plus a signal-based store service (`references/architecture.md`).
2. `standalone: true` explicit; `OnPush` only if it's a `shared/components/**` reusable component, otherwise omit `changeDetection`.
3. `inject()` for all DI, field-initialized; only write a `constructor()` if you need to run logic (e.g. `effect()`).
4. Template control flow: `@if`/`@for`/`@switch`, never `*ngIf`/`*ngFor`.
5. Forms: hand-built `new FormGroup({...})`/`new FormControl(...)`, composed `defaultValidator(...)` calls, bridge `statusChanges` to a signal rather than reading `form.valid` in the template (`references/cross-cutting.md`).
6. Any user-facing string goes through Transloco — `TranslocoPipe` in templates, `inject(TranslocoService).translate(...)` in TS when building data structures (`references/cross-cutting.md`).
7. CSS: `:host { display: block; }` first, one root block class per visual region, `&__element`/`&--modifier` nesting, `is-*` for state toggles, `--mat-sys-*` for color, mirror any `mat-menu`/`mat-dialog` class into `src/styles.scss` too (`references/styling.md`).
8. No barrel files, no `FormBuilder`, no NgRx, no manual `Subscription.unsubscribe()` — use `takeUntilDestroyed(inject(DestroyRef))` instead.

Full rationale, code shapes, and known inconsistencies for every point above are in `references/`.
