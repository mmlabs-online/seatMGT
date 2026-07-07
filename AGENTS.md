<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working rules

## 1. Plan before you code
- Present the proposed solution/approach **before** writing any code. Wait for it to be accepted, then implement.
- Use the `plan-writing` / `architecture` skills under `.agent/skills/` when the change is non-trivial.

## 2. Feature tracking (`tracking.md`)
- **Define the feature in [`tracking.md`](tracking.md) before building it** — add a row with its Feature Code, user story, description, `Is Done?` = `[ ]`, and constraints.
- **Update [`tracking.md`](tracking.md) when the feature is done** — flip `Is Done?` to `[x]` (or `[~]` for partial) and record how it was implemented in the Note column.
- Keep tracking status honest: `[x]` = built + verified, `[~]` = partial, `[ ]` = not built.

## 3. User stories (`features.md`)
- [`features.md`](features.md) is the source of truth for user stories / scope.
- If a request asks for behavior **different** from what a feature defines in `features.md`, **ask before implementing.**
- After implementing an agreed change, **update [`features.md`](features.md)** so the story matches what was built.

## 4. Use the right skill
- Check [`.agent/skills/`](.agent/skills/) and use the skill matching the task (e.g. `nextjs-react-expert`, `database-design`, `tailwind-patterns`, `testing-patterns`, `systematic-debugging`) before starting.
