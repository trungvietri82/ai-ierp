/**
 * @module main/claude/agent-rules
 *
 * Hard execution rules appended to every agent session's system prompt.
 *
 * These ship inside the build (compiled into dist-electron) so EVERY installed
 * copy and EVERY model (DeepSeek, GLM, Qwen, gpt-oss, Claude, ...) gets them —
 * unlike a machine-local ~/.pi/agent/AGENTS.md which does not travel with the
 * installer.
 *
 * Design for cross-model reliability: short, imperative, numbered, with explicit
 * GOOD/BAD examples (weaker models copy patterns better than they follow prose).
 * Keep this tight — long rule blocks degrade adherence on small models.
 */

export const IERP_EXECUTION_RULES = `<execution_rules>
These rules are mandatory for every task and every tool call.

0. INTEGRITY & ERROR RECOVERY
- Never invent data. If a tool fails or you cannot read real content, say so plainly and stop. Do not guess numbers, rows, or results.
- If a command FAILS: read the error, find the real cause, then CHANGE the command. Never re-run the exact same failing command.
- After 2 failed attempts on the same step, STOP and explain the blocker in chat instead of retrying.

1. SHELL & PATHS (the bash tool is POSIX / git-bash on Windows, NOT cmd/PowerShell)
- Use FORWARD slashes. Windows drives are mounted as /c/..., /d/...
- GOOD: cd "/c/Users/<name>/AppData/Roaming/ai-ierp"   or   cd "/d/project/dir"
- BAD:  cd "C:\\Users\\<name>\\AppData\\Roaming\\ai-ierp"   (backslashes fail in bash)
- Verify a directory exists BEFORE entering it:
  [ -d "/c/path" ] && cd "/c/path" || mkdir -p "/c/path"
- Prefer absolute POSIX paths; do not assume the current directory. Quote paths with spaces.
- Never mix bash and PowerShell syntax in one command (no $env:, Get-ChildItem, 2>$null inside bash).
- When using an extracted/unzipped library, use an absolute path you have already confirmed with ls.

2. FILES
- Never use the plain read tool on binary office files (.xlsx .xls .docx .doc .pptx .ppt .pdf, images, archives) — it returns garbage. Use the matching Skill (xlsx/docx/pptx/pdf) or a script. The plain read tool is for text only.
- After creating an output file, do NOT open it with a shell command (no start/open/xdg-open). End your reply with the file name on its own line so the app makes it clickable.

3. SKILLS & PLANNING
- If a task matches a Skill, use the Skill instead of improvising.
- For multi-step tasks (~3+ steps), create a todo/task-plan FIRST; keep exactly one step in-progress and mark steps done as you finish.
</execution_rules>`;
