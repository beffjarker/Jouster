---
description: Generate a complete SOAP API endpoint with Lambda handler, API layer, and data-access layer for SM API
---

# SM API SOAP Endpoint Generator

## 🎯 What This Does

Creates a complete SOAP API endpoint for the SM API (Service Manager API) with full integration:

- **Lambda Handler** with API Gateway
- **API Layer** with XML/JSON conversion
- **Data-Access Layer** with HTTP client
- **TIBCO Authentication** configured

---

## 📋 Step 1: Collect User Inputs

Ask the user for these 5 parameters:

1. **Domain** (string, lowercase) - e.g., `sm`, `rs`, `uwp`
2. **Entity** (string, plural, kebab-case) - e.g., `cases`, `customers`, `service-requests`
3. **Action** (string, kebab-case) - e.g., `get-details`, `list`, `create`
4. **HTTP Method** (string, uppercase) - `GET`, `POST`, `PUT`, or `DELETE`
5. **API Gateway Path** (string, starts with `/`) - e.g., `/api/cases/{caseId}`

**Auto-compute these values:**

- `scope` = `{domain}-{entity}` (e.g., `sm-cases`)
- `fileName` = `{entity}-{action}` (e.g., `cases-get-details`)
- `functionName` = `{entityCamel}{ActionPascal}` (e.g., `casesGetDetails`)
- `templateName` = `{Entity}{Action}Template` (e.g., `CasesGetDetailsTemplate`)

---

## 🚀 Step 2: Run Generators in Sequence

Execute these 5 generators automatically:

### Generator 1: Lambda Handler

```bash
npx nx g @digital-platform/utils:sls-handler \
  --appName=sm-api \
  --domain={domain} \
  --entity={entity} \
  --action={action} \
  --path={path} \
  --method={method}
```

### Generator 2: API Layer

```bash
npx nx g @digital-platform/utils:rs-lib-fn-file \
  --domain={domain} \
  --entity={entity} \
  --action={action} \
  --layer=api
```

### Generator 3: Data-Access Layer

```bash
npx nx g @digital-platform/utils:rs-lib-fn-file \
  --domain={domain} \
  --entity={entity} \
  --action={action} \
  --layer=data-access
```

### Generator 4: XML/JSON Conversion

```bash
npx nx g @digital-platform/utils:api-lib-xml-adapters \
  --domain={domain} \
  --entity={entity} \
  --action={action}
```

### Generator 5: HTTP Client

```bash
npx nx g @digital-platform/utils:data-access-lib-axios \
  --domain={domain} \
  --entity={entity} \
  --action={action}
```

---

## 🔧 Step 3: Apply Automatic Modifications

After all generators complete, apply these modifications automatically.

**See**: `.github/instructions/sm-api-proxy.instructions.md` for the exact code changes to apply.

**Summary**: Update the data-access file (`libs/{scope}/data-access/src/lib/{fileName}.ts`) with:

1. Import SOAP template
2. Add SOAPAction header
3. Use entity-specific base URL env var
4. Add TIBCO credentials
5. Configure HTTP basic auth

---

## ✅ Step 4: Display Success Message

Show this message to the user:

```
🎉 SOAP API endpoint generated successfully!

📁 Generated Files:
   ├── apps/sm-api/src/handlers/{fileName}.ts
   ├── libs/{scope}/api/src/lib/{fileName}.ts
   └── libs/{scope}/data-access/src/lib/{fileName}.ts

🔗 Fully integrated: Handler → API → Data-Access
✅ Type-safe with {Entity}{Action}Request and {Entity}{Action}Response
✅ TIBCO authentication configured
```

---

## ⚠️ Step 5: Inform User of Manual Tasks

Tell the user they must complete these 3 manual tasks:

### Task 1: Update Handler Body Processing

**File**: `apps/sm-api/src/handlers/{fileName}.ts`

Extract request data from the Lambda event (path params, query params, body, user context).

**Example**:

```typescript
const { caseId } = event.pathParameters;
const { userId } = event.requestContext.authorizer;
const body = { caseId, userId };
```

### Task 2: Configure API Layer Caching

**File**: `libs/{scope}/api/src/lib/{fileName}.ts`

Add caching with `withCache()` and `createKeyFn()` to reduce external API calls.

**Example**:

```typescript
return withCache(
  body,
  async (body) => {
    /* ... */
  },
  {
    keyFn: createKeyFn('cases-get-details', { caseId: true }, []),
    ttl: 3600,
  }
);
```

### Task 3: Add Unit Tests

**Files**:

- `apps/sm-api/src/handlers/{fileName}.spec.ts`
- `libs/{scope}/api/src/lib/{fileName}.spec.ts`
- `libs/{scope}/data-access/src/lib/{fileName}.spec.ts`

Create unit tests for each generated file following the workspace testing standards.

---

**Status**: ✅ Production Ready
