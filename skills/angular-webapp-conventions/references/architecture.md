# Architecture: project structure, components, services, state, routing

## Project structure — Vertical Slice Architecture

This codebase follows the org-wide **Vertical Slice Architecture** principle documented in the `web-tech-conventions` skill — grouped by feature, not by technical layer. Concretely, each entry under `features/<feature>/` colocates everything that feature needs: UI (`pages/`), state (`services/`), data-access (`data-access/`), domain models (`models/`), enums, and its own routes (`routes/`) — all in one feature folder. There is deliberately no repo-wide `components/`, `services/`, or `models/` folder that pools code by technical layer across features. When adding a new feature or extending one, keep everything the feature needs inside its own slice rather than splitting it across parallel top-level folders by layer.

Three roots under `src/app`: `core/`, `features/`, `shared/`.

- **`core/`** — app-wide singletons that aren't a navigable feature: `core/auth/` (by far the biggest), `core/models/base-model.ts`, `core/services/` (`app-config.service.ts`, `theme.service.ts`).
- **`core/auth/` internal layout** — the reference shape for a slice's internal `ui`/`state`/`data-access` split:
  - `core/auth/ui/login/` — the one auth *page component*
  - `core/auth/state/auth.service.ts` — the signal-based auth store (see State management below)
  - `core/auth/data-access/` — `auth-api.service.ts`, `auth-provider.interface.ts`, `supabase-client.service.ts` — talks to Supabase, no UI/state knowledge
  - `core/auth/guards/` — functional guards only (see Routing below)
  - `core/auth/permissions/permission.service.ts`, `core/auth/directive/app-if-auth.directive.ts`
- **`features/<feature>/`** (`dashboard`, `sights`, `user`, `locations`, `needs-assessments`, `registration`, `analytics`, …) — every feature slice repeats the same internal sub-structure:
  - `pages/<page-name>/<page-name>.component.{ts,html,scss}` — routed/smart components
  - `services/` — one `providedIn: 'root'` signal-based store service per feature
  - `data-access/` — an `InjectionToken` + interface plus a concrete `*-supabase-data-source.ts` implementation (see Services below)
  - `models/` — plain interfaces, one per file
  - `enums/` — feature-scoped enums (folder name inconsistency: see `naming-and-linting.md`)
  - `routes/<feature>.routes.ts` — the lazy-loaded `Routes` array
- **`shared/`** — cross-feature reusable code, split by kind: `shared/components/` (all `beko-*` prefixed), `shared/services/`, `shared/directives/`, `shared/pipe/` (singular — see `naming-and-linting.md`), `shared/models/`, `shared/utils/`, `shared/validators/`, `shared/definitions/enums.ts` (app-wide grab-bag enums, distinct from per-feature `enums/`). This is the one place layer-based grouping is intentional — it only holds code with no single owning slice.

**Where new code goes**: a new feature page → `features/<feature>/pages/<name>/`; a feature-scoped model/enum/service → that feature's own `models/`/`enums/`/`services/` (inside its slice, not a shared layer folder); reused by ≥2 features → `shared/`; infrastructure/auth/bootstrapping → `core/`.

## Component conventions

- Every component declares `standalone: true` explicitly (not omitted, despite modern Angular defaulting to standalone) — e.g. `core/auth/ui/login/login.component.ts`, `features/sights/pages/sights-table/sights-table.component.ts`.
- **`ChangeDetectionStrategy.OnPush` is set only on `shared/components/**`** (reusable UI-library components, 13 files: `button`, `table`, `mobile-card`, `form-shell`, `map`, all `charts/*`) **plus `app.component.ts`**. Every feature page component and every `core/auth/ui/**` component (14 files) omits `changeDetection` entirely. Treat this as a real rule, not a random inconsistency: shared/library components → `OnPush`; feature pages → default.
- DI is **exclusively `inject()`**, field-initialized, never constructor injection:
  ```ts
  readonly matDialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  ```
  An explicit `constructor()` is used only when there's actual logic to run in it (typically `effect()` registration), e.g. `sights-table.component.ts`:
  ```ts
  constructor() {
    this.sightsService.refreshAllSights();
  }
  ```
- Signal-based `input()`/`output()` is the default for shared/library components (`button.component.ts`: `type = input<Type>('button')`, `pressed = output<MouseEvent>()`), including `viewChild()`/`linkedSignal()` in more complex ones (`table.component.ts`). **Known exception, don't imitate for new components**: `date-range-picker`, `sidenav`, and `time-period-selector` components still use legacy `@Input()`/`@Output() = new EventEmitter()` — only touch that decorator style if you're editing one of those three files directly.
- Signals and RxJS coexist by design, not one-or-the-other: signals for local/derived UI state and stores; RxJS for router/reactive-forms streams, bridged into signals via `toSignal()`:
  ```ts
  private readonly routeUserId = toSignal(this.route.paramMap.pipe(map(...)), { initialValue: ... });
  ```
- Templates use the **new `@if`/`@for`/`@switch` control-flow syntax exclusively** — 0 files use `*ngIf`/`*ngFor` anywhere in the repo, 29 use `@if`/`@for`. Never write structural directives in new templates.
- File triplet: `<name>.component.ts` / `.html` / `.scss` always together in the same folder. The `imports` array lists Angular Material modules/standalone directives/pipes directly — there's no shared "Material module" barrel.
- Selector prefixes (enforced by ESLint, see `naming-and-linting.md`): `app-*` for feature/page components, no lint override needed; `beko-*` for shared reusable components, which carry `/* eslint-disable @angular-eslint/component-selector */` at the top of the `.ts` file. Don't add that disable comment to `app-*` components — they already satisfy the rule.

## Services

- Nearly every service is `@Injectable({ providedIn: 'root' })` (`AuthService`, `SightsService`, `PermissionService`, `ApiErrorNotifierService`, `NeedsAssessmentService`, `DashboardSessionStateService`), using `inject()` internally the same way components do.
- **Data-access token pattern**, used for every backend-touching feature — new feature CRUD should follow this same three-piece shape:
  1. `data-access/xxx-data-source.ts` — a plain interface plus an `InjectionToken`:
     ```ts
     export interface SightDataSource {
       getById(id: string): Promise<Sight | undefined>;
       list(): Promise<Sight[]>;
       upsert(sight: Sight): Promise<void>;
       delete(id: string): Promise<void>;
     }
     export const SIGHT_DATA_SOURCE = new InjectionToken<SightDataSource>('SIGHT_DATA_SOURCE');
     ```
  2. `data-access/xxx-supabase-data-source.ts` — a concrete `@Injectable()` (no `providedIn`) implementation talking to Supabase.
  3. Bound centrally in `src/app/app.config.ts`'s `providers` array: `{ provide: SIGHT_DATA_SOURCE, useClass: SightSupabaseDataSource }`. This is the intended seam for swapping/mocking a data source.
  4. A feature `services/xxx.service.ts` `inject()`s the token (`inject<SightDataSource>(SIGHT_DATA_SOURCE)`) rather than the concrete class, and exposes state built on top of it (see State management below).
- HTTP: the only real `HttpClient` consumer is `TranslocoHttpLoader` (see `cross-cutting.md`) — everything else goes through the Supabase JS client via `SupabaseClientService`. `provideHttpClient(withInterceptors([httpErrorInterceptor]))` is registered once in `app.config.ts`.
- Error handling: the functional interceptor `shared/utils/http-error.interceptor.ts` catches `HttpErrorResponse`, maps status codes to Transloco keys, and delegates to `ApiErrorNotifierService` (`shared/utils/api-error-notifier.service.ts`), which shows a Material snackbar via `showErrorSnackBar()` (`shared/utils/snackbarUtil.ts`). Since Supabase calls don't go through `HttpClient`, feature services instead wrap `try/catch` around them and call `this.apiErrorNotifier.notify(err)` directly (`SightsService.refreshAllSights()`, `NeedsAssessmentService.refreshAllNeedsAssessmentData()`). An `HttpContextToken` `SKIP_GLOBAL_HTTP_ERROR` opts individual `HttpClient` requests out of the interceptor's global notification.

## State management

No NgRx, no signal-store library. State is a **plain `providedIn: 'root'` service holding a private writable signal exposed read-only**, the same shape everywhere:
```ts
private readonly _sights = signal<Sight[]>([]);
readonly sights = this._sights.asReadonly();
```
(`features/sights/services/sights.service.ts`; `core/auth/state/auth.service.ts` uses `computed()` instead of `.asReadonly()` for some derived fields; `features/needs-assessments/services/needs-assessment.service.ts` matches the same shape). `effect()` inside these services drives reactive side effects — e.g. `SightsService` refetches when `authService.activeUser()` changes; `DashboardSessionStateService` uses several `effect()`s to persist signal state to `sessionStorage`.

**Known exception, don't generalize from it**: `shared/services/locale.service.ts` still exposes a `BehaviorSubject`/`.asObservable()` instead of a signal. New state services should use the signal shape above, not this one.

## Routing

- `src/app/app.routes.ts` — the root `Routes` array. Two eager routes (`LoginComponent` for `''`/`login`); every feature is lazy-loaded as a whole child routes file:
  ```ts
  { path: 'sights', loadChildren: () => import('./features/sights/routes/sights.routes').then((m) => m.sightsRoutes) }
  ```
  `loadComponent` is not used anywhere — features lazy-load a `Routes` array, not individual components.
- Feature route files (`features/sights/routes/sights.routes.ts`) declare `component: XxxComponent` directly (the whole file is already lazy via `loadChildren`) and attach functional guards plus an authorization `data` bag:
  ```ts
  canActivate: [authGuardFn, userLevelGuardFn],
  data: { allowedViewLevels: [...], allowedEditLevels: [...] },
  ```
- Guards are always `CanActivateFn` function constants, never class-based — `inject()` services directly inside the arrow function body:
  ```ts
  export const authGuardFn: CanActivateFn = async () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    await authService.checkSession();
    return authService.isAuthenticated() ? true : router.createUrlTree(['/login']);
  };
  ```
- No route resolvers exist. `provideRouter(routes, withComponentInputBinding())` is set, so route params *can* bind to component `input()`s, but most components instead read `ActivatedRoute.paramMap`/`queryParamMap` via `toSignal()`.
