# Engineering workflow for agents

Installed skills under [`.agents/skills`](../../.agents/skills) are canonical procedures. This file adds portable repository routing, gates, and lifecycle rules. When asked which flow fits, use [`/ask-matt`](../../.agents/skills/ask-matt/SKILL.md).

## Bootstrap each clone

Run from the repository root:

```sh
node scripts/bootstrap-engineering-workflow.mjs
node scripts/validate-engineering-workflow.mjs
```

Bootstrap resolves the canonical GitHub tracker from `origin` and idempotently provisions the five triage labels. It preserves unrelated labels. Use `--check` for a read-only bootstrap audit. The validator checks the local workflow installation; `--root PATH` validates another clone. After remote policy exists, `--github` also audits the effective `gh` default, repository settings, labels, and protected default branch.

Never trust bare `gh` repository inference. Resolve once per shell and pass the result explicitly:

```sh
REPO="$(node scripts/resolve-github-repo.mjs)"
gh issue list --repo "$REPO"
```

See [Issue tracker: GitHub](issue-tracker.md) for every tracker operation.

## Choose the flow

```text
product idea -> /grill-with-docs
  |-- missing external fact -> /research -------------------------|
  |-- runnable uncertainty -> /handoff -> fresh /prototype -------|
  |                                                    verdict back|
  |-- approved one-session change -> concise Issue -> /implement here
  `-- approved multi-session change -> /to-spec -> /to-tickets
                                       -> fresh /implement per unblocked child
```

Other entry points:

- `/diagnosing-bugs`: hard bug with unknown cause.
- `/triage`: raw incoming issues only; never deliberate spec/ticket output.
- Fresh `/implement`: existing ready ticket.
- `/ask-matt`: explicit flow-selection request.

`/wayfinder` is opt-in for a huge, foggy decision space. Multi-session understood work uses spec/tickets. Do not invoke Wayfinder or provision its labels unless the user opts in.

## Keep planning context continuous

Keep `/grill-with-docs`, `/to-spec`, and `/to-tickets` in one context. Feed `/research` findings back into it. For executable uncertainty, `/handoff` to a fresh `/prototype`, then hand the verdict back. Preserve the throwaway branch and verdict; merge only the validated decision.

After ticketing multi-session work, start every unblocked child in a fresh `/implement` context. A one-session change may continue into `/implement` after its concise issue exists. Handoff when accumulated context makes decisions unreliable; no fixed token threshold.

## Record approved work

For a one-session change, create a concise Issue containing outcome, scope, acceptance criteria, and verification. Apply `ready-for-agent`; skip triage.

For multi-session work, `/to-spec` creates the parent planning issue and `/to-tickets` creates independently claimable implementation children. The parent is the shared acceptance contract; children are delivery units.

## Gate `/implement`

Before changing code:

1. Read the whole issue, comments, labels, linked parent, and relevant parent spec.
2. Require open state and `ready-for-agent`.
3. Require all native dependencies, or fallback `Blocked by:` issues, closed.
4. Never implement a decomposed parent. Select an unblocked child; after all children close, use [Complete a parent spec](#complete-a-parent-spec).
5. Require no other implementer. For autonomous pickup, require unassigned, claim by assignment, then recheck coordination. For an explicitly resumed claim, verify its driver and branch.
6. Update `main`; create an issue branch per [CONTRIBUTING.md](../../CONTRIBUTING.md). Never implement on `main`.

One implementer per issue. Assignment is a signal, not an atomic lock: shared identities and concurrent sessions can race. Stop if recheck finds another active implementation.

## Use TDD at agreed seams

Follow [`/tdd`](../../.agents/skills/tdd/SKILL.md). Agree observable public seams first. Work vertical red-green slices: one meaningful failing behavior test, minimum passing implementation, next slice. Avoid private-detail tests and horizontal speculative test batches.

Run focused tests and typechecking during implementation, then full relevant verification. If review finds a behavior defect, strengthen the regression test before fixing it. Defer structural cleanup to review remediation while keeping tests green.

## Review a committed candidate

`/code-review` compares a fixed point with committed `HEAD`; `/implement` asks for review before its final commit. Use this adapter:

1. Finish the ticket; run full relevant verification.
2. On the issue branch, create a complete, green review-candidate commit. Reference the child or standalone issue and include applicable AI trailers.
3. Run `/code-review main` against committed `HEAD`.
4. For a child, evaluate Spec against both child criteria and parent spec.
5. The implementation agent owns fixes, tests, and remediation commits.
6. Reverify every fix; rerun `/code-review main` after material changes.
7. Push and open the PR only after clean local review. Pass configured CI and required review before squash merge.

The candidate commit is never permission for broken/partial work and never belongs on `main`. Reassess this adapter after upstream `/implement` or `/code-review` changes; do not patch vendored skills locally.

## Resolve merge conflicts safely

Use [`/resolving-merge-conflicts`](../../.agents/skills/resolving-merge-conflicts/SKILL.md) with this repository adapter:

1. Identify the active operation: merge, rebase, or cherry-pick. Record `git status --short`; preserve unrelated pre-existing changes.
2. Resolve the tracker from `origin`. Read both sides' commits, PRs, issues, and intended behavior.
3. Resolve only conflicted hunks. Preserve both intents where compatible; do not invent behavior.
4. If intent cannot be established safely, pause. Abort only when it restores a known pre-operation state without losing unrelated work; otherwise request maintainer direction.
5. Stage resolved paths explicitly with `git add -- <path>...`; never use `git add .`, `git add -A`, or stage unrelated files.
6. Require `git diff --name-only --diff-filter=U` to return nothing. Run relevant checks.
7. Finish correctly: use `git merge --continue` (or create the merge commit with `git commit`) for a merge; use `git rebase --continue` or `git cherry-pick --continue` and repeat checks for each stop.

This adapter overrides the vendored skill's blanket “never abort” and “stage everything” language. Keep the vendored skill upstream-identical.

## Complete a parent spec

A child PR closes its child, not the parent. After the final child merges:

1. Update local `main`; confirm every planned child is closed.
2. Re-read parent criteria; verify integrated behavior on `main` with full relevant checks.
3. Comment on the parent with commands, results, and deliberate exceptions.
4. Close the parent only when all criteria pass. Otherwise create/link a follow-up child and keep it open.

## Update official skills safely

Treat skill refreshes as dependency updates. Work between tickets from a clean synchronized branch:

```sh
git status --short
npx --yes skills@1.5.19 add mattpocock/skills --list
npx --yes skills@1.5.19 update --project --yes
git diff -- .agents/skills .claude/skills skills-lock.json
find -L .claude/skills -type l -print
node scripts/validate-engineering-workflow.mjs
git diff --check
```

Review every skill, lock entry, and compatibility symlink; `find` must print nothing. The list command is the discovery step because update refreshes installed names but may not discover newly promoted skills. Reconcile locked names against its `Mattpocock Skills` group; evaluate its separate `General` group deliberately rather than silently adding it. Do not hand-edit vendored skills or mix refreshes with product work.

## Delivery gate

Every repository change uses a branch and pull request. A PR must pass `node scripts/validate-engineering-workflow.mjs`, relevant project checks, configured CI, and required review before squash merge. The workflow validator checks this template's contracts; it does not replace product tests.

Once a product scaffold exists, document its canonical install, development, lint, typecheck, test, and build commands and run the real gates in CI. Also document environment setup and secret handling, plus preview/deployment verification and expected demo evidence. Do not invent placeholder commands before the stack exists.
