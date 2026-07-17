# Issue tracker: GitHub

Issues and PRDs live in the GitHub repository named by this clone's `origin`. Run commands from the repository root. Never trust bare `gh` inference or hardcode an owner/repository.

Resolve the target once per shell, then pass it to every `gh` command:

```sh
REPO="$(node scripts/resolve-github-repo.mjs)"
```

After cloning, provision the canonical triage labels idempotently with `node scripts/bootstrap-engineering-workflow.mjs`. Use `--check` for a read-only audit.

## Conventions

- **Create**: `gh issue create --repo "$REPO" --title "..." --body "..."`. Use a body file or heredoc for multiline text.
- **Read**: `gh issue view <number> --repo "$REPO" --comments`, including labels and relationships when relevant.
- **List**: `gh issue list --repo "$REPO" --state open --json number,title,body,labels,comments` with appropriate filters.
- **Comment**: `gh issue comment <number> --repo "$REPO" --body "..."`
- **Label**: `gh issue edit <number> --repo "$REPO" --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --repo "$REPO" --comment "..."`

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if external PRs are feature requests; `/triage` reads this flag.)_

When enabled, PRs use the same labels/states:

- **Read**: `gh pr view <number> --repo "$REPO" --comments` and `gh pr diff <number> --repo "$REPO"`.
- **List external PRs**: `gh pr list --repo "$REPO" --state open --json number,title,body,labels,author,authorAssociation,comments`; keep `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` only.
- **Comment / label / close**: use the `gh pr` equivalent with `--repo "$REPO"`.

GitHub shares one number space across issues and PRs. Resolve `#42` with `gh pr view 42 --repo "$REPO"`; fall back to `gh issue view 42 --repo "$REPO"`.

## When a skill says “publish to the issue tracker”

Create a GitHub Issue using `--repo "$REPO"`.

## When a skill says “fetch the relevant ticket”

Run `gh issue view <number> --repo "$REPO" --comments`.

## Picking up implementation work

Inspect the full issue before claiming:

```sh
gh issue view <number> --repo "$REPO" --comments \
  --json number,title,body,state,labels,assignees,comments,url,blockedBy,parent,subIssues
```

Summarize relationships:

```sh
gh issue view <number> --repo "$REPO" --json blockedBy,parent,subIssues --jq '{
  openBlockers: [.blockedBy.nodes[] | select(.state == "OPEN") | {number, title}],
  parent: .parent,
  openChildren: [.subIssues.nodes[] | select(.state == "OPEN") | {number, title}]
}'
```

Autonomous pickup requires: open, `ready-for-agent`, unassigned, and no open blocker. Where native dependencies are unavailable, read every fallback `Blocked by: #<n>` issue and require closure. For a user-requested resume, verify assignment and active branch belong to the intended driver.

A ticket with implementation children is a parent planning issue. Select an unblocked child while any remain; after all close, use parent completion.

Claim as the first write, then verify:

```sh
gh issue edit <number> --repo "$REPO" --add-assignee @me
gh issue view <number> --repo "$REPO" --json assignees --jq '.assignees[].login'
```

Assignment is a coordination signal, not an atomic lock. Sessions may race or share one identity. Recheck active task/branch coordination; stop if another implementation exists.

When abandoning work, leave evidence and release the assignment:

```sh
gh issue comment <number> --repo "$REPO" --body "Blocked/handoff: <state, evidence, next step>"
gh issue edit <number> --repo "$REPO" --remove-assignee @me
```

After final-child merge and integrated verification on `main`, record results and close the parent:

```sh
gh issue comment <parent-number> --repo "$REPO" --body "Integrated verification: <commands and results>"
gh issue close <parent-number> --repo "$REPO"
```

## Wayfinding operations (not enabled)

`/wayfinder` is opt-in, not the default flow. Do not create its labels or use these operations unless the user explicitly opts in.

The **map** is one issue with **child** issues as tickets:

- **Map**: one issue labelled `wayfinder:map`, holding Notes / Decisions-so-far / Fog. Create it with `--repo "$REPO"`.
- **Child**: link it as a GitHub sub-issue. If unavailable, add it to the map task list and start its body with `Part of #<map>`. Labels use `wayfinder:<type>` (`research`, `prototype`, `grilling`, `task`).
- **Blocking**: native issue dependencies are canonical. Use endpoints under `repos/$REPO`; obtain a blocker database ID with `gh api "repos/$REPO/issues/<n>" --jq .id`, not the issue number or node ID. If dependencies are unavailable, use `Blocked by: #<n>, #<n>` and inspect each issue. All blockers must close.
- **Frontier**: list the map's open children with `--repo "$REPO"`; drop assigned or blocked children. First in map order wins.
- **Claim**: `gh issue edit <n> --repo "$REPO" --add-assignee @me`; first write.
- **Resolve**: comment and close with `--repo "$REPO"`, then append a context pointer to Decisions-so-far.
