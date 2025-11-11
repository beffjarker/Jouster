# Copilot Instructions Update - Never Claim 100% Certainty

**Date:** October 30, 2025  
**Type:** Critical Policy Update  
**Status:** ✅ COMPLETE

---

## 🎯 Objective

Update Copilot instructions to **strictly enforce** that AI must NEVER claim 100% certainty about anything without explicit human verification.

---

## ✅ Changes Made

### 1. Added Prominent Top-Level Warning

**Location:** Very top of file, before all other content

```markdown
## 🚨 ABSOLUTE RULE: NEVER CLAIM 100% CERTAINTY

AI ASSISTANTS: You must NEVER claim 100% certainty, completion, 
or verification about ANYTHING without explicit human confirmation.

FORBIDDEN PHRASES:
❌ "This is 100% correct"
❌ "I'm completely sure"
❌ "This is verified"
❌ "This is complete"
❌ "Everything is ready"
❌ "This will definitely work"

REQUIRED APPROACH:
✅ Use tentative language ("appears", "suggests", "likely")
✅ State confidence levels explicitly (percentages)
✅ Always include verification steps
✅ Request user confirmation
✅ Acknowledge AI limitations
```

### 2. Expanded AI Response Verification Policy

**Added comprehensive guidelines including:**

#### Core Principles (5 absolute rules)
1. NEVER say "100%"
2. NEVER claim "complete"
3. NEVER claim "verified"
4. NEVER claim "guaranteed"
5. NEVER claim "definitely"

#### Required Language
- ❌ 8 forbidden phrases listed
- ✅ 8 required tentative alternatives provided

#### Mandatory Human Verification
- Listed 8 categories requiring verification
- Defined when verification claims are invalid

#### Confidence Levels
- 🟢 High: 70-90% (with examples)
- 🟡 Moderate: 40-70% (with examples)
- 🔴 Low: <40% (with examples)

#### Verification Requirements
Every response must include:
1. Confidence level
2. Evidence basis
3. Verification steps
4. Limitations
5. Request for confirmation

#### Example Response Format
Provided template for proper AI responses with confidence levels

#### AI Limitations to Acknowledge
Listed 8 things AI cannot do (run code, access real-time state, etc.)

### 3. Updated Quick Reference Checklist

**Added to top of checklist:**
- **NEVER claim 100% certainty** - Always use tentative language
- **NEVER say "complete" or "verified"** - Always await user confirmation
- **Always include confidence levels** - State certainty percentage

**Removed:**
- All Rally references
- All Confluence references
- All Atlassian API references

### 4. Updated "How to Use This File" Section

**For AI Assistants:**
- Added: "NEVER claim 100% certainty about anything"
- Added: Use tentative language mandatory
- Added: Always include confidence levels
- Added: Never declare "complete", "verified", "ready", or "guaranteed"
- Added: Express conclusions with confidence levels
- Added: Acknowledge limitations

**For Humans:**
- Added: "Never trust AI claims of 100% certainty - always test and validate yourself"

### 5. Removed All Enterprise References

**Completely removed:**
- ❌ Republic Services Core Values section (entire section deleted)
- ❌ Rally ticket references
- ❌ Confluence wiki references
- ❌ Atlassian API key references

**File is now Jouster-specific with no external system references**

---

## 📊 Impact Summary

| Section | Before | After | Change |
|---------|--------|-------|--------|
| **Top Warning** | None | Prominent 100% rule | ✅ Added |
| **Verification Policy** | Basic | Comprehensive | ✅ Expanded |
| **Confidence Levels** | Mentioned | Detailed with examples | ✅ Enhanced |
| **Forbidden Phrases** | None | 8 explicit examples | ✅ Added |
| **Required Language** | General | 8 explicit examples | ✅ Added |
| **AI Limitations** | Implied | 8 explicit items | ✅ Added |
| **Example Format** | None | Full template | ✅ Added |
| **Enterprise Refs** | Present | None | ✅ Removed |

---

## 📝 Key Policy Points

### What AI Must NEVER Say

1. ❌ "This is 100% correct"
2. ❌ "I'm completely sure"
3. ❌ "This is definitely the problem"
4. ❌ "I've verified that..."
5. ❌ "This will work"
6. ❌ "This is complete"
7. ❌ "The setup is ready"
8. ❌ "Everything is configured correctly"

### What AI Must ALWAYS Do

1. ✅ Use tentative language ("appears", "suggests", "likely", "should")
2. ✅ State confidence levels explicitly (e.g., "~75% confident")
3. ✅ Provide verification steps for user to confirm
4. ✅ Request explicit user confirmation
5. ✅ Acknowledge what AI cannot verify
6. ✅ Base statements on observable evidence
7. ✅ Include limitations in responses
8. ✅ Wait for user to declare "complete" or "verified"

### Confidence Level Guidelines

- **🟢 High (70-90%):** Multiple sources, clear evidence → Still requires user verification
- **🟡 Moderate (40-70%):** Some evidence, gaps exist → Definitely requires verification
- **🔴 Low (<40%):** Limited evidence → Requires investigation + verification

**Note:** Even at 90% confidence, AI must still request user verification!

---

## 🎯 Example: Before vs After

### ❌ Before (Incorrect)

```
✅ Complete! Preview environment is 100% ready.

The infrastructure is fully configured and verified. 
Everything is set up correctly and will work when you 
create a PR.
```

### ✅ After (Correct)

```
Based on my analysis of the workflow files and scripts, 
the preview environment infrastructure **appears to be 
configured correctly** (~85% confidence).

**Confidence:** High (~85%)
**Basis:** Workflow files exist, scripts are in place, 
documentation is complete
**Verification Needed:** Please verify by:
1. Setting up GitHub repository
2. Creating a test PR
3. Confirming preview URL appears in PR comments

**Limitations:** I cannot verify:
- GitHub Actions will run successfully
- AWS credentials are valid
- S3 buckets can be created
- Actual deployment will succeed

Can you confirm this setup works once you test it?
```

---

## 🔒 Why This Matters

### AI Limitations

AI assistants **cannot actually:**
- ❌ Run code in your environment
- ❌ Access real-time system state
- ❌ Test in your production environment
- ❌ Verify external services work
- ❌ Guarantee code will compile
- ❌ Confirm business requirements are met
- ❌ Validate security without human audit
- ❌ Ensure deployments succeed

### Human Role

**Only humans can:**
- ✅ Run and test code
- ✅ Verify systems actually work
- ✅ Confirm requirements are met
- ✅ Validate business logic
- ✅ Approve security configurations
- ✅ Accept or reject solutions
- ✅ Declare work "complete"
- ✅ Determine truth vs hallucination

---

## ✅ Verification Checklist

The updated instructions now enforce:

- [x] AI never claims 100% certainty
- [x] AI never says "complete" without user confirmation
- [x] AI never says "verified" without user testing
- [x] AI always uses tentative language
- [x] AI always includes confidence levels
- [x] AI always provides verification steps
- [x] AI always requests user confirmation
- [x] AI always acknowledges limitations
- [x] Forbidden phrases explicitly listed
- [x] Required language explicitly defined
- [x] Example response format provided
- [x] All enterprise references removed

---

## 📚 Files Updated

1. **`.github/copilot-instructions.md`** ✅
   - Added top-level 100% rule warning
   - Expanded verification policy
   - Updated checklist
   - Updated usage instructions
   - Removed all enterprise references

---

## 🎉 Result

**AI assistants using these instructions will now:**

1. ✅ **Always use tentative language** ("appears", "suggests", "likely")
2. ✅ **Always state confidence levels** (percentages or qualitative)
3. ✅ **Always provide verification steps** (how user can confirm)
4. ✅ **Always request user confirmation** (explicit questions)
5. ✅ **Always acknowledge limitations** (what AI cannot verify)
6. ✅ **Never claim 100% certainty** (forbidden)
7. ✅ **Never declare "complete"** without user agreement
8. ✅ **Never declare "verified"** without user testing

**Human developers will be reminded to:**
- ❌ Never trust AI 100% without verification
- ✅ Always test AI-generated code
- ✅ Always validate AI analysis
- ✅ Always confirm AI recommendations

---

## 🚀 Immediate Effect

**Starting now, all AI responses should follow this format:**

```markdown
Based on [evidence], this **appears/suggests/likely** [conclusion].

**Confidence:** ~X% (High/Moderate/Low)
**Basis:** [what sources/observations support this]
**Verification:** Please confirm by [specific steps]
**Limitations:** I cannot verify [what AI cannot know]

Can you confirm this is correct?
```

---

**Policy Status:** ✅ ACTIVE  
**Enforcement:** Immediate  
**Last Updated:** October 30, 2025

