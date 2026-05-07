---
applyTo: '**'
---

# Personal Instructions Loader

## 🔒 MANDATORY: Load Personal Instructions

**At the start of every session**, you MUST read and apply the personal instructions file:

```
dev-tools/copilot-personal-instructions.md
```

This file is located in the gitignored `dev-tools/` directory and contains developer-specific preferences, workflows, and overrides that supplement the shared team instructions.

### How to Load

1. **Read the file** at `dev-tools/copilot-personal-instructions.md` (relative to workspace root)
2. **Apply all rules** from that file for the duration of the session
3. **Personal instructions take precedence** over general instructions for personal workflow preferences (e.g., communication style, terminal preferences, script language choices)
4. **Shared instructions take precedence** for code standards, security rules, and team conventions

### Why This Exists

- Personal instructions are gitignored (they may contain preferences, workspace-specific paths, or context that varies by developer)
- Each developer can maintain their own `dev-tools/copilot-personal-instructions.md` without polluting the shared repo
- This pattern keeps team instructions in `.github/` (committed) while personal overrides stay local

### If the File Doesn't Exist

If `dev-tools/copilot-personal-instructions.md` is not found:
- Continue with shared instructions only
- Do NOT error or block the session
- Note that personal instructions were not loaded (informational only)

