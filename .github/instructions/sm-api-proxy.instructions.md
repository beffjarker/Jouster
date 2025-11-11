---
applyTo: 'apps/sm-api/**,libs/sm-*/**'
---

# SM API SOAP Endpoint - Implementation Instructions

## Step 7: Automatic TIBCO Configuration

After Step 5 completes, automatically apply these 5 modifications to `libs/{scope}/data-access/src/lib/{filename}.ts`:

### 1. Import SOAP Template

```typescript
import { CasesGetDetailsReq } from '@digital-platform/sm-api/api';
```

### 2. Add SOAPAction Header

```typescript
headers: {
  'Content-Type': 'text/xml; charset=utf-8',
  'User-Agent': 'sm-api/1.0',
  SOAPAction: CasesGetDetailsReq.soapAction,
}
```

### 3. Use Entity-Specific Base URL

```typescript
const baseURL = process.env['TIBCO_API_CASES']; // Pattern: TIBCO_API_{ENTITY_UPPERCASE}
```

### 4. Add TIBCO Credentials

```typescript
const username = process.env['TIBCO_API_ACCOUNT_USERNAME'];
const password = process.env['TIBCO_API_ACCOUNT_PASSWORD'];
```

### 5. Configure HTTP Basic Auth

```typescript
const client = axios.create({
  baseURL,
  auth: { username, password },
});
```

### Final Result

```typescript
import { CasesGetDetailsReq } from '@digital-platform/sm-api/api';

const baseURL = process.env['TIBCO_API_CASES'];
const username = process.env['TIBCO_API_ACCOUNT_USERNAME'];
const password = process.env['TIBCO_API_ACCOUNT_PASSWORD'];

const client = axios.create({
  baseURL,
  auth: { username, password },
});

export async function casesGetDetails(
  xml: string
): Promise<CasesGetDetailsResponse> {
  const response = await client.post('/', xml, {
    headers: {
      'Content-Type': 'text/xml',
      SOAPAction: CasesGetDetailsReq.soapAction,
    },
  });
  return response.data;
}
```

---

## Manual Configuration Tasks

### Task 1: Update Handler Body Processing

**File**: `apps/sm-api/src/handlers/{filename}.ts`

Extract request data from the Lambda event:

```typescript
const handler = async (event) => {
  const { caseId } = event.pathParameters;
  const { userId } = event.requestContext.authorizer;

  const body = { caseId, userId };
  const result = await casesGetDetails(body);

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
```

### Task 2: Configure API Layer Caching

**File**: `libs/{scope}/api/src/lib/{filename}.ts`

Add caching with `withCache()`:

```typescript
import { withCache } from '@digital-platform/sm-api/api';
import { createKeyFn } from '@digital-platform/platform/utils';

export async function casesGetDetails(
  body: CasesGetDetailsRequest
): Promise<CasesGetDetailsResponse> {
  return withCache<CasesGetDetailsRequest, CasesGetDetailsResponse>(
    body,
    async (body) => {
      const xml = toXML(body, CasesGetDetailsTemplate);
      const response = await casesGetDetailsDA(xml);
      return toJSON<CasesGetDetailsBody>(response, CasesGetDetailsTemplate);
    },
    {
      keyFn: createKeyFn<CasesGetDetailsRequest>(
        'cases-get-details',
        { caseId: true, userId: true }, // Required props
        ['optionalField'] // Optional props
      ),
      ttl: 3600, // 1 hour
    }
  );
}
```
