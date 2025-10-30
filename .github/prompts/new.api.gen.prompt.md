# New API Generator Prompt

## ✅ Generator Status: **IMPLEMENTED AND WORKING**

Both generators have been successfully implemented and are ready for use:

1. `api-scope-libs` generator - Creates the two-library scope structure (data-access and api)
2. `aura-api-app` generator - Creates a complete Aura API application (for AWS Account: aura)
3. `rscom-api-app` generator - Creates a complete RSCOM API application (for AWS Account: rscom)

## 🚀 ULTRA STREAMLINED: Only 3 Parameters Required

**SIMPLIFIED:** All values are automatically derived from these 3 inputs using fixed naming conventions:

- Scope Name = `[domain]-[entity-lowercase]`
- API App Name = `[domain]-api`
- Lambda Function Name = lowercase(Primary Entity Name)
- API Endpoint Path = `/api/lowercase(Primary Entity Name)`
- Handler File Name = lowercase(Primary Entity Name)
- HTTP Method = POST (default)
- API Library Name = `[scope-name]-api` (auto-derived from scope name)
- Data-Access Library Name = `[scope-name]-data-access` (auto-derived from scope name)

## ⚠️ CRITICAL COMMAND INFORMATION

This prompt guides you through generating **BOTH** API scope libraries and a complete API application in the correct sequence. The API application generator used depends on the AWS Account specified:

- **AWS Account = "aura"** → Use `aura-api-app` generator
- **AWS Account = "rscom"** → Use `rscom-api-app` generator

## 📋 Step-by-Step Generation Process

### Phase 1: Gather Requirements (ULTRA SIMPLIFIED)

Before running any generators, please provide the following information using the numbered format below:

**Please respond with numbered answers (1., 2., 3.) to ensure accuracy:**

1. **Domain** (lowercase)

   - This will be used to generate: `libs/[domain]-[entity-lowercase]/`
   - The generated projects will be named: `[domain]-[entity-lowercase]-api`, `[domain]-[entity-lowercase]-data-access`
   - The API app will be named: `[domain]-api`
   - Examples: "sm", "user", "order"

2. **Primary Entity Name** (PascalCase, plural)

   - This should be plural, PascalCase (e.g., "Cases", "Requests", "Orders")
   - Used for domain modeling and interfaces in both scope libraries and API app

3. **AWS Account** (lowercase)
   - Must be one of: `rscom`, `aura`
   - This determines which AWS account/environment configuration to use
   - Example: "rscom" or "aura"

### ⚠️ CRITICAL: Auto-Generated Values

**All Other Values Are Automatically Derived:**

From your 3 inputs above, the following are automatically calculated:

- **Scope Name:** `[domain]-[entity-lowercase]` (e.g., "sm-cases", "user-profiles")
- **API App Name:** `[domain]-api` (e.g., "sm-api", "user-api")
- **Lambda Function Name:** `lowercase(Primary Entity Name)` (e.g., "cases", "profiles")
- **API Endpoint Path:** `/api/lowercase(Primary Entity Name)` (e.g., "/api/cases", "/api/profiles")
- **Handler File Name:** `lowercase(Primary Entity Name)` (e.g., "cases", "profiles")
- **HTTP Method:** `POST` (default for all APIs)
- **API Library Name:** `[scope-name]-api` (e.g., "sm-cases-api")
- **Data-Access Library Name:** `[scope-name]-data-access` (e.g., "sm-cases-data-access")

**Example Mapping:**
If you provide:

1. Domain: "sm"
2. Primary Entity Name: "Cases"
3. AWS Account: "aura"

Then auto-generated values will be:

- **Scope Name:** "sm-cases"
- **API App Name:** "sm-api"
- **Lambda Function Name:** "cases"
- **API Endpoint Path:** "/api/cases"
- **Handler File Name:** "cases"
- **HTTP Method:** "POST"
- **API Library Name:** "sm-cases-api"
- **Data-Access Library Name:** "sm-cases-data-access"

**Import Path Structure:**

- Data-access imports will be: `@digital-platform/[scope-name]/data-access`
- API imports will be: `@digital-platform/[scope-name]/api`

### Phase 2: Generate API Scope Libraries

⚠️ **IMPORTANT**: Use ONLY this exact command format:

```bash
npx nx g ./libs/platform/utils:api-scope-libs --domain=[domain] --entityName=[PrimaryEntityName]
```

**Example:**

```bash
npx nx g ./libs/platform/utils:api-scope-libs --domain=sm --entityName=Cases
```

**DO NOT USE:**

- ❌ `npx nx g @digital-platform/platform/utils:api-scope-libs`
- ❌ `npx nx generate ./libs/platform/utils:api-scope-libs`
- ❌ Any other command variations

This will create:

- `libs/[domain]-[entity-lowercase]/api/` (project name: `[domain]-[entity-lowercase]-api`)
- `libs/[domain]-[entity-lowercase]/data-access/` (project name: `[domain]-[entity-lowercase]-data-access`)

### Phase 3: Generate API Application

⚠️ **IMPORTANT**: Use the correct generator based on AWS Account:

**For AWS Account = "aura":**

```bash
npx nx g ./libs/platform/utils:aura-api-app [domain]-api --primaryEntityName=[PrimaryEntityName] --lambdaFunctionName=[lowercase-entity-name] --apiEndpointPath=/api/[lowercase-entity-name] --domain=[domain]-[entity-lowercase] --httpMethod=POST
```

**For AWS Account = "rscom":**

```bash
npx nx g ./libs/platform/utils:rscom-api-app [domain]-api --primaryEntityName=[PrimaryEntityName] --lambdaFunctionName=[lowercase-entity-name] --apiEndpointPath=/api/[lowercase-entity-name] --domain=[domain]-[entity-lowercase] --httpMethod=POST
```

**Examples:**

For AWS Account "aura":

```bash
npx nx g ./libs/platform/utils:aura-api-app sm-api --primaryEntityName=Cases --lambdaFunctionName=cases --apiEndpointPath=/api/cases --domain=sm-cases --httpMethod=POST
```

For AWS Account "rscom":

```bash
npx nx g ./libs/platform/utils:rscom-api-app sm-api --primaryEntityName=Cases --lambdaFunctionName=cases --apiEndpointPath=/api/cases --domain=sm-cases --httpMethod=POST
```

**DO NOT USE:**

- ❌ `npx nx g @digital-platform/platform/utils:aura-api-app`
- ❌ `npx nx g @digital-platform/platform/utils:rscom-api-app`
- ❌ `npx nx generate ./libs/platform/utils:aura-api-app`
- ❌ `npx nx generate ./libs/platform/utils:rscom-api-app`
- ❌ Any other command variations

### Phase 4: Validate Generation

After both generators complete successfully, validate everything works:

```bash
# Test the scope libraries
npx nx test [domain]-[entity-lowercase]-data-access
npx nx test [domain]-[entity-lowercase]-api

# Lint the scope libraries
npx nx lint [domain]-[entity-lowercase]-data-access
npx nx lint [domain]-[entity-lowercase]-api

# Test and lint the API application
npx nx test [domain]-api
npx nx lint [domain]-api
```

**Example:**

```bash
npx nx test sm-cases-data-access
npx nx test sm-cases-api
npx nx lint sm-cases-data-access
npx nx lint sm-cases-api
npx nx test sm-api
npx nx lint sm-api
```

### Phase 5: Configure for Local Development

#### Step 5.1: Comment Out Secrets Configuration

In the generated `apps/[api-app-name]/serverless.yml` file, find this line in the `custom:` section:

```yaml
custom:
  secrets: ${ssm:/aws/reference/secretsmanager/aura-secret}
```

**Comment it out like this:**

```yaml
custom:
  # secrets: ${ssm:/aws/reference/secretsmanager/aura-secret}
```

This prevents secrets loading issues during local development.

#### Step 5.2: Start the API Server (Manual Step)

**IMPORTANT: You must manually run this command in a separate terminal:**

Open a **new terminal window/tab** and run:

```bash
npx nx serve [api-app-name]
```

**Example:**

```bash
npx nx serve sm-api
```

**⚠️ Note for AI Agents/Copilot:** Do NOT run this command automatically. Instruct the user to manually run this command in a separate terminal after they have commented out the secrets line.

Wait for the server to start. You should see output indicating the API is running on `http://localhost:[port]`.

### Phase 6: Test the API Endpoint

#### Step 6.1: Get Fresh Auth0 Token

Before testing, you need a fresh Auth0 token.

**Please provide a fresh Auth0 Bearer token:**

```
Bearer Token: ______
```

#### Step 6.2: Test with cURL

Once you have provided the fresh token, run this cURL command to test your new endpoint:

```bash
curl -X POST \
  "http://localhost:[port]/api/[lowercase-entity-name]" \
  -H "x-api-key: d41d8cd98f00b204e9800998ecf8427e" \
  -H "Authorization: Bearer [YOUR-AUTH0-TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Example:**

```bash
curl -X POST \
  "http://localhost:3333/api/cases" \
  -H "x-api-key: d41d8cd98f00b204e9800998ecf8427e" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiI..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**

- Status: 200 OK
- Body: JSON response from your new endpoint

## 🎯 Complete Example Walkthrough

Here's a complete example for generating a "Service Management Cases" API:

### Example Input Response:

```
1. sm
2. Cases
3. aura
```

### All Derived Values:

- **Domain:** `sm`
- **Scope Name:** `sm-cases` (auto-derived)
- **API App Name:** `sm-api` (auto-derived)
- **Primary Entity Name:** `Cases`
- **AWS Account:** `aura`
- **Lambda Function Name:** `cases` (auto-derived)
- **API Endpoint Path:** `/api/cases` (auto-derived)
- **Handler File Name:** `cases` (auto-derived)
- **HTTP Method:** `POST` (auto-derived)
- **API Library Name:** `sm-cases-api` (auto-derived)

### Example Commands:

```bash
# Step 1: Generate scope libraries
npx nx g ./libs/platform/utils:api-scope-libs --domain=sm --entityName=Cases

# Step 2: Generate API application (choose based on AWS account)
# For AWS Account = "aura":
npx nx g ./libs/platform/utils:aura-api-app sm-api --primaryEntityName=Cases --lambdaFunctionName=cases --apiEndpointPath=/api/cases --domain=sm-cases --httpMethod=POST

# For AWS Account = "rscom":
npx nx g ./libs/platform/utils:rscom-api-app sm-api --primaryEntityName=Cases --lambdaFunctionName=cases --apiEndpointPath=/api/cases --domain=sm-cases --httpMethod=POST

# Step 3: Validate generation
npx nx test sm-cases-data-access
npx nx test sm-cases-api
npx nx test sm-api
npx nx lint sm-cases-data-access
npx nx lint sm-cases-api
npx nx lint sm-api

# Step 4: Comment out secrets in apps/sm-api/serverless.yml
# (Manual step - edit the file)

# Step 5: Start the server (in separate terminal)
npx nx serve sm-api

# Step 6: Test the endpoint
curl -X POST \
  "http://localhost:3333/api/cases" \
  -H "x-api-key: d41d8cd98f00b204e9800998ecf8427e" \
  -H "Authorization: Bearer [FRESH-AUTH0-TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🔧 Generated Structure Overview

After completion, you will have:

### Libraries Structure:

```
libs/
  [domain]-[entity-lowercase]/
    api/          # API handlers and Lambda functions
    data-access/  # Data access services and utilities
```

### Application Structure:

```
apps/
  [domain]-api/
    src/
      handlers/   # Lambda function handlers
      middleware.ts
      authorizers/
    serverless.yml # Serverless Framework configuration
    project.json   # Nx project configuration
```

### Cross-Library Dependencies:

- **API App** → depends on **API Library**
- **API Library** → depends on **Data-Access Library**
- **Data-Access Library** → standalone (no dependencies)

## 🚨 Important Notes

1. **Command Format**: Always use the exact command format shown - variations will fail
2. **Naming Consistency**: Keep naming consistent between scope libraries and API app
3. **Sequential Order**: Always generate scope libraries FIRST, then the API application
4. **Secrets Configuration**: Always comment out the secrets line for local development
5. **Manual Server Start**: DO NOT run the serve command automatically - instruct user to run it manually in separate terminal
6. **Fresh Tokens**: Always use a fresh Auth0 token for testing
7. **Separate Terminal**: Always run the serve command in a separate terminal

## 📖 For AI Agents/Copilot

When a user requests to "generate a new API with scope libraries":

1. **Gather Requirements**: Present the numbered list (1-3) and ask user to respond with numbered answers for accuracy
2. **Auto-Generate Values**: Automatically derive all other values from the 3 user inputs using the formulas above
3. **Generate Scope Libraries**: Run the api-scope-libs generator with the exact command format
4. **Generate API Application**:
   - If AWS Account = "aura": Run the aura-api-app generator with auto-generated values
   - If AWS Account = "rscom": Run the rscom-api-app generator with auto-generated values
5. **Validate Generation**: Run the test and lint commands for all generated projects
6. **Configure for Local Dev**: Comment out the secrets line in serverless.yml
7. **Instruct Manual Server Start**: Tell user to manually run the serve command in a separate terminal (DO NOT automate this)
8. **Guide Testing**: Help user test with cURL using fresh Auth0 token after they confirm server is running

**CRITICAL REMINDERS:**

- ✅ Use the **numbered list format** for gathering requirements (1., 2., 3.) - now 3 parameters including AWS account
- ✅ **Automatically derive** all other values using the domain prefix formulas shown above
- ✅ **AWS Account validation:** Must be either `rscom` or `aura`
- ✅ **Generator Selection Logic:** Use `aura-api-app` for "aura" account, `rscom-api-app` for "rscom" account
- ✅ **FIXED NAMING:** scopeName = `[domain]-[entity-lowercase]`, apiAppName = `[domain]-api`
- ✅ **FIXED NAMING:** apiLibraryName = `[scope-name]-api`, dataAccessLibraryName = `[scope-name]-data-access`
- ✅ **DEFAULT:** httpMethod = `POST` for all APIs
- ✅ Use the **exact command formats** shown - no variations
- ✅ Generate scope libraries **FIRST**, then API application
- ✅ **DO NOT** automatically run the serve command - instruct user to do it manually
- ✅ Always comment out the `secrets:` line for local development
- ✅ Always request a fresh Auth0 token before testing
- ✅ Use the standard x-api-key: `d41d8cd98f00b204e9800998ecf8427e` for local testing
