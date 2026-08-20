# Testing

**There are zero `.spec.ts` files anywhere in `src/app`**, despite Karma/Jasmine being fully wired up (`angular.json`'s `test` builder is `@angular/build:karma`, `tsconfig.spec.json` exists, `jasmine-core`/`karma`/`karma-jasmine` are devDependencies).

There is no existing test convention to imitate — if asked to write tests, default to standard Angular `TestBed`/Jasmine idioms and flag to the user that it's the first spec file in the repo, rather than inventing a "house style."

The data-access token pattern (see `architecture.md`) is the seam this repo is set up for mocking a feature's backend calls, even though nothing exercises it yet — a new `xxx-data-source.ts` interface/token pair can be given a fake implementation and provided in a `TestBed` config without touching the real Supabase-backed one.
