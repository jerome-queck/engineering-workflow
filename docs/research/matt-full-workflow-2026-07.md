# Matt Pocock engineering workflow: video + current-source analysis

Research date: 2026-07-18

Upstream source snapshot: [`mattpocock/skills@9603c1c`](https://github.com/mattpocock/skills/tree/9603c1cc8118d08bc1b3bf34cf714f62178dea3b)

Video: [“mattpocock/skills: Learn the whole flow, end-to-end”](https://www.youtube.com/watch?v=M6mYodf0dJM)

## Bottom line

Matt's core loop is:

```text
install + configure once
        |
        v
optional /ask-matt router
        |
        v
/grill-with-docs ── external fact? ──> /research ───────────┐
        |                                                   |
        ├── runnable/visual question?                       |
        |      /handoff out -> fresh /prototype ->          |
        |      /handoff findings back ----------------------┘
        |
        v
shared understanding
        |
        ├── fits one smart context ──> /implement here
        |
        └── multi-session ──> /to-spec -> /to-tickets -> clear
                                      |
                                      v
                         fresh /implement per unblocked ticket
                                      |
                                      v
                /tdd slices + checks + parallel /code-review
                                      |
                                      v
                              fix -> commit -> repeat
```

The video's five-stage slide is `grill-with-docs → to-spec → to-tickets → implement → code-review`, but the narration makes stages 2–3 conditional: skip them and implement in the current session when the work fits the remaining high-quality context. [`/implement` itself invokes `/code-review`](https://www.youtube.com/watch?v=M6mYodf0dJM&t=898s); it is not only a later pull-request ritual. [Video: flow slide, 08:23](https://www.youtube.com/watch?v=M6mYodf0dJM&t=503s), [decision fork, 10:08](https://www.youtube.com/watch?v=M6mYodf0dJM&t=608s), [recap, 16:23](https://www.youtube.com/watch?v=M6mYodf0dJM&t=983s).

The video explicitly excludes advanced/new flows, so “full workflow” below combines its demonstrated main path with the current official [`/ask-matt` router](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L11-L78). [Video: scope, 00:25](https://www.youtube.com/watch?v=M6mYodf0dJM&t=25s).

## Reconstructed main flow

### 0. Install for the collaboration model

Run `npx skills@latest add mattpocock/skills`, select Matt's official skills, choose the target agents, and prefer project scope for a team so everyone shares and can evolve the same files. Global scope is acceptable for solo use. Matt recommends symlinks where the installer offers copy vs symlink. [Video: install, 00:54](https://www.youtube.com/watch?v=M6mYodf0dJM&t=54s), [project vs global, 02:48](https://www.youtube.com/watch?v=M6mYodf0dJM&t=168s), [symlink, 03:17](https://www.youtube.com/watch?v=M6mYodf0dJM&t=197s), [current upstream quickstart](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/README.md#L25-L40).

Why: the skills are composable and mostly user-invoked, so installing the full official set adds little ambient agent context; the video measured 660 tokens in its Claude Code example. [Video: invocation/context rationale, 03:44](https://www.youtube.com/watch?v=M6mYodf0dJM&t=224s).

### 1. Configure each repository once

Invoke `/setup-matt-pocock-skills`. It discovers the repo, then configures three contracts: issue tracker, triage-label vocabulary, and domain-doc layout. The tracker may be GitHub, GitLab, local Markdown, or a described custom workflow such as Jira/Linear. Single-context domain docs are the default; multi-context is for a genuine large monorepo. It writes the agent-instruction links and `docs/agents/*.md`; `CONTEXT.md` and ADRs are later created lazily when actual terms or decisions emerge. [Video: setup, 04:34–06:51](https://www.youtube.com/watch?v=M6mYodf0dJM&t=274s), [setup source](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/setup-matt-pocock-skills/SKILL.md#L9-L61), [write contract](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/setup-matt-pocock-skills/SKILL.md#L63-L116).

The video's local-Markdown tracker is only a demo choice, not the recommended universal configuration. This repository's GitHub Issues setup is valid.

### 2. Route only when uncertain

`/ask-matt` is an optional explicit router: describe the situation, and it selects a flow. It is useful for orientation, not a mandatory delivery stage. [Video: Ask Matt, 06:52](https://www.youtube.com/watch?v=M6mYodf0dJM&t=412s), [router source](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L7-L15).

### 3. Align before building

With a codebase, start `/grill-with-docs` from even a vague change idea. It explores discoverable facts itself, then asks one decision question at a time, recommends an answer, and stops before implementation until both sides confirm shared understanding. It simultaneously runs `/domain-modeling`, capturing canonical glossary terms in `CONTEXT.md` and only genuinely hard-to-reverse, surprising trade-offs as ADRs. Without a codebase, use stateless `/grill-me`. [Video: live grill, 08:31–10:08](https://www.youtube.com/watch?v=M6mYodf0dJM&t=511s), [`grilling` source](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/productivity/grilling/SKILL.md), [`ask-matt` distinction](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L17-L21), [`domain-modeling` source](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/domain-modeling/SKILL.md).

Matt used Claude Code's normal/auto mode, not plan mode. The durable structure comes from the interview and artifacts, not a harness-specific “plan mode.” [Video: mode, 10:03](https://www.youtube.com/watch?v=M6mYodf0dJM&t=603s).

### 4. Detour only when conversation cannot answer a decision

If the open question needs executable evidence—state/business logic or a UI that must be seen—use `/handoff` to open a fresh prototype session, run `/prototype`, then hand the learned verdict back into the idea thread. The prototype is explicitly throwaway; preserve its branch and verdict as primary-source evidence, while production keeps only the validated decision. [`ask-matt` prototype bridge](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L18-L21), [`handoff` artifact](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/productivity/handoff/SKILL.md#L8-L16), [`prototype` rules](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/prototype/SKILL.md#L8-L26).

If the blocker is reading rather than running, `/research` delegates primary-source legwork to a background agent and produces a cited repo note, which feeds back into `/grill-with-docs`; it does not replace alignment. [`ask-matt` research route](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L70-L72).

### 5. Choose the context boundary

After alignment:

- If the build fits the remaining “smart zone,” invoke `/implement` immediately in the same context.
- If it needs multiple sessions, or the current session is approaching degraded attention, run `/to-spec` and `/to-tickets` before clearing.
- Keep grill → spec → tickets in one unbroken context. Start every ticket implementation fresh. Use `/handoff`, not brute force, if the session approaches its smart-zone limit before tickets exist. The current source gives ~120k only as an approximate state-of-the-art-model guide; Matt used ~140k as his personal threshold in the video's specific model. Do not turn either into a universal constant. [Video: smart-zone rationale, 10:28](https://www.youtube.com/watch?v=M6mYodf0dJM&t=628s), [`ask-matt` context rules](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L22-L32).

The auto-caption at 10:11 omits a logically necessary “not”: the surrounding explanation, the 08:23 flow, and the current source all establish that a build **not** big enough for multiple sessions skips `/to-spec` and `/to-tickets`.

### 6. Compress the destination into a spec

`/to-spec` does not re-interview. It synthesizes the full conversation into the durable destination: problem, solution, extensive user stories, implementation decisions, testing decisions/seams, out of scope, and notes. It confirms test seams with the user, publishes one `ready-for-agent` issue, and needs no triage. The video describes this as compressing 46.1k tokens into the document later sessions compare against. [Video: spec, 11:18–12:19](https://www.youtube.com/watch?v=M6mYodf0dJM&t=678s), [`to-spec` source](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-spec/SKILL.md#L7-L19), [spec template](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-spec/SKILL.md#L21-L75).

The distinction is explicit: **spec = where the sprint ends; tickets = how it gets there**. [Video: 11:41](https://www.youtube.com/watch?v=M6mYodf0dJM&t=701s).

### 7. Split the route into context-sized tracer bullets

Still in the same session, `/to-tickets` drafts narrow, complete, demonstrable vertical slices. Each fits one fresh context and declares blockers; the human reviews granularity and dependencies, merging or splitting as needed. Publish each as `ready-for-agent`, then work the unblocked frontier. Generated tickets are already agent-ready and must not go through `/triage`. [Video: tickets, 12:20–13:51](https://www.youtube.com/watch?v=M6mYodf0dJM&t=740s), [`to-tickets` slice rules](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-tickets/SKILL.md#L25-L40), [human quiz](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-tickets/SKILL.md#L42-L56), [publishing/frontier](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-tickets/SKILL.md#L58-L67).

Wide mechanical refactors are the exception: use expand → migration batches → contract, with explicit blockers, rather than forcing a vertical slice that cannot stay green. [`to-tickets` wide-refactor rule](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-tickets/SKILL.md#L38-L40).

### 8. Implement one frontier ticket per fresh context

Clear after ticket generation. In a new session, reference one ticket and invoke `/implement`; do not ask one session to implement the whole backlog. Matt allows another ticket only if the session remains comfortably inside the smart zone, but recommends clearing between every ticket. [`/implement` runs TDD where possible at agreed seams, typechecks and focused tests regularly, the full suite once, then review and commit](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/implement/SKILL.md#L7-L15). [Video: implementation loop, 13:51–14:46](https://www.youtube.com/watch?v=M6mYodf0dJM&t=831s), [`to-tickets` closeout](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-tickets/SKILL.md#L105-L107).

TDD means one behavior through a public seam: red test → minimum green implementation → next vertical slice. The current skill moves refactoring to review rather than treating it as a third step inside each implementation cycle. [`tdd` source](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/tdd/SKILL.md).

### 9. Review independently on two axes

`/implement` closes with `/code-review`. Two fresh subagents run in parallel:

1. **Standards**: repository rules plus a judgement-only Fowler smell baseline.
2. **Spec**: missing/partial requirements, scope creep, and wrongly implemented requirements.

They stay separate because a change can satisfy one axis and fail the other. Fresh agents reduce author self-approval bias. Fix valid findings, rerun material checks/review, then commit. [Video: review mechanics and rationale, 14:46–16:22](https://www.youtube.com/watch?v=M6mYodf0dJM&t=886s), [`code-review` axes](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/code-review/SKILL.md#L6-L13), [parallel prompts](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/code-review/SKILL.md#L58-L80).

For a real multi-ticket sprint, the video also describes a final whole-spec check after all ticket implementations. Treat that as a parent-spec reconciliation in addition to per-ticket reviews. [Video: final check, 14:41](https://www.youtube.com/watch?v=M6mYodf0dJM&t=881s).

### 10. Deliver through the repository's own branch/PR policy

The video stops after the local branch commit; it does not prescribe push, pull-request, merge, issue-closing, or attribution policy. This repository should retain its stronger branch/PR closeout rules in [`CONTRIBUTING.md`](../../CONTRIBUTING.md). [Video: commit and recap, 16:20](https://www.youtube.com/watch?v=M6mYodf0dJM&t=980s).

## Artifacts and handoffs

| Stage | Durable artifact | Consumer |
| --- | --- | --- |
| Setup | `AGENTS.md`/`CLAUDE.md` links; `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md` | Every engineering skill |
| Grilling/domain modeling | `CONTEXT.md` glossary; sparse ADRs | Spec, tickets, code/test names, review |
| Research | One cited Markdown note in the repo | Grilling/specification |
| Cross-session handoff | Redacted temporary-OS Markdown file; references existing artifacts instead of duplicating them | Fresh session |
| Prototype | Throwaway branch + issue pointer + verdict | Original idea/spec; prototype code stays off `main` |
| Spec | One `ready-for-agent` tracker issue | Ticket decomposition; final Spec review |
| Tickets | One issue per vertical slice with acceptance criteria and blocking edges | Fresh `/implement` sessions |
| Implementation | Behavior tests, production code, checks, focused commits | Code review and PR |
| Code review | Separate Standards and Spec reports | Fix loop and merge decision |

Sources: [setup](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/setup-matt-pocock-skills/SKILL.md), [domain modeling](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/domain-modeling/SKILL.md), [handoff](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/productivity/handoff/SKILL.md), [prototype](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/prototype/SKILL.md), [spec](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-spec/SKILL.md), [tickets](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/to-tickets/SKILL.md), [review](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/code-review/SKILL.md).

## Current-source branches beyond the video's main path

These are official current routes, but the video intentionally does not teach them:

- Raw incoming issues/requests → `/triage` → agent-ready issue → `/implement`. Never triage `/to-tickets` output.
- Hard bug/regression → `/diagnosing-bugs`; establish one red reproduction command before theorizing, then regression-test the fix. If the real problem is no testable seam, hand off to `/improve-codebase-architecture`.
- Huge, foggy effort whose decisions cannot fit one session → `/wayfinder`; resolve decision tickets, then collapse the map through `/to-spec`. Do **not** use wayfinder merely because implementation spans sessions.
- Codebase-health scan → `/improve-codebase-architecture`; a selected opportunity becomes an idea entering `/grill-with-docs`.
- Domain vocabulary → `/domain-modeling`; code/module-shape vocabulary → `/codebase-design`.
- In-progress merge/rebase conflict → new model-invoked `/resolving-merge-conflicts`; trace both intents to issues/PRs/commits, resolve every hunk, run checks, and finish rather than abort.

Sources: [`ask-matt` on-ramps and layers](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/ask-matt/SKILL.md#L34-L74), [`resolving-merge-conflicts`](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/resolving-merge-conflicts/SKILL.md).

## Fit against this repository

Already aligned:

- Project-local `.agents/skills` with `.claude/skills` symlinks matches Matt's team recommendation.
- `AGENTS.md` plus `docs/agents/domain.md` correctly configure a single context.
- `CONTRIBUTING.md` already says generated tickets skip triage, work the unblocked frontier, and start each ticket in fresh context.
- The repository adds useful production closeout absent from the video: branch, PR, tests, squash merge, issue closure, and AI attribution.

Gaps or misleading emphasis in the pre-refresh [`README.md`](../../README.md), [`CONTRIBUTING.md`](../../CONTRIBUTING.md), and live GitHub setup:

1. **The issue-tracker target is unsafe.** A live `gh repo view` resolves this checkout to `jerome-queck/openai-build-week`, although `main` tracks `origin = jerome-queck/engineering-workflow`. [`docs/agents/issue-tracker.md`](../agents/issue-tracker.md) says `gh` will infer the repo and every command omits `--repo`. The intended repo also lacks `needs-triage`, `needs-info`, `ready-for-agent`, and `ready-for-human`; those configured labels exist on the wrongly resolved upstream repo.
2. The map visually makes `/to-spec → /to-tickets` look universal. They are only the multi-session branch; the normal small-work fast path is grill → implement in the same session.
3. `/research` and `/prototype` look like alternative start paths. Research should feed facts back into grilling; prototype should be a `/handoff`-bridged fresh-session detour that returns a verdict.
4. “Large multi-session work → `/wayfinder`” is too broad. Multi-session but understood work uses spec/tickets; wayfinder is for a huge **foggy decision space**.
5. `/diagnosing-bugs` appears under `/implement`; current `/ask-matt` treats it as a hard-bug on-ramp that creates the evidence and fix route.
6. Context hygiene is missing: one unbroken grill/spec/tickets context, fresh implementation context per ticket, `/handoff` near degradation, no mid-phase compact.
7. The map places `/code-review` only after push/PR. Matt's demonstrated and current `/implement` contract invokes it before the implementation commit; PR review may still be an additional repository gate.
8. The newly official `/resolving-merge-conflicts` skill is absent from the guide and conflict path.
9. Artifact contracts are implicit. Readers cannot see which state survives each cleared context.
10. The new conflict skill says “never `--abort`” and “stage everything.” Without local dirty-tree and staging guards, that can absorb unrelated work or force a resolution when intent is unavailable.

## Recommended edits

### P0 — correct the executable path

1. Resolve GitHub operations from the clone's `origin` push URL, set that as the `gh` default, and pass the resolved repository explicitly. For this checkout, verify that resolution is `jerome-queck/engineering-workflow`, then provision the four missing workflow labels there before any skill writes an issue.
2. Replace the current workflow map's middle with the branch shown in “Bottom line.” Keep the readable text diagram; no dense Mermaid.
3. Add a short **Context boundaries** section with the exact rules: keep grill/spec/tickets together; direct-implement small work; clear before each multi-ticket implementation; hand off near the model-dependent smart-zone edge.
4. Move `code-review` inside `implement` in the main map, then retain a separate PR/merge gate as this repository's extension.
5. Add the research feedback loop and the bidirectional handoff/prototype loop.

### P1 — make artifacts and exceptional routes explicit

6. Add the artifact table, especially spec-as-destination, tickets-as-route, temporary handoff file, and prototype branch/verdict.
7. Clarify `/grill-with-docs` (codebase/stateful) vs `/grill-me` (no codebase/stateless), `/to-spec` (multi-session understood build) vs `/wayfinder` (foggy decision map), and `/triage` (external raw issues only).
8. Add `/resolving-merge-conflicts` to the complete skill guide and reference it from `CONTRIBUTING.md` when branches diverge. Add local guards: confirm operation and intent, preserve unrelated changes, stage resolved paths only, require zero unmerged paths, and distinguish a merge commit from `rebase --continue`.
9. Add a final parent-spec reconciliation after the last ticket, while retaining the per-ticket review inside every `/implement`.

### P1 — resolve an upstream sequencing contradiction before rewriting policy

The video and [`implement`](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/implement/SKILL.md#L13-L15) say review then commit. But [`code-review`](https://github.com/mattpocock/skills/blob/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/code-review/SKILL.md#L17-L23) requires `git diff <fixed-point>...HEAD` and a non-empty committed diff; that command excludes purely uncommitted work. Current `CONTRIBUTING.md`'s commit-before-review order is therefore executable but diverges from the stated Matt flow.

Recommended local resolution: document an **implementation checkpoint commit → `/code-review main` → fix/review commits → push/PR** sequence, or downstream-patch `code-review` to include staged/worktree changes. Do not merely change prose to “review before commit” while its diff command cannot see the work. This is a source-level inconsistency, not an inference about preferred style.

### P2 — distinguish Matt's core from local production policy

10. Label push/PR/squash/issue closure/attribution as this repository's delivery extension. The video ends at commit; keeping the extension is correct.
11. Add a compact **Install/refresh** note. Pin the verified CLI for reproducible updates (`npx --yes skills@1.5.19 update --project --yes`), list upstream inventory separately, and explicitly install newly promoted skills: `update` refreshes only already-locked names. Validate directories, symlinks, hashes, invocation modes, local links, and the guide's full inventory against `skills-lock.json` after every refresh.
12. Enforce the written delivery policy: add CI for the validation above and protect `main`. The live GitHub repository currently has neither a ruleset nor branch protection.

## Upstream documentation defects worth not copying

- Current `/ask-matt` says “two on-ramps” but lists three: triage, hard-bug diagnosis, and wayfinder. Model the actual three routes.
- Do not hard-code a smart-zone token count. The current source says ~120k; the video speaker uses ~140k for one specific model/harness. Treat degradation as model-dependent.
- Resolve the review/commit diff contradiction above explicitly.
