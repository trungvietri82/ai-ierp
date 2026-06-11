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

/**
 * Targeted rules for the pptx skill's html2pptx workflow.
 *
 * The default flow fails on this app because node/npm are NOT on PATH, the
 * required global deps + Playwright browser are not pre-installed, and Windows
 * has no bundled python. These rules give the exact working sequence.
 */
export const IERP_PPTX_RULES = `<powerpoint_html2pptx>
When CREATING a PowerPoint via the pptx skill (html2pptx), this exact setup is required or it fails:

1. node / npm / npx are NOT on PATH. Use the bundled absolute paths from <bundled_executables>. Resolve the tools once:
   NODE="<node path from bundled_executables>"
   BIN="$(dirname "$NODE")"      # this dir also holds npm.cmd and npx.cmd (Windows) / npm and npx (mac/linux)
2. Find the skill folder (it ships html2pptx.tgz). Packaged: it is under <resources>/skills/pptx. If unsure, locate it:
   SKILL="$(dirname "$(find / -name html2pptx.tgz 2>/dev/null | head -1)")"
3. Install the required global deps ONCE (needs internet). Skip any already installed; never reinstall in a loop:
   "$BIN/npm.cmd" install -g pptxgenjs playwright react-icons react react-dom    # drop .cmd on mac/linux
   "$BIN/npx.cmd" playwright install chromium
4. Extract the library next to your build script using the confirmed absolute path:
   mkdir -p ./html2pptx && tar -xzf "$SKILL/html2pptx.tgz" -C ./html2pptx
5. Run the build script so require() can find the global deps:
   NODE_PATH="$("$BIN/npm.cmd" root -g)" "$NODE" your-script.js 2>&1
6. Windows has NO bundled python: do NOT call python3 / markitdown for create-from-scratch (html2pptx is node-only). Those python scripts only work where <bundled_executables> lists python3.
7. Read html2pptx.md and css.md fully BEFORE writing slides. HTML slides are 960x540 px (16:9).
8. If a step errors, fix the specific cause (missing dep? wrong path? backslashes?) — never re-run the same failing command.
</powerpoint_html2pptx>`;
