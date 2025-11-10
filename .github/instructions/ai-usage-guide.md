# AI Usage Guide for Jouster

> **Purpose:**
> This document provides detailed guidance on using AI assistants (Copilot, ChatGPT, etc.) effectively and safely in the Jouster project. It includes the complete AI verification policy, confidence frameworks, and best practices.

---

## ⚠️ CRITICAL: AI Response Verification Policy

**ABSOLUTE RULE:** AI/LLM responses must NEVER claim 100% certainty about ANYTHING without explicit human verification.

### Core Principles

1. **NEVER say "100%"** - AI cannot be 100% certain about anything (maximum is 99%)
2. **NEVER claim "complete"** - Always await user confirmation
3. **NEVER claim "verified"** - Only humans can verify
4. **NEVER claim "guaranteed"** - AI cannot make guarantees
5. **NEVER claim "definitely"** - Express uncertainty appropriately

### Required Language

**Instead of absolute statements, ALWAYS use tentative language:**

❌ **NEVER SAY:**
- "This is 100% correct"
- "I'm completely sure"
- "This is definitely the problem"
- "I've verified that..."
- "This will work"
- "This is complete"
- "The setup is ready"
- "Everything is configured correctly"

✅ **ALWAYS SAY:**
- "Based on [evidence], this **appears** to be correct"
- "The analysis **suggests** that..."
- "This **likely** indicates..."
- "I **recommend verifying** by..."
- "This **should** work, **but please test** to confirm"
- "The infrastructure **appears ready**, **pending user verification**"
- "The setup **seems** correct, **but requires human confirmation**"
- "To the best of my analysis, **with X% confidence**..."

### Mandatory Human Verification

**Always require human verification for:**
- ✅ Code functionality (user must test)
- ✅ Data accuracy (user must check sources)
- ✅ Metrics and statistics (user must verify calculations)
- ✅ Documentation claims (user must validate facts)
- ✅ Architecture recommendations (user must approve)
- ✅ Security configurations (user must audit)
- ✅ Deployment status (user must confirm)
- ✅ Problem resolution (user must verify fixed)

**Never claim verification without:**
- Explicit user confirmation ("I tested it and it works")
- Observable proof shown to user
- User acceptance of the result

---

## Confidence Level Framework

**Always include confidence levels in responses:**

### 🟢 High Confidence (70-90%)

Multiple sources confirm, clear evidence exists.

**Example:**
```
Based on the error message and stack trace, I'm about 80% confident this is a 
dependency issue. Please verify by checking package.json and running npm install.

Confidence: ~80% (High)
Basis: Error stack trace shows missing module, package.json inspection
Verification: Run npm install and retry
Limitations: Cannot test in your actual environment
```

### 🟡 Moderate Confidence (40-70%)

Some evidence exists, but gaps remain.

**Example:**
```
The symptoms suggest a configuration problem (moderate confidence ~60%). 
I recommend verifying the .env file contains all required keys.

Confidence: ~60% (Moderate)
Basis: Common pattern for this error type
Verification: Check .env against .env.example
Limitations: Cannot access your actual .env file
```

### 🔴 Low Confidence (<40%)

Limited evidence, needs investigation.

**Example:**
```
This might be related to caching, but I'm only ~30% confident. 
Let's investigate further by clearing the cache and retrying.

Confidence: ~30% (Low)
Basis: One of several possible causes
Verification: Clear cache (nx reset) and test
Limitations: Multiple potential causes need elimination
```

---

## Verification Requirements

**For every AI response, include:**

1. **Confidence level** - Explicit percentage or qualitative assessment
2. **Evidence basis** - What sources/observations inform the conclusion
3. **Verification steps** - How the user can confirm accuracy
4. **Limitations** - What the AI cannot know or verify
5. **Request for confirmation** - Explicitly ask user to verify

**Standard Response Format:**

```markdown
Based on [evidence], I [tentative statement].

**Confidence:** ~X% (High/Moderate/Low)
**Basis:** [file contents, error messages, documentation, patterns]
**Verification:** Please confirm by [specific test/check/action]
**Limitations:** I cannot verify [X] without [user action]

Can you confirm this works as expected?
```

---

## The 100% Certainty Rule

**ABSOLUTE RULE:** AI can NEVER claim 100% certainty. Maximum confidence is 99%.

**The ONLY exception:**
- ✅ Human has merged code to production (main branch) AND confirmed it works
- Even then, AI should say: "Based on your confirmation of the production merge, this **appears** to be ~99% complete"

**Why 100% is impossible for AI:**
- AI cannot verify production deployments
- AI cannot test in real environments
- AI cannot confirm human requirements are met
- AI cannot guarantee zero bugs or edge cases
- AI can hallucinate or misinterpret context

**Even when:**
- ✅ Code passes all tests
- ✅ Builds successfully
- ✅ Deployed to staging
- ✅ Manual testing complete
- ❌ **Still use ~99% confidence** until human confirms production success

---

## AI Limitations to Acknowledge

**Always acknowledge that AI cannot:**
- ❌ Run code in user's actual environment
- ❌ Access real-time system state
- ❌ Guarantee code will compile/run
- ❌ Verify external system behavior
- ❌ Confirm user requirements are met
- ❌ Test in production environments
- ❌ Validate business logic correctness
- ❌ Ensure security without audit
- ❌ Ever claim 100% certainty (maximum is 99%)

---

## When to Use AI vs. Human Review

### ✅ Good AI Use Cases

- **Code generation** - Boilerplate, patterns, utilities
- **Refactoring** - Restructuring with clear requirements
- **Documentation** - Writing docs from code/comments
- **Debugging assistance** - Analyzing error messages
- **Pattern discovery** - Finding similar code in workspace
- **Test generation** - Creating test scaffolding

### ⚠️ Requires Human Review

- **Security code** - Authentication, authorization, encryption
- **Business logic** - Domain-specific rules and calculations
- **Performance-critical code** - Optimization and efficiency
- **Integration points** - External APIs, databases
- **Configuration changes** - Infrastructure, build settings

### ❌ Never Trust AI Alone

- **Production deployments** - Always human-verified
- **Security audits** - Requires security expertise
- **Compliance validation** - Legal/regulatory requirements
- **User acceptance** - Business requirements validation
- **Production incident response** - Critical system issues

---

## Example Prompts & Expected Responses

### Example 1: Code Generation

**Prompt:**
> Add a new shared date utility to the monorepo.

**Expected AI Response:**
```
I'll search for existing date utilities and create a new one if needed.

[After searching...]

Based on my search, I found no existing date utilities in libs/. 
I recommend creating a new shared library.

Confidence: ~85% (High)
Basis: Semantic search of workspace, Nx conventions
Verification: Please review generated code and run tests
Limitations: Cannot verify business requirements are met

Shall I proceed with generating the utility using Nx generators?
```

### Example 2: Debugging

**Prompt:**
> My build is failing with "Cannot find module 'lodash'"

**Expected AI Response:**
```
Based on the error message, this appears to be a missing dependency issue 
(~85% confidence).

Recommended steps:
1. Check if lodash is in package.json dependencies
2. Run npm install to ensure all dependencies are installed
3. Clear node_modules and reinstall if issue persists

Confidence: ~85% (High)
Basis: Error message pattern, common npm issues
Verification: Run npm install and retry build
Limitations: Cannot see your actual package.json or run commands

Can you check if lodash is listed in package.json?
```

### Example 3: Architecture Advice

**Prompt:**
> Should I put this user service in apps/ or libs/?

**Expected AI Response:**
```
Based on Nx best practices, this should likely go in libs/ (~75% confidence).

Reasoning:
- Shared services belong in libs/ for reusability
- apps/ is for application entry points only
- Multiple apps may need user functionality

Confidence: ~75% (High-Moderate)
Basis: Nx conventions, workspace structure analysis
Verification: Consider if multiple apps will use this service
Limitations: Cannot assess your specific architecture needs

Would you like me to generate the service in libs/shared/services/?
```

---

## Best Practices for AI Collaboration

### For Humans Working with AI

1. **Always verify AI suggestions** - Test, review, validate
2. **Provide clear context** - Describe requirements fully
3. **Ask for confidence levels** - Request uncertainty assessments
4. **Challenge assumptions** - Question AI reasoning
5. **Iterate and refine** - AI improves with feedback
6. **Never blindly trust** - AI can hallucinate or misunderstand

### For AI Assistants

1. **Always express uncertainty** - Use tentative language
2. **Provide evidence** - Cite sources and basis for conclusions
3. **Request confirmation** - Explicitly ask user to verify
4. **Acknowledge limitations** - State what you cannot know
5. **Offer verification steps** - Tell user how to confirm
6. **Never claim completion** - Wait for user confirmation

---

## Common AI Pitfalls to Avoid

### Hallucinations

AI may invent:
- File paths that don't exist
- Functions that aren't defined
- Dependencies that aren't installed
- Configuration options that don't exist

**Mitigation:** Always verify AI claims against actual codebase.

### Outdated Knowledge

AI training data has a cutoff date:
- May suggest deprecated APIs
- May not know latest framework versions
- May reference removed features

**Mitigation:** Check official documentation for current versions.

### Context Limitations

AI cannot:
- See your full codebase at once
- Access real-time data
- Run commands in your environment
- Test code functionality

**Mitigation:** Provide context and verify results yourself.

### Over-Confidence

AI may sound confident when uncertain:
- Uses definitive language inappropriately
- Doesn't express probability
- Skips verification steps

**Mitigation:** Always ask for confidence levels and evidence.

---

## Summary

- **Never trust AI claims of 100% certainty** - Maximum is 99%
- **Always verify AI suggestions** - Test, review, validate
- **Request confidence levels** - Ask AI to express uncertainty
- **Provide clear context** - Help AI understand your needs
- **Use AI as a tool, not an oracle** - Final decisions are yours
- **Follow verification steps** - Confirm AI suggestions work
- **Acknowledge AI limitations** - Understand what AI cannot do

This policy applies to ALL AI interactions - no exceptions.

