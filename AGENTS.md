# AGENTS.md
## Mahabbah Qur'an — Multi-Agent Build Playbook

**BEFORE ANY WORK:**
Read `docs/MAHABBAH_AGENT_PROTOCOL.md` and execute its **Mandatory Cold-Start Sequence**.

It is strictly required to read and align with the following canonical documentation before modifying this project:
- `docs/PROJECT-STATE.md`
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY-BASELINE.md`

*(Note: The detailed, phase-by-phase feature roadmap that previously existed here has been migrated to the canonical `docs/ROADMAP.md`. Do not rely on stale agent instructions for feature selection. Follow the Agent Protocol).*

---

## 0. Agent Principles

1. **One approved Task ID, one controlled scope.** An agent may modify multiple architectural layers if the explicitly approved Task ID requires them. The agent must not broaden scope beyond that Task ID.
2. **Handoff is a written artifact.** An agent's output is a file (`.ts`, `.tsx`, `.md`). The next agent reads that file, not the conversation. Handoff remains available for genuine multi-agent work.
3. **Sequential, not parallel.** Within a given scope, tasks are sequential.
4. **Every agent reads `CLAUDE.md` before starting.**
5. **No agent improvises the schema.** The schema is defined formally. Any proposed change must be reviewed via a Schema Change Request before touching the DB.

---

## Schema Change Request

Any agent that identifies a gap between the current schema and the actual requirements must write a **Schema Change Request** in this format before any code is written:

```md
## Schema Change Request

**Requested by:** AGENT-{ID}
**Date:** {date}
**Table affected:** {table_name}
**Change:** {ADD COLUMN / ADD TABLE / MODIFY CONSTRAINT}
**Reason:** {why the current schema is insufficient}
**Proposed DDL:**
  ALTER TABLE ... ADD COLUMN ...;
  CREATE INDEX ...;
**Impact on existing queries:** {list affected query functions}
```

Wait for approval before applying the schema change.

---

## PR Review Checklist

Every PR is checked against `CLAUDE.md` iron rules before merge:
- [ ] follow established database access patterns for the affected domain
- [ ] do not introduce ad-hoc SQL in UI/components
- [ ] protected API routes must establish authoritative server-side authorization before protected data access/mutation
- [ ] intentional public routes must be explicitly designed as public
- [ ] use current canonical RBAC/auth helpers
- [ ] validate applicable request input with Zod
- [ ] no `"use client"` on page files unless absolutely required
- [ ] no `any` types
- [ ] Design tokens only (no arbitrary Tailwind hex outside defined tokens)
- [ ] no hardcoded secrets

---

## Handoff Protocol

When an agent completes a task, it writes a completion note in this format:

```
TASK {TASK-ID} COMPLETE
Agent: AGENT-{ID}
Files produced:
  - path/to/file1.ts
  - path/to/file2.tsx
Notes: {any deviations from spec, decisions made, things the next agent needs to know}
Blockers for next agent: {none | list what the next agent must check}
```

This note is the handoff. The next agent reads it, then reads the files, then starts their task.

---

## Error Protocol

If an agent encounters a situation where:
- The schema doesn't have a needed column
- The requirements are ambiguous about behaviour
- There is a conflict between Agent Protocol, PROJECT-STATE, ROADMAP, ARCHITECTURE, SECURITY-BASELINE, AGENTS.md, CLAUDE.md, or current repository implementation.

The agent **stops**, writes an **Issue Report**, and waits:
STOP -> REPORT -> CLASSIFY -> WAIT

```
ISSUE REPORT
Agent: AGENT-{ID}
Task: {TASK-ID}
Issue: {clear description of the conflict or gap}
Options considered:
  A) {option} — consequence: {consequence}
  B) {option} — consequence: {consequence}
Recommendation: {which option and why}
```

An agent never makes undocumented decisions that affect other agents' work.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
