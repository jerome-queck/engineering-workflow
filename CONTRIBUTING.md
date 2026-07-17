# Contributing

Run commands from the repository root. After cloning, bootstrap tracker labels:

```sh
node scripts/bootstrap-engineering-workflow.mjs
```

## Work tracking

- Use one GitHub Issue per independently deliverable feature, fix, or maintenance task.
- Explicitly run `/triage` only for incoming Issues you did not create. It turns raw requests into agent-ready briefs.
- Issues created by `/to-spec` or `/to-tickets` are already `ready-for-agent`; do not triage them.
- A decomposed spec is a parent planning index. Implement one unblocked child at a time, each in a fresh context.
- Keep one active implementer per Issue. Follow claim checks in the [engineering workflow](docs/agents/engineering-workflow.md) and [issue tracker guide](docs/agents/issue-tracker.md).
- For tracked work, reference the ticket as `Refs #<number>` in at least one branch commit and `Closes #<number>` in the pull request.

## Branches

Keep `main` stable and demo-ready. Create each branch from an up-to-date `main`:

```text
feature/12-streaming-chat
fix/19-login-error
docs/23-api-guide
chore/27-update-tooling
```

Default to one branch and one pull request per ticket. Do not mix unrelated work, branch from unfinished feature branches, or reuse merged branches. Merge blockers before dependants.

Every change, including documentation and repository setup, must use a branch, pull request, and configured CI. Never work or push directly on `main`.

Prototypes are different: capture them on a clearly named throwaway branch outside `main`, link that branch and its verdict from the Issue, and merge only the validated decision into production code.

## Implementation

- Test observable behavior at an agreed public seam. For agent-driven product work, follow `/tdd`.
- Work one vertical red-green slice at a time: meaningful failure, minimum passing behavior, next slice.
- Do structural cleanup during review remediation while keeping behavior tests green.
- Keep every commit focused and leave tests passing.
- Use conventional commit subjects where practical, such as `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:`.
- Run typechecking and focused tests regularly; run the full suite at completion.
- For bug fixes, state the confirmed cause in the commit or pull-request message.

### Review ordering

For product work, use this flow:

1. Claim the Issue; create its branch from current `main`.
2. Implement and verify on that branch.
3. Create a complete, green review-candidate commit with `Refs #<number>` and applicable AI trailers.
4. Run `/code-review main`. For a child, review against both child acceptance criteria and parent spec.
5. Fix findings, retest, commit, and rerun review after material changes.
6. Push; open a pull request targeting `main`.
7. Pass all configured CI and required review.
8. Squash-merge only after every gate passes.

If updating the branch causes conflicts, follow the [repository conflict adapter](docs/agents/engineering-workflow.md#resolve-merge-conflicts-safely). Preserve unrelated dirty work and stage resolved paths only.

## AI attribution

When an AI agent materially contributes, include its model-specific co-author and session trailers exactly once in local commits and in the final squash-commit message.

Codex uses its current model display name and thread ID:

```text
Co-authored-by: Codex <model> <noreply@openai.com>
Codex-Session: codex://threads/<CODEX_THREAD_ID>
```

Claude Code's generated model-specific `Co-authored-by` and `Claude-Session` trailers should be preserved. Do not invent session identifiers, duplicate automatic trailers, or attribute an agent that did not materially contribute.

## Pull requests

- Keep the pull request focused on its ticket.
- Include `Closes #<issue-number>` in the body and target `main` so GitHub closes the Issue on merge.
- Link the parent spec when the ticket is a child.
- Explain the change and list verification performed.
- Run `node scripts/validate-engineering-workflow.mjs` plus relevant tests before opening or updating the pull request.
- All configured CI checks must pass; there is no docs/setup bypass.
- If `main` advances, update the branch, resolve conflicts, then rerun affected tests and review.
- Squash-merge, ensure the squash-commit message contains each applicable AI attribution trailer exactly once, then delete the branch.
