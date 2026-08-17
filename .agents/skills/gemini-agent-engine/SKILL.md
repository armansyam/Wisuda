---
name: gemini-agent-engine
description: Disciplined Gemini agent protocol for Wisuda project. Enforces source-first investigation, minimal verified changes, evidence-based reports, and browser use only for runtime UI validation.
---

# 🤖 Gemini Agent Engine — Wisuda Project Protocol

**Purpose:** Make Gemini agents produce reliable, minimal, verified code changes for the Wisuda platform (Node/Express + SQLite + Vue/Vite admin).

---

## 1. CORE RULES — Non-Negotiable

| Rule | Description |
|------|-------------|
| **Source of Truth** | Only actual source code, test results, and tool output are facts. Documentation, prior reports, and user assumptions are *evidence to verify*, not facts to repeat. |
| **No False Claims** | Never claim "fixed", "secure", "tested", "built", "deployed", or "working" unless a tool result in *this* task proves it. |
| **No Fabrication** | Do not fabricate file contents, command output, test results, line numbers, browser behavior, API behavior, or completed edits. |
| **Read Before Write** | Before editing any file, read the relevant implementation and its direct callers, consumers, tests, and configuration. |
| **Minimal Change** | Prefer the smallest correct change: delete dead code instead of adding wrappers; use stdlib before new deps; follow existing patterns; no refactoring unrelated code. |
| **Preserve Behavior** | Preserve existing behavior unless the requested change explicitly changes it. |
| **Untrusted Input** | Treat all external input as untrusted. For public endpoints, inspect: auth, authorization, ownership checks, input validation, sensitive response fields, IDOR exposure, error handling, state transitions. |

---

## 2. REQUIRED EXECUTION PROTOCOL

Follow this exact order. Do not skip steps silently.

### DISCOVER
- Restate the task as an observable outcome.
- Identify relevant files using repository search (`grep`, `find`).
- Read the actual code before reaching a conclusion.
- State uncertainties explicitly if evidence is missing.

### ANALYZE
- Trace data flow from input to output.
- Identify the smallest safe change.
- For bugs: identify the root cause, not only the visible symptom.
- For security issues: consider attacker-controlled inputs and chained impact.

### PLAN
- For non-trivial work, list:
  1. Files to change
  2. Intended behavior
  3. Verification command or scenario
  4. Risks or assumptions
- Do not write code until this plan is internally consistent.

### IMPLEMENT
- Edit only files justified by the analysis.
- Keep diffs narrow.
- Do not overwrite an existing file without reading it first.
- Do not add dependencies unless existing platform/project dependencies cannot solve it.

### VERIFY
- Run the narrowest relevant check first.
- Then run applicable test, lint, typecheck, and build commands.
- If a check fails, report the exact failure and either fix it or stop.
- A passing build does not prove application behavior. Use focused tests where needed.

### REPORT
Report only:
- Root cause or requested outcome
- Files changed
- Checks run and their result
- Remaining limitation or unverified behavior

**Use this status vocabulary precisely:**
- `VERIFIED` — a tool result proves the claim
- `IMPLEMENTED, NOT VERIFIED` — code changed but verification could not run
- `NOT IMPLEMENTED` — no source change was made
- `BLOCKED` — required evidence, access, or approval is missing

---

## 3. BROWSER-USE POLICY

**Do not use the browser to understand backend logic, security controls, database behavior, or non-UI refactors.** Read source code and run focused tests.

Use browser automation **only** when the requested outcome requires runtime browser evidence:
- Layout, responsive behavior, overflow, layering, typography, or visual state
- Click, keyboard, focus, redirect, form submission, loading/error state
- Browser-specific request behavior
- Animation or transition behavior

**A screenshot is visual documentation, not proof of interaction correctness.**

Before browser use, state:
1. The UI behavior being verified
2. The trigger
3. The expected initial state
4. The expected final state

For animation, verify:
- Initial DOM/class/style state
- Trigger action
- State during or immediately after triggering (when tool support allows)
- Final state after transition
- Console errors
- Reduced-motion behavior when relevant

**Do not claim an animation works from a single screenshot.**
If the browser tool only supports screenshots, report:
> "Static rendering verified; interaction/animation behavior remains unverified."

---

## 4. REPORT FORMAT — Evidence Only

Every task response must use this format. No narrative fluff.

```markdown
## Discovery
- Goal: [observable outcome]
- Files inspected: [paths with line ranges]
- Evidence: [code excerpts, query results, trace summary]
- Assumptions: [explicit, testable]

## Plan
1. [file: change description]
2. [file: change description]
- Verification: [command + expected result]

## Result
- Root cause: [one sentence with file:line]
- Changed: [file:line before → after]
- Checks: [command — exit code, summary]
- Status: [VERIFIED | IMPLEMENTED, NOT VERIFIED | NOT IMPLEMENTED | BLOCKED]
- Unverified: [what was not checked and why]
```

**Forbidden phrases in reports:**
- "successfully fixed", "all tests pass", "security hardened", "comprehensive audit", "everything works"
- Any claim without a tool result citation

---

## 5. WISUDA-SPECIFIC CONTEXT

### Tech Stack
- **Backend:** Node.js + Express + `better-sqlite3` (sync SQLite)
- **Frontend:** Vue 3 + Vite SPA → builds to `public/admin/`
- **Static Pages:** `public/index.html`, `tracking.html`, `select-photos.html`, `freelance.html`, `portfolio.html`
- **Database:** `DATA/wisuda.db` — tables: `bookings`, `users`, `freelancers`, `inquiries`, `payments`, `portfolio`, `email_templates`, `settings`
- **Auth:** Session (admin), JWT Bearer (API), `tracking_token` (client portal), `session_token` (freelance portal)
- **Payments:** iPaymu QRIS webhook (signature verified), manual transfer (admin verification)
- **Email:** Nodemailer SMTP, templates in DB, `escapeHtml()` sanitizer
- **Ports:** 8081 (dev/prod)

### Key Files to Know
| Area | Files |
|------|-------|
| Routes | `src/routes/public.js`, `src/routes/selection.js`, `src/routes/moodboard.js`, `src/routes/freelance-portal.js`, `src/routes/fg.js`, `src/routes/admin/bookings.js`, `src/routes/admin/payroll.js` |
| Config | `src/config/database.js`, `src/middleware/auth.js` |
| Services | `src/services/email.service.js`, `src/services/cron.service.js` |
| Frontend | `public/tracking.html`, `public/select-photos.html`, `public/freelance.html`, `admin-app/src/views/` |
| Build | `npm run build` (admin), `npm test` |

### Audit Protocol (Mandatory)
- **AUDIT/** — Server (Hermes) writes read-only audit reports. Developer **never** edits these.
- **MAINTENANCE_AUDIT/** — Developer writes response report *after* verified fix: `RESPON_YYYY-MM-DD_<TOPIC>.md`
- **Two-way governance:** Server audits → Developer fixes → Developer publishes response → Server re-audits.

---

## 6. TOOL CONTRACT — What the Agent Must Expect

The harness provides these tools with strict contracts:

| Tool | Contract |
|------|----------|
| `searchCode(query, path?, maxResults?)` | Returns `[{path, line, excerpt}]` — exact matches only |
| `readFile(path, startLine?, endLine?)` | Returns `{path, content, totalLines}` — fails if not read first |
| `applyPatch(path, oldText, newText)` | Returns `{changed, error?}` — fails if `oldText` not unique or file not read |
| `runProjectCheck(kind, scope?)` | `kind ∈ {test, lint, typecheck, build}` — returns `{exitCode, summary, failedFiles, outputTail}` |
| `browserCheck(scenario, actions[])` | Actions: `navigate`, `click`, `type`, `waitFor`, `inspect`, `screenshot` — returns `{consoleErrors, assertions[], screenshots[]}` |

**Agent MUST call `readFile` before `applyPatch` on the same file in a task.** The tool enforces this.

---

## 7. VERIFIER ROLE (For High-Risk Changes)

For security patches, payment flows, auth/session, DB migrations, or wide refactors:

1. Implementer completes IMPLEMENT + VERIFY
2. A second pass (same model, different prompt) runs **VERIFIER**:

```text
You are a skeptical code reviewer. Do not assume the implementation is correct.
Read the requested behavior, the changed diff, relevant call sites, and tests.
For each claimed fix:
  1. Try to find an input or state that still fails.
  2. Check whether authorization, validation, error paths, and compatibility changed.
  3. Confirm whether tests prove the claim or only compile the code.
  4. Return only verified defects. If no defect is found, say:
     "No verified defect found; this is not proof of absence."
Do not edit files. Cite exact file paths and line numbers.
```

Only `VERIFIED` findings from the verifier upgrade the status to `VERIFIED`.

---

## 8. SUB-AGENT USE — Only When Justified

| Need | Approach |
|------|----------|
| Bug on one flow | Single agent |
| Refactor 2–5 related files | Single agent |
| Wide security audit | Multiple read-only agents per area + one verifier |
| Many independent files | Sub-agent per area, each with own test |
| Architectural decision | Multiple proposals, one chooser with evidence |
| Parallel edits | Avoid unless worktree isolation exists |

**Never** let multiple sub-agents edit the same file.

---

## 9. INTEGRATION WITH WORKSPACE

### Add to `.agents/SKILLS.md`
```markdown
### 🤖 Gemini Agent Engine
- **Path:** `.agents/skills/gemini-agent-engine/SKILL.md`
- **Kegunaan:** Protokol disiplin untuk agent Gemini: investigasi source-first, perubahan minimal terverifikasi, laporan berbasis bukti, browser hanya untuk validasi runtime UI.
```

### Activate in Task
When starting a coding task, include in the prompt:
> **Protocol:** Follow `.agents/skills/gemini-agent-engine/SKILL.md` strictly. Output only the Discovery/Plan/Result format. No narrative.

---

## 10. SELF-CORRECTION CHECKLIST (Before Final Report)

- [ ] Every claim has a tool result citation (file:line, command output, test result)
- [ ] No forbidden phrases used
- [ ] Browser used only for runtime UI validation with explicit scenario
- [ ] Minimal diff — no unrelated refactoring
- [ ] Existing patterns followed (naming, structure, error handling)
- [ ] Status vocabulary used precisely
- [ ] Unverified items explicitly listed
- [ ] For high-risk: verifier pass completed

---

*Skill version: 1.0.0 — Wisuda Project*