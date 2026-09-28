# Terminal & Shell Command Execution

This document provides guidelines for executing terminal commands across different shell environments.

---

## ⚠️ CRITICAL RULE: Shell Detection Required

**Always detect the user's shell before executing terminal commands.** Apply shell-specific syntax based on detection.

---

## Shell Detection Strategy

1. **Check environment info** provided at the start of the session
2. **Look for shell indicators** in command outputs:
   - `PS C:\>` = PowerShell
   - `$` = bash/zsh
   - `C:\>` = cmd.exe
3. **Use appropriate syntax** for the detected shell
4. **Default to bash** if shell cannot be determined on Unix-like systems
5. **Default to PowerShell** if shell cannot be determined on Windows

---

## Command Execution Strategy (All Shells)

### Universal Best Practices:

1. **ALWAYS pipe large or complex output to temporary files** for reading
2. **Use absolute paths** with proper escaping for the shell
3. **Verify commands work** in the user's actual shell environment
4. **Read from temp files** instead of relying on terminal buffer

### Why This Matters:

- **Prevents command failures** due to shell-specific syntax issues
- **Handles large outputs** that exceed terminal buffer limits
- **Enables reliable data analysis** by reading structured file content
- **Avoids cross-shell syntax confusion** (PowerShell vs bash vs cmd.exe)
- **Works consistently** across different development environments
- **Ensures completeness** - No truncated or buffered output
- **Provides audit trail** - Temp files can be reviewed if needed

---

## PowerShell-Specific Patterns

Use these patterns when PowerShell is detected.

### ❌ NEVER Do This in PowerShell:

```powershell
# cmd.exe syntax - FAILS in PowerShell
dir /b "C:\path\with spaces"

# bash syntax - FAILS in PowerShell
ls C:\path | grep pattern

# Mixed syntax - FAILS
dir | findstr pattern
```

### ✅ ALWAYS Do This in PowerShell:

```powershell
# For directory listings with potential large output:
Get-ChildItem -Path "C:\path\with spaces" -Recurse | Out-File -FilePath "tmp\dir-output.txt"

# For searching/filtering:
Get-ChildItem -Path "C:\path" -Filter "*.ts" | Out-File -FilePath "tmp\search-output.txt"

# For git commands with large output:
git log --oneline --author="name" | Out-File -FilePath "tmp\git-output.txt"

# For text searching in files:
Select-String -Path "C:\path\*.ts" -Pattern "pattern" | Out-File -FilePath "tmp\search-results.txt"

# Then read the temporary file using read_file tool
```

### Common PowerShell Commands:

| Task            | PowerShell Command                              |
| --------------- | ----------------------------------------------- |
| List directory  | `Get-ChildItem -Path "path"` or `ls`            |
| Recursive list  | `Get-ChildItem -Path "path" -Recurse`           |
| Filter files    | `Get-ChildItem -Path "path" -Filter "*.ts"`     |
| Output to file  | `command \| Out-File -FilePath "path"`          |
| Search content  | `Select-String -Path "path" -Pattern "pattern"` |
| Change dir      | `Set-Location -Path "path"` or `cd`             |
| Print content   | `Get-Content -Path "path"` or `cat`             |
| Environment var | `$env:VARIABLE_NAME`                            |

---

## Bash/Unix-Specific Patterns

Use these patterns when bash, zsh, or sh is detected.

### ✅ Standard Unix Patterns:

```bash
# For directory listings with potential large output:
ls -la /path/to/directory > /tmp/dir-output.txt

# For searching/filtering:
find /path -name "*.ts" > /tmp/search-output.txt

# For git commands with large output:
git log --oneline --author="name" > /tmp/git-output.txt

# For text searching in files:
grep -r "pattern" /path > /tmp/search-results.txt

# Then read the temporary file
```

### Common Bash Commands:

| Task            | Bash Command             |
| --------------- | ------------------------ |
| List directory  | `ls -la path`            |
| Recursive list  | `find path -type f`      |
| Filter files    | `find path -name "*.ts"` |
| Output to file  | `command > path`         |
| Search content  | `grep -r "pattern" path` |
| Change dir      | `cd path`                |
| Print content   | `cat path`               |
| Environment var | `$VARIABLE_NAME`         |

---

## CMD.exe-Specific Patterns

Use these patterns when Windows Command Prompt (cmd.exe) is detected.

### ✅ CMD.exe Patterns:

```cmd
REM For directory listings:
dir /s /b "C:\path" > tmp\dir-output.txt

REM For searching:
dir /s /b "C:\path\*.ts" > tmp\search-output.txt

REM For text searching:
findstr /s /i "pattern" "C:\path\*.ts" > tmp\search-results.txt
```

### Common CMD.exe Commands:

| Task            | CMD.exe Command           |
| --------------- | ------------------------- |
| List directory  | `dir /b "path"`           |
| Recursive list  | `dir /s /b "path"`        |
| Filter files    | `dir /s /b "path\*.ts"`   |
| Output to file  | `command > path`          |
| Search content  | `findstr /s /i "pattern"` |
| Change dir      | `cd path`                 |
| Print content   | `type path`               |
| Environment var | `%VARIABLE_NAME%`         |

---

## Temporary File Management

### PowerShell (Windows):

- **Location**: Always use `tmp\` (relative path from project root) for command output files
- **Naming**: Use descriptive names: `dir-output.txt`, `git-log-output.txt`, `search-results.txt`
- **Cleanup**: Temporary output files are gitignored and can be overwritten
- **Path Format**: Use backslashes: `tmp\output.txt`

### Bash/Unix:

- **Location**: Use `/tmp/` or project-specific temp directory
- **Naming**: Use descriptive names: `dir-output.txt`, `git-log-output.txt`, `search-results.txt`
- **Cleanup**: Files in `/tmp/` are typically cleaned automatically; project temp files should be gitignored
- **Path Format**: Use forward slashes: `/tmp/output.txt` or `tmp/output.txt`

### CMD.exe (Windows):

- **Location**: Use `tmp\` (relative path from project root)
- **Naming**: Use descriptive names without special characters
- **Cleanup**: Temporary output files are gitignored
- **Path Format**: Use backslashes: `tmp\output.txt`

---

## Standard Command Execution Workflow

**Every command with output should follow this pattern:**

1. **Detect shell** - Identify PowerShell, bash, cmd.exe, etc.
2. **Construct command** - Use shell-appropriate syntax
3. **Pipe to temp file** - Redirect output to `tmp/descriptive-name.txt`
4. **Execute command** - Run via terminal
5. **Read temp file** - Use `read_file` tool with absolute path
6. **Analyze data** - Parse and process the file content
7. **Continue work** - Use the analyzed data for next steps

### Example End-to-End Workflow:

**Scenario**: User asks "What are the recent commits to analytics.service.ts?"

**PowerShell Execution:**

```
1. Detect: PowerShell (Windows) from environment info
2. Command: git log --oneline -- "path/to/analytics.service.ts"
3. Pipe: | Out-File -FilePath "tmp\analytics-commits.txt"
4. Execute: run_in_terminal with full command
5. Read: read_file("H:\projects\Jouster\tmp\analytics-commits.txt")
6. Analyze: Parse commit hashes and messages
7. Continue: "Based on the commits, I found..."
```

**Bash Execution:**

```
1. Detect: bash (Linux/Mac) from environment info
2. Command: git log --oneline -- "path/to/analytics.service.ts"
3. Pipe: > /tmp/analytics-commits.txt
4. Execute: run_in_terminal with full command
5. Read: read_file("/tmp/analytics-commits.txt")
6. Analyze: Parse commit hashes and messages
7. Continue: "Based on the commits, I found..."
```

---

## Special Cases

### Large Output Commands:

For commands that produce massive output (thousands of lines), consider:

```powershell
# PowerShell: Use Select-Object to limit
Get-ChildItem -Recurse | Select-Object -First 100 | Out-File "tmp\output.txt"

# Bash: Use head or tail
find . -type f | head -n 100 > /tmp/output.txt
```

### Commands with Pagers:

Some commands use pagers (less, more) by default. Disable them:

```powershell
# PowerShell
git --no-pager log

# Bash
git --no-pager log
export PAGER=cat
```

### Multi-line Commands:

```powershell
# PowerShell: Use backtick for line continuation
Get-ChildItem -Path "C:\path" `
  -Filter "*.ts" `
  -Recurse | Out-File "tmp\output.txt"

# Bash: Use backslash for line continuation
find /path \
  -name "*.ts" \
  -type f > /tmp/output.txt
```

---

## Error Handling

### Check Command Success:

```powershell
# PowerShell
$result = git log 2>&1 | Out-File "tmp\output.txt"
if ($LASTEXITCODE -ne 0) {
  Write-Error "Command failed"
}

# Bash
git log > /tmp/output.txt 2>&1
if [ $? -ne 0 ]; then
  echo "Command failed"
fi
```

### Capture Errors:

```powershell
# PowerShell: Redirect errors to same file
git log 2>&1 | Out-File "tmp\output.txt"

# Bash: Redirect stderr to stdout
git log > /tmp/output.txt 2>&1
```

---

## Summary Checklist

- [ ] Detect user's shell from environment info or output patterns
- [ ] Use shell-specific syntax (PowerShell vs bash vs cmd.exe)
- [ ] Always pipe output to temporary files for large/complex commands
- [ ] Use appropriate path format (backslash for Windows, forward slash for Unix)
- [ ] Read temp files with `read_file` tool instead of relying on terminal buffer
- [ ] Handle errors by capturing stderr with stdout
- [ ] Disable pagers when needed (git --no-pager, export PAGER=cat)
- [ ] Use proper escaping for paths with spaces
- [ ] Clean up or reuse temp files appropriately
