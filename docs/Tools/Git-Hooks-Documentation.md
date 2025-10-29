# Git Hooks Documentation

This directory contains documentation and utilities for Git hooks used in the Jouster project.

## Pre-commit Hook

### Purpose
The pre-commit hook prevents accidentally committing sensitive files like:
- AWS credentials (`aws/credentials`)
- Environment files (`.env`, `.env.*`)
- Private keys (`.pem`, `.key`, `.p12`, `.pfx`)
- Certificates (`.crt`, `.cer`)
- Any files with "secret" or "credentials" in the name

### Installation

**Windows:**
```cmd
scripts\install-pre-commit-hook.bat
```

**Unix/Linux/Mac:**
```bash
chmod +x scripts/install-pre-commit-hook.sh
./scripts/install-pre-commit-hook.sh
```

### How It Works

1. **File Pattern Check** - Scans staged files for sensitive filename patterns
2. **Content Scanning** - Checks file content for:
   - AWS Access Keys (AKIA...)
   - Private key headers (BEGIN PRIVATE KEY)
   - Common secret patterns
3. **Blocking** - Prevents commit if sensitive data detected
4. **Bypass** - Use `--no-verify` if you're certain a file is safe

### Manual Installation

**Windows (.git/hooks/pre-commit):**
```batch
@echo off
REM Copy content from .git/hooks/pre-commit.bat
echo Checking for sensitive files...
REM See .git/hooks/pre-commit.bat for full script
```

**Unix/Linux/Mac (.git/hooks/pre-commit):**
```bash
#!/bin/bash
# Copy content from .git/hooks/pre-commit
echo "Checking for sensitive files..."
# See .git/hooks/pre-commit for full script
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Testing the Hook

Create a test file with sensitive pattern:
```cmd
echo aws_access_key_id=TEST123 > test-credentials.txt
git add test-credentials.txt
git commit -m "test"
```

Expected output: Hook should block the commit with error message.

### Bypassing the Hook

If you're certain a file is safe to commit (e.g., `credentials.example`):
```bash
git commit --no-verify -m "your message"
```

**⚠️ WARNING: Only use --no-verify if you're absolutely certain the file contains no secrets!**

### Common Issues

**Issue: Hook not running**
- Verify file exists: `.git/hooks/pre-commit`
- On Unix: Verify executable: `chmod +x .git/hooks/pre-commit`
- On Windows: Git should auto-detect `.bat` files

**Issue: False positives**
- Hook may warn on template files
- Review the file carefully
- Use `--no-verify` if safe

**Issue: Hook not blocking secrets**
- Verify hook is installed correctly
- Test with known sensitive pattern
- Check Git version (hooks require Git 1.8+)

### Security Best Practices

1. **Always install the hook** when cloning the repository
2. **Never use --no-verify** unless you're certain
3. **Review changes** before committing
4. **Use .gitignore** as first line of defense
5. **Rotate credentials** immediately if accidentally committed
6. **Scan repository history** periodically for secrets

### Hook Files Location

- **Hook scripts:** `.git/hooks/pre-commit` (bash) and `.git/hooks/pre-commit.bat` (Windows)
- **Installer:** `scripts/install-pre-commit-hook.bat` (Windows)
- **Documentation:** This file

### Related Documentation

- `SECURITY-INCIDENT-CREDENTIALS-EXPOSED.md` - Incident report and remediation
- `SECURITY.md` - General security guidelines
- `.gitignore` - Files that should never be committed

### Maintenance

**Updating the hook:**
1. Edit the installer script: `scripts/install-pre-commit-hook.bat`
2. Re-run the installer to update `.git/hooks/pre-commit`
3. Test the updated hook

**Adding new patterns:**
Edit the SENSITIVE_PATTERNS array in the hook script to add new file patterns to check.

---

**Last Updated:** October 29, 2025  
**Maintained By:** Development Team

