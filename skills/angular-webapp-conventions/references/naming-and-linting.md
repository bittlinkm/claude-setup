# Naming, known inconsistencies, and enforced linting/formatting

## Naming conventions

- Files: predominantly **kebab-case** (`sight-data-source.ts`, `dashboard-session-state.service.ts`), but a real minority is PascalCase/camelCase, **especially enum files**: `SightType.ts`, `SightRegion.ts`, `UserLevelEnum.ts`, `PasswordRequirements.ts`, `defaultValidatorOptions.ts`, `snackbarUtil.ts`. Match whichever casing the sibling files in that specific feature folder use, not a single universal rule.
- Folder pluralization inconsistency (see Known inconsistencies below): `features/needs-assessments/enum/` (singular) vs every other feature's `enums/`; `shared/pipe/` (singular) vs `shared/directives/`/`shared/validators`/`shared/services`. New folders should use the plural form the majority uses; don't rename the existing singular ones unasked.
- Classes: PascalCase, suffixed by role (`SightsService`, `SightSupabaseDataSource`, `LoginComponent`). Enum values are usually PascalCase too, though some mix German business terms into English enum names (`UserLevelEnum.Operator = 'Betreiber'`).
- **Interfaces heavily outnumber `type` aliases** (72 vs 7 repo-wide). `interface` is the default for models/DTOs/data-source contracts; `type` is reserved for small local unions (`button.component.ts`: `type Kind = 'button' | 'icon' | ...`).
- **No barrel files (`index.ts`) anywhere** — always import from the concrete file path, however deep the relative chain gets.
- Injection tokens: `SCREAMING_SNAKE_CASE` matching the interface name — `export const SIGHT_DATA_SOURCE = new InjectionToken<SightDataSource>('SIGHT_DATA_SOURCE');`.

## Known inconsistencies — match sibling code, don't silently "correct" these

1. `@Input()`/`@Output()` decorators still used in `date-range-picker`, `sidenav`, `time-period-selector` components while the rest of `shared/components/**` uses signal `input()`/`output()`. New components: use signals.
2. `shared/services/locale.service.ts` still uses `BehaviorSubject`/`Observable` while every other state service uses signals (see `architecture.md`). Don't generalize its shape to new state.
3. `import/order` ESLint rule is disabled ad hoc in specific files (`table.component.ts`, `permission.service.ts` both have `/* eslint-disable import/order */`) rather than followed everywhere — only add that disable if the sibling file you're extending already has it.
4. `features/needs-assessments/enum/` (singular) vs every other feature's `enums/`; `shared/pipe/` (singular) vs plural siblings.
5. Enum file casing is PascalCase in several feature folders even where the rest of that folder is kebab-case — match the sibling enum files, not the folder's general casing.
6. `.site-header__language--trigger` / `.site-header__theme--trigger` use `--modifier` syntax where strict BEM would want an element (`__language-trigger`) — an existing quirk, not a pattern to copy into new CSS.
7. `shared/components/selection group/` has a literal space in the folder name (typo, not a convention).
8. No test convention exists at all (see `testing.md`).
9. Component selector lint-disable comment (see `architecture.md`) belongs only on `beko-*` files, never on `app-*` ones.

## Linting / formatting actually enforced

The shared, framework-agnostic ESLint/Prettier baseline (`no-console`, the security-rule subset, `explicit-function-return-type`, `no-misused-promises`, alphabetized `import/order`, `curly: all`, and the core `.prettierrc` values) is documented once in the **`web-tech-conventions`** skill — read that instead of expecting it repeated here. This section covers only what's specific to *this* project on top of that baseline.

`eslint.config.js` (flat config) adds `angular.configs.tsRecommended` (+ template variants) on top of the shared base. Angular-specific overrides:

- `@angular-eslint/component-selector` → `{ type: 'element', prefix: 'app', style: 'kebab-case' }`; `@angular-eslint/directive-selector` → `{ type: 'attribute', prefix: 'app', style: 'camelCase' }`. This is why every `beko-*` component needs the eslint-disable comment (see `architecture.md`).
- `import/order` is enforced org-wide (see `web-tech-conventions`) but disabled ad hoc in some files here — see Known inconsistencies above.

`tsconfig.json`: `strict: true` plus `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`; `angularCompilerOptions` sets `strictInjectionParameters`, `strictInputAccessModifiers`, `strictTemplates`. This strictness is why defensive `?? ''`/`typeof x === 'string'` guards show up throughout (e.g. `sight-supabase-data-source.ts`'s `mapFromDb`/`mapToDb`).

`angular.json` component style budget is tight — `anyComponentStyle` warns at 4kB / errors at 8kB (see `styling.md`'s app-shell note for how that shaped the app-shell's CSS location).
