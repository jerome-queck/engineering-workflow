# Engineering Workflow

A portable, issue-driven workflow for humans and coding agents. It turns an uncertain idea into shared decisions, context-sized tickets, tested changes, independent review, and a squash-merged pull request while keeping `main` stable.

## Adopt or retrofit it

Use `origin` for the repository being changed. Reserve `upstream` for the template or source repository you pull workflow updates from. Never let a bare `gh` command infer between them.

For a new project, create it from this template and point `origin` at the new GitHub repository. For an existing project, copy or merge the workflow files into its root without replacing product-specific instructions. Then run:

```sh
git remote -v
node scripts/bootstrap-engineering-workflow.mjs
node scripts/validate-engineering-workflow.mjs
node scripts/validate-engineering-workflow.mjs --github
```

Bootstrap resolves the target from `origin` and configures labels and merge settings. It audits but never writes branch protection, so existing repository policy cannot be overwritten. If protection is missing, let `workflow-integrity` run once, then add a classic default-branch rule in GitHub **Settings → Branches**: require pull requests, strict `workflow-integrity`, linear history, and conversation resolution; block force pushes and deletion; leave administrator enforcement off for emergency bypass. Re-run bootstrap and `--github` afterward.

Offline validation checks the portable files; `--github` additionally audits live routing and repository policy. Both commands remain owner-, repository-, and filesystem-path independent. Re-run validation after every workflow or skill update.

## Full workflow

```text
SET UP EACH REPOSITORY ONCE
  install project-scoped skills -> /setup-matt-pocock-skills
  bootstrap GitHub settings     -> validate the workflow
                              |
                              v
ROUTE ONLY WHEN UNSURE
  optional /ask-matt ---------> choose the fitting entry point
                              |
                              v
ALIGN IN ONE CONTINUOUS PLANNING CONTEXT
  product idea -> /grill-with-docs
       |
       |-- missing external fact -> /research -------------------|
       |                                                        |
       |-- runnable or visual uncertainty                       |
       |     /handoff out -> fresh /prototype -> /handoff back -|
       |                                                        |
       `-----------------> shared understanding <---------------'
                              |
              +---------------+----------------+
              |                                |
              v                                v
  FITS ONE HEALTHY CONTEXT          NEEDS MULTIPLE SESSIONS
  concise ready Issue               /to-spec -> parent Issue
  /implement here                   /to-tickets -> blocked children
                                               -> clear context
                                                    |
                                                    v
                                      fresh /implement per
                                      unblocked child Issue
              |                                |
              +---------------+----------------+
                              v
IMPLEMENT AND REVIEW THE CURRENT ISSUE
  agree public seam -> /tdd: one red test -> minimum green behavior
       -> repeat vertical slices -> focused checks -> full verification
       -> complete green review-candidate commit
       -> /code-review main in parallel:
            Standards axis + Spec axis (child plus parent when present)
       -> valid finding? fix -> test -> commit -> re-review --------|
       <------------------------------------------------------------'
                              |
                              v
DELIVER THROUGH THE REPOSITORY OUTER LOOP
  push branch -> pull request -> required CI -> squash merge
       -> close child/standalone Issue -> delete branch
                              |
                              v
  more children? -> fresh /implement context for next unblocked child
  final child?   -> verify integrated main against the parent spec
                 -> record evidence -> close parent only when complete
```

`/to-spec` and `/to-tickets` are conditional, not ceremony for small work. Keep grilling, specification, and ticket decomposition in one context. If that context starts losing decisions, use `/handoff` and continue cleanly; do not compact mid-phase. After decomposition, each implementation child starts fresh from its durable artifacts.

The installed `/code-review` compares committed `HEAD` with a fixed point. Therefore this repository deliberately uses a complete, green local review-candidate commit before `/code-review main`. Review remains pre-publication: remediate and re-review before pushing the branch.

## Side routes

```text
raw external issue/request -> /triage -> ready Issue -> /implement
hard bug or regression     -> /diagnosing-bugs -> tested fix
missing testable seam      -> /improve-codebase-architecture
selected architecture idea -> /grill-with-docs -> main flow
domain words/decisions     -> /domain-modeling
module boundary or seam    -> /codebase-design
merge or rebase conflict   -> /resolving-merge-conflicts -> checks -> continue
no-codebase plan           -> /grill-me
huge foggy decision space  -> opt-in /wayfinder -> /to-spec when map clears
```

Wayfinder is for work whose decision space cannot fit one planning session, not merely a known build that needs several implementation sessions. It stays opt-in. `/triage` is only for incoming work; specs and tickets created deliberately are already agent-ready.

During conflict resolution, preserve unrelated dirty changes, stage resolved paths only, require zero unmerged paths, and finish with the operation-specific command (`git commit` for a merge, `git rebase --continue` for a rebase). Pause when intent cannot be recovered; never absorb unrelated work just to finish.

## Durable artifacts and context boundaries

| Stage | Durable result | Next consumer |
| --- | --- | --- |
| Setup | Agent instructions, tracker/label/domain adapters | Every engineering skill |
| Grilling | Shared vocabulary and only warranted ADRs | Spec, tickets, implementation |
| Research | Cited primary-source note | Original planning context |
| Prototype | Throwaway branch, verdict, and handoff | Original planning context |
| Specification | Parent Issue describing the destination | Tickets and final reconciliation |
| Ticketing | Context-sized vertical slices with blocking edges | Fresh implementation contexts |
| Implementation | Behavior tests, code, checks, focused commits | Independent review and PR |
| Review | Separate Standards and Spec reports | Remediation and merge decision |

## Complete 22-skill guide

**Explicit** skills run only when requested. **Automatic** skills may be selected when their trigger matches.

| Skill | Invocation | Purpose |
| --- | --- | --- |
| `/setup-matt-pocock-skills` | Explicit | Configure the issue tracker, label vocabulary, and domain-document layout. |
| `/ask-matt` | Explicit | Select the right skill or flow when the next move is unclear. |
| `/grill-with-docs` | Explicit | Align on a codebase change while preserving vocabulary and decisions. |
| `/grill-me` | Explicit | Sharpen a plan or design that has no codebase or durable project docs. |
| `/grilling` | Automatic | Run the one-question-at-a-time interview primitive. |
| `/research` | Automatic | Gather primary-source facts into a cited repository note. |
| `/handoff` | Explicit | Carry compact context into a fresh session or prototype detour. |
| `/prototype` | Automatic | Build throwaway evidence for one runnable or visual question. |
| `/to-spec` | Explicit | Synthesize agreed multi-session work into a parent specification. |
| `/to-tickets` | Explicit | Split a plan into blocked, context-sized tracer-bullet Issues. |
| `/implement` | Explicit | Execute one approved Issue through tests, checks, review, and commits. |
| `/tdd` | Automatic | Build behavior in vertical red-green slices at agreed public seams. |
| `/code-review` | Automatic | Review a committed diff independently against standards and specification. |
| `/triage` | Explicit | Turn an incoming raw Issue or external PR into an agent-ready brief. |
| `/diagnosing-bugs` | Automatic | Establish a tight failing loop, find cause, and protect the fix with a regression test. |
| `/resolving-merge-conflicts` | Automatic | Reconcile an active merge/rebase from primary intent and rerun checks. |
| `/wayfinder` | Explicit | Resolve a huge foggy effort through linked decision tickets before specification. |
| `/improve-codebase-architecture` | Explicit | Find deepening opportunities and feed a selected idea into the main flow. |
| `/domain-modeling` | Automatic | Maintain precise domain language, context docs, and warranted ADRs. |
| `/codebase-design` | Automatic | Design deep modules, narrow interfaces, seams, and testable boundaries. |
| `/teach` | Explicit | Learn a concept with the repository as persistent context. |
| `/writing-great-skills` | Explicit | Create or revise predictable, well-triggered skills. |

## Delivery policy

1. Record each independently deliverable change as one ready Issue; decompose a multi-session spec into child Issues.
2. Claim one unblocked Issue, update `main`, and create its branch. Never implement tracked work directly on `main`.
3. Use behavior-first tests, focused verification, and conventional commits where practical.
4. Create a complete green review-candidate commit with `Refs #<issue>` and required attribution.
5. Run `/code-review main`; fix valid Standards and Spec findings, retest, commit, and re-review material changes.
6. Push only after local review passes. Open a focused pull request with `Closes #<issue>`.
7. Merge only through a pull request after required CI passes. No direct-to-`main` exception.
8. Squash-merge, preserve attribution once, and delete the branch.
9. After the final child, update `main`, verify the integrated parent acceptance criteria, record results, and close the parent. Keep it open and add a child if any gap remains.

## Repository guide

- [`AGENTS.md`](AGENTS.md) — agent entrypoint and attribution rules.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — branch, implementation, review, and merge policy.
- [`docs/agents/engineering-workflow.md`](docs/agents/engineering-workflow.md) — detailed gates, adapters, and maintenance procedure.
- [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) — target-safe GitHub operations, dependencies, claiming, and parent closure.
- [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) — canonical issue-state vocabulary.
- [`docs/agents/domain.md`](docs/agents/domain.md) — context and ADR conventions.
- [`docs/research/matt-full-workflow-2026-07.md`](docs/research/matt-full-workflow-2026-07.md) — video and pinned-source analysis behind this adaptation.
