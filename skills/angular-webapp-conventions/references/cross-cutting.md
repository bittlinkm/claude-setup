# Cross-cutting: RxJS, Forms, i18n

## RxJS conventions

This is a light-RxJS codebase — most business logic is `async`/`await` over Promises (Supabase calls, `AuthService` methods). RxJS is reserved for Router streams, reactive-forms `valueChanges`/`statusChanges`, and Material component event streams (`MatDialog.afterClosed()`).

- Subscription cleanup is always `takeUntilDestroyed(this.destroyRef)` with `destroyRef = inject(DestroyRef)` — no manual `ngOnDestroy` + `Subscription.unsubscribe()` anywhere.
- Dialog results are consumed either way, pick whichever matches the surrounding method's sync/async style: `.subscribe()` + `takeUntilDestroyed` (`login.component.ts`, `user-edit.component.ts`), or `await firstValueFrom(dialogRef.afterClosed())` inside an `async` method (`sights-table.component.ts`'s `onDeleteSight`).
- The async pipe (`| async`) is essentially unused in templates — RxJS streams get converted to signals with `toSignal()` and read as `()` in templates instead.

## Forms

- **Reactive forms only.** Template-driven forms (`ngModel`) aren't used for real forms (`login.component.ts` imports `FormsModule` alongside `ReactiveFormsModule`, but it's vestigial).
- **`FormBuilder` is never used** — forms are hand-built with `new FormGroup({...})` / `new FormControl(...)`, typed generically where useful (`new FormControl<string | null>(null)`).
- Custom validators live in `shared/validators/default-validator.ts`: one configurable `defaultValidator(options)` factory (`minLength`/`maxLength`/`onlyNumbers`/`onlyCharacters`/`emailInput`) plus standalone `atLeastOneSelectedValidator()` and `passwordMatchValidator()`. Compose multiple calls in a control's `validators` array:
  ```ts
  firstName: new FormControl('', { validators: [Validators.required, defaultValidator({ onlyCharacters: true }), defaultValidator({ minLength: 3 })] }),
  ```
- Form validity is bridged to signals rather than read directly in templates:
  ```ts
  private readonly formStatus = toSignal(this.form.statusChanges.pipe(startWith(this.form.status), takeUntilDestroyed(this.destroyRef)));
  readonly isFormValid = computed(() => this.formStatus() === 'VALID');
  ```
- Enable/disable and reset-on-route-change logic lives in `effect()`s inside the constructor, reacting to signals derived from the route (`user-edit.component.ts`).

## i18n (Transloco)

- Registered once in `app.config.ts`:
  ```ts
  provideTransloco({ config: { availableLangs: ['en', 'de'], defaultLang: 'de', reRenderOnLangChange: true, prodMode: !isDevMode() }, loader: TranslocoHttpLoader })
  ```
- `src/app/transloco-loader.ts` loads `assets/i18n/${lang}.json` via `HttpClient`; translation files are `src/assets/i18n/de.json`/`en.json`, keyed by dotted namespace (`sights.table.header-name`, `auth.login-invalid-credentials`, `snackbar.okay`).
- Templates: `TranslocoPipe` imported wherever needed, `{{ 'key' | transloco }}` or `{{ 'key' | transloco: { name: x } }}`.
- TypeScript: `inject(TranslocoService)` and call `.translate('key', { param })` imperatively whenever a translated string is needed outside a template — very common here because table columns, dialog configs, and other UI are often built as TS data structures rather than pure templates (e.g. `sights-table.component.ts`'s `TableColumnDef`/`TableFilterGroup` construction).
