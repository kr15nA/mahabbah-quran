# Mahabbah System Agent Protocol

## Core Principle

Mahabbah System is an EXISTING application.

Never treat a new session as a new project.

Repository state and canonical documentation are the source of truth.

Do not reconstruct architecture from memory when repository evidence exists.

==================================================

## Agent Instruction Precedence

Operational/task-governance precedence:

1. Explicit user-approved Task ID
2. `docs/MAHABBAH_AGENT_PROTOCOL.md`
3. `docs/PROJECT-STATE.md`
4. `docs/ROADMAP.md`
5. `docs/ARCHITECTURE.md`
6. `docs/SECURITY-BASELINE.md`
7. `AGENTS.md`
8. `CLAUDE.md` coding conventions
9. relevant task/audit docs
10. conversation/history

Important distinction:

Repository implementation, schema, migrations, and Git history remain the authoritative evidence for CURRENT technical facts.

`CLAUDE.md` may define coding conventions but must never override:
- approved task authority
- current repository facts
- canonical architecture
- security baseline
- migration safety
- git discipline

If instruction sources conflict:
STOP and report the conflict.
Do not guess.

==================================================

## Mandatory Cold-Start Sequence

Every new AI/Antigravity session MUST first:

1. Confirm repository path.

2. Run:
   ```bash
   git status
   git branch --show-current
   git log -1 --oneline
   git remote -v
   ```

3. Read:
   - `docs/PROJECT-STATE.md`
   - `docs/ROADMAP.md`
   - `docs/ARCHITECTURE.md`
   - `docs/SECURITY-BASELINE.md`

4. Read:
   - relevant `docs/audit/*` documents for the assigned Task ID.

5. Inspect existing implementation related to the assigned task.

6. Run:
   ```bash
   npx tsc --noEmit
   ```

7. Report:
   - PROJECT
   - BRANCH
   - HEAD
   - WORKING TREE
   - REMOTE STATUS
   - TYPECHECK
   - CURRENT APPROVED TASK
   - TASK STATUS
   - DEPENDENCIES
   - RELEVANT ARCHITECTURE
   - UNRELATED LOCAL CHANGES
   - RISKS / INCONSISTENCIES

8. STOP.

Do not modify anything until an explicit Task ID is approved.

==================================================

## Task Authority

An AI agent MUST NOT independently decide what feature to build next.

Task authority order:

1. Explicit user-approved Task ID
2. `docs/PROJECT-STATE.md` CURRENT APPROVED NEXT TASK
3. `docs/ROADMAP.md`

If they conflict:

STOP.

Report the conflict.

Do NOT guess which one is correct.

A roadmap item being PLANNED or PATCH_REQUIRED does NOT automatically authorize implementation.

==================================================

## Gap Discovery Rule

Agents MAY discover:

- security issues
- technical debt
- missing features
- QA gaps
- documentation inconsistencies
- architecture risks

But discovering a gap does NOT authorize implementation.

The agent must:

DISCOVER → REPORT → CLASSIFY → WAIT FOR APPROVAL

Never:

DISCOVER → IMPLEMENT AUTOMATICALLY

==================================================

## Roadmap Integrity

The Master Roadmap is append-preserving.

Rules:

- Existing task IDs must not silently disappear.
- New features are appended.
- Replaced tasks become SUPERSEDED.
- Postponed tasks become DEFERRED.
- Abandoned tasks become CANCELLED with explanation.
- Historical task registry must remain intact.
- Aggregating features under a canonical task must not erase historical IDs.

Allowed canonical statuses:

- PLANNED
- IN_ANALYSIS
- IN_PROGRESS
- IMPLEMENTED
- IN_REVIEW
- PATCH_REQUIRED
- PASS
- HARDENED
- DEFERRED
- SUPERSEDED
- CANCELLED
- UNKNOWN

Never invent another status.

==================================================

## Source of Truth Priority

When evidence conflicts, use:

1. Current repository implementation
2. Current database/schema/migrations
3. Git history
4. Canonical documentation
5. Task/audit documentation
6. Agent conversation/history

Never allow a stale chat summary to override current repository evidence.

Do not silently reconcile conflicts.

Report them.

==================================================

## Security Invariants

Every task must preserve `docs/SECURITY-BASELINE.md`.

At minimum:

- server-side authorization is authoritative
- never trust client role
- never trust client actorUserId
- never trust self-scope studentId from client
- maintain parent-child ownership
- maintain teacher/student scope
- Middleware is not the authoritative data security boundary
- public endpoints must be explicitly intentional
- never expose secrets
- never weaken RBAC merely to make a feature work

==================================================

## Database / Migration Rules

Never create or run a migration simply because schema code changed.

For schema tasks:

1. inspect current schema
2. inspect existing migrations
3. understand production/backfill state
4. define migration plan
5. test
6. only then execute approved migration

Never edit an old applied migration.

Never fabricate historical data.

Preserve historical academic integrity.

==================================================

## Git Discipline

Required rules:

- one feature/task branch when application code changes
- never force push
- never use `git add .`
- inspect git status before work
- inspect git diff before staging
- inspect git diff --cached before commit
- stage only task-scoped files
- do not merge main without explicit approval
- do not push application changes unless the task permits it

Documentation-only governance tasks may use the explicitly approved branch/workflow given by the user.

==================================================

## Task Lifecycle

Use:

BOOTSTRAP
→ ANALYZE
→ PLAN
→ IMPLEMENT
→ TYPECHECK
→ TEST
→ BUILD
→ DB/SECURITY TEST WHEN RELEVANT
→ DIFF REVIEW
→ COMMIT
→ READ-ONLY REVIEW
→ PATCH IF REQUIRED
→ PASS/HARDENED
→ UPDATE PROJECT STATE / ROADMAP

IMPLEMENTED does not mean PASS.

PASS does not automatically mean HARDENED.

==================================================

## No Architecture Reinvention

Before creating:

- new table
- new role
- new relationship
- new portal
- new audit mechanism
- new finance model
- new Hafalan/Tahsin/Tasmi structure

search for existing architecture first.

Reuse before duplication.

Examples:

Mahabbah Tahfiz must reuse:
- current identities
- Enrollment
- Teacher Assignment
- Quran Surah Master
- Hafalan
- Tahsin
- existing Tasmi module
- Parent/Guru/Santri portals

Do not create a second Tasmi subsystem.

==================================================

## Task Completion Report

Every implementation task report must contain:

- TASK ID
- BRANCH
- BASELINE COMMIT
- FILES CHANGED
- SCHEMA CHANGES
- MIGRATIONS
- AUTHORIZATION IMPACT
- BEHAVIOR CHANGES
- TESTS
- TYPECHECK
- BUILD
- DB TESTS
- SECURITY TESTS
- KNOWN LIMITATIONS
- DOCUMENTATION UPDATED
- COMMIT SHA
- PUSH STATUS

Do not claim PASS for checks that were not run.

Do not claim visual QA unless it actually occurred.

==================================================

## Canonical Document Updates

At the completion of an approved task:

`PROJECT-STATE.md`:
update current verified state and approved next task only after human review.

`ROADMAP.md`:
update the task's status/evidence/outstanding work.

`ARCHITECTURE.md`:
update only when current architecture actually changed.

`SECURITY-BASELINE.md`:
update only when an enforced security invariant changed.

Do not rewrite canonical documentation casually.

## AGENTS.md Role
- `AGENTS.md` is the repository entry point.
- It points agents to this protocol.
- It must not maintain a competing roadmap.

## CLAUDE.md Role
- `CLAUDE.md` contains implementation/coding conventions.
- It is subordinate to the canonical protocol and current repository evidence.
- It must not independently define roadmap/task authority.

## Human Review Gate
After task implementation/review:
- an agent may mark work IMPLEMENTED / IN_REVIEW as appropriate
- PASS/HARDENED must follow the task's required verification
- where PROJECT-STATE requires human approval, agent must not select the next task
- after governance task completion set:
  CURRENT APPROVED NEXT TASK: AWAITING HUMAN APPROVAL

## Conflict Handling
If AGENTS.md, CLAUDE.md, roadmap, architecture or implementation conflict:
STOP
REPORT
CLASSIFY
WAIT FOR HUMAN DECISION

Do not silently rewrite architecture.
