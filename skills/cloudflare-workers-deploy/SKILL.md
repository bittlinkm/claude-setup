---
name: cloudflare-workers-deploy
description: Use whenever a project is (or should be) deployed as a Cloudflare Worker via Cloudflare's Git integration (Workers Builds) — setting up a new project's deployment, touching wrangler.jsonc, vars or secrets, checking whether a deploy went through, debugging a failed Workers Build, handling the Cloudflare "Update wrangler.jsonc … name" warning or its auto-generated PR, or syncing CMS content commits from main back into dev. Recognizable by a wrangler.jsonc/wrangler.toml in the repo, an @astrojs/cloudflare adapter, or GitHub check runs named "Workers Builds: <service>". Covers the two-service dev/main setup, per-service `--name` deploy commands, the vars-reset and secret-redeploy pitfalls, and the main → dev sync rule. Not for Cloudflare Pages projects or GitHub-Actions-based deploys.
---

# Cloudflare Workers Builds deploy

Hosting default: one Cloudflare Worker per branch, deployed automatically by
Cloudflare's Git integration (Workers Builds). No GitHub Action, no manual
`wrangler deploy`.

The safety rules (merge to `main` = live deploy → only with the user's go;
no manual `wrangler deploy` / `npm run deploy` without go) live in the global
CLAUDE.md and always apply.

## Setup

Two Worker services, both connected to the same repo:

| Service | Production branch | Purpose | Deploy command |
|---|---|---|---|
| `<project>-dev` | `dev` | Staging, `*.workers.dev` URL | `npx wrangler deploy --name <project>-dev` |
| `<project>` | `main` | Live, custom domain | `npx wrangler deploy --name <project>` |

Build command: `npm run build`, root directory `/`. Astro projects: the
`build` script is `astro build --force` (see pitfalls).

New-project checklist (the dashboard steps are the user's; hand them over as a list):
1. Repo has `main` + `dev`, GitHub default branch `dev`.
2. `wrangler.jsonc` committed with `name`, `compatibility_date`,
   `compatibility_flags` and any public `vars` (see pitfalls).
3. `.dev.vars` gitignored, `.dev.vars.example` committed with placeholders.
4. In the dashboard: create both services, connect Git, set production
   branch and the deploy command with `--name` per the table above.
5. Set secrets per service (dashboard or `wrangler secret put --name <service>`).
6. Verify: first build of each branch shows up as a successful check run.

`wrangler.jsonc` is required even when everything else is configured in the
dashboard: `wrangler deploy` reads it for compatibility date/flags and vars,
and `wrangler dev` / preview use it locally.

## Checking a deploy

Every build posts a GitHub check run `Workers Builds: <service>`:

```bash
gh api repos/<owner>/<repo>/commits/<sha>/check-runs \
  --jq '.check_runs[]|[.name,.status,.conclusion]|@tsv'
```

The summary's `Script:` line names the Worker that was actually deployed.
After a fast-forward sync the same commit is on both branches, so it carries
check runs for both services. Wait for a run with a polling loop instead of
fixed sleeps.

## Pitfalls

- **Name mismatch**: without `--name`, the `name` in `wrangler.jsonc` must
  equal the service name or the build fails. With two services, give each its
  own `--name` so the file's `name` no longer matters.
- **Dashboard warning "Update wrangler.jsonc … name"**: unavoidable with two
  services sharing one file → ignore. Never merge Cloudflare's auto-generated
  PR that changes `name` — it can make `dev` builds land on the live Worker.
- **`--name` typos go unnoticed**: the connected service is deployed anyway.
  Keep `--name` identical to the service name; the check run's `Script:` shows
  the real target.
- **Plain-text vars get reset on every deploy** to what `wrangler.jsonc`
  declares — values entered only in the dashboard disappear. Keep public
  values (e.g. an OAuth client id) in `wrangler.jsonc` `vars`. Secrets are not
  affected.
- **New secrets take effect only after the next deploy**: trigger one with an
  empty commit (`git commit --allow-empty -m "chore: redeploy to pick up <SECRET>"`)
  on the branch of that service — for `main` that is a live deploy, so only with go.
- **Astro: deleted content stays live**: when a content collection folder
  becomes empty (last CMS entry deleted), Astro's `glob` loader keeps its
  cached entries, and Workers Builds reuses that cache between builds — the
  build succeeds but still shows the old entries. Use
  `"build": "astro build --force"` in `package.json` so every build rebuilds
  the content store (logs a harmless `data store cleared (force)` warning).
- Never write secret values into `wrangler.jsonc`, `.dev.vars.example` or any
  committed file.

## CMS commits and syncing main → dev

A Git-backed CMS (e.g. Sveltia) may commit straight to `main` so content goes
live immediately. `dev` then falls behind and must be synced:

1. `git fetch`, then `git log --oneline origin/dev..origin/main`.
2. If `dev` has no own commits (`git merge-base --is-ancestor origin/dev origin/main`),
   fast-forward: `git push origin origin/main:refs/heads/dev` — the one allowed
   direct push to `dev`, never with `--force`.
3. Otherwise open a PR `main` → `dev`.
   **Before merging it**, check `gh repo view --json deleteBranchOnMerge,defaultBranchRef`:
   with `deleteBranchOnMerge: true` and default branch `dev`, GitHub deletes
   `main` (the PR's head branch) on merge. Only merge if `main` is protected by
   an active ruleset with "Restrict deletions"
   (`gh api repos/<owner>/<repo>/rules/branches/main` lists `deletion`);
   otherwise stop and ask. If `main` was deleted anyway, the user restores it
   via "Restore branch" in the PR (a push to `main` is blocked as production).

Do this before creating any new branch. Content-only syncs rarely conflict, but
they can when `dev` changed the same content files, or changed the content
schema so new CMS entries no longer validate (build fails, not a Git conflict).
