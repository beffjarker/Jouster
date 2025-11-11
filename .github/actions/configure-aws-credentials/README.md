# Configure AWS Credentials Action

A reusable composite action to standardize AWS credentials configuration across all workflows in the monorepo.

## Purpose

This action provides a centralized way to configure AWS credentials based on project account tags, eliminating the need to duplicate AWS credential configuration blocks across multiple workflow files.

## Features

- **Tag-based role assumption**: Automatically selects the appropriate AWS role based on the `account:` tag in each project's `project.json`
- **Environment-aware**: Supports different environments (dev, prod, and qa for ECom projects)
- **Fallback support**: Provides access key fallback for legacy authentication
- **Standardized naming**: Consistent role session names across all projects (`github_actions-{project}-{environment}`)
- **Configurable region**: Allows specifying AWS region (defaults to us-west-2)

## Files in this Action

- `action.yml` - Action definition and metadata
- `get-account-from-project.js` - Script to extract account information from project tags
- `set-role-from-account.js` - Script to map accounts to AWS role environment variables
- `README.md` - This documentation

## How It Works

1. **Account Detection**: Reads the project's `project.json` file and looks for an `account:` tag (e.g., `"account:aura"`)
2. **Role Mapping**: Maps the account and environment to the appropriate AWS role environment variable
3. **Credential Configuration**: Uses `aws-actions/configure-aws-credentials@v4` with the selected role or fallback credentials

## Supported Account Types

| Account Tag          | Environments  | AWS Role Environment Variable |
| -------------------- | ------------- | ----------------------------- |
| `account:aura`       | dev, prod     | `AURA_OIDC_SSO_{ENV}_ROLE`    |
| `account:rscom`      | dev, prod     | `RSCOM_OIDC_SSO_{ENV}_ROLE`   |
| `account:rscom-ecom` | dev, prod, qa | `ECOM_OIDC_SSO_{ENV}_ROLE`    |

## Usage

### Basic Usage

```yaml
- name: Configure AWS Credentials
  uses: ./.github/actions/configure-aws-credentials
  with:
    project: ${{ matrix.project }}
```

### With Environment Specification

```yaml
- name: Configure AWS Credentials
  uses: ./.github/actions/configure-aws-credentials
  with:
    project: ${{ matrix.project }}
    environment: 'prod'
    aws-region: 'us-east-1'
```

### With Fallback Credentials

```yaml
- name: Configure AWS Credentials
  uses: ./.github/actions/configure-aws-credentials
  with:
    project: ${{ matrix.project }}
    environment: 'dev'
    fallback-access-key-id: ${{ secrets.AWS_NONPROD_ACCESS_KEY_ID }}
    fallback-secret-access-key: ${{ secrets.AWS_NONPROD_SECRET_ACCESS_KEY }}
```

## Inputs

| Input                        | Description                                        | Required | Default     |
| ---------------------------- | -------------------------------------------------- | -------- | ----------- |
| `project`                    | Project name to determine which AWS role to assume | ✅       | -           |
| `environment`                | Environment (dev or prod)                          | ❌       | `dev`       |
| `aws-region`                 | AWS region                                         | ❌       | `us-west-2` |
| `fallback-access-key-id`     | Fallback AWS Access Key ID                         | ❌       | -           |
| `fallback-secret-access-key` | Fallback AWS Secret Access Key                     | ❌       | -           |

## Outputs

| Output              | Description                                                                       |
| ------------------- | --------------------------------------------------------------------------------- |
| `configured-method` | Method used to configure credentials (`role-assumption`, `access-key`, or `none`) |

## Required Secrets/Environment Variables

The action expects the following environment variables to be set in the workflow (typically through GitHub repository variables and secrets):

### For Development Environment

- `RSCOM_OIDC_SSO_DEV_ROLE`
- `ECOM_OIDC_SSO_DEV_ROLE`
- `ECOM_OIDC_SSO_QA_ROLE`
- `ECOM_OIDC_SSO_STG_ROLE`
- `AURA_OIDC_SSO_DEV_ROLE`

### For Production Environment

- `RSCOM_OIDC_SSO_PROD_ROLE`
- `ECOM_OIDC_SSO_PROD_ROLE`
- `AURA_OIDC_SSO_PROD_ROLE`

### For Fallback Access Key Authentication

- `AWS_NONPROD_ACCESS_KEY_ID`
- `AWS_NONPROD_SECRET_ACCESS_KEY`
- `AWS_PROD_ACCESS_KEY_ID`
- `AWS_PROD_SECRET_ACCESS_KEY`

## Migration from Individual Workflow Files

Replace multiple AWS credential configuration steps:

### Before

```yaml
- name: Configure AWS credentials (RScom & RSW Account)
  uses: aws-actions/configure-aws-credentials@v4
  if: startsWith(matrix.project, 'rs-') || startsWith(matrix.project, 'rsw-')
  with:
    role-to-assume: ${{ vars.RSCOM_OIDC_SSO_DEV_ROLE }}
    role-session-name: 'github_actions-rscom_sso-dev'
    aws-region: us-west-2

- name: Configure AWS credentials (ECom)
  uses: aws-actions/configure-aws-credentials@v4
  if: startsWith(matrix.project, 'ecom-')
  with:
    role-to-assume: ${{ vars.ECOM_OIDC_SSO_DEV_ROLE }}
    role-session-name: 'github_actions-rscom_ecom_sso-dev'
    aws-region: us-west-2
# ... more credential configurations
```

### After

```yaml
env:
  RSCOM_OIDC_SSO_DEV_ROLE: ${{ vars.RSCOM_OIDC_SSO_DEV_ROLE }}
  ECOM_OIDC_SSO_DEV_ROLE: ${{ vars.ECOM_OIDC_SSO_DEV_ROLE }}

... later

- name: Configure AWS Credentials
  uses: ./.github/actions/configure-aws-credentials
  with:
    project: ${{ matrix.project }}
    fallback-access-key-id: ${{ secrets.AWS_NONPROD_ACCESS_KEY_ID }}
    fallback-secret-access-key: ${{ secrets.AWS_NONPROD_SECRET_ACCESS_KEY }}
```

## Implementation

This composite action performs the following steps:

1. **Extract Account Information**: Uses `get-account-from-project.js` to read the project's `project.json` and extract the `account:` tag
2. **Map to Role Variables**: Uses `set-role-from-account.js` to map the account and environment to the appropriate AWS role environment variable
3. **Configure Credentials**: Attempts role assumption first, then falls back to access key authentication if provided
4. **Output Method**: Reports which authentication method was successfully used

The action uses GitHub Scripts to execute the JavaScript modules and `aws-actions/configure-aws-credentials@v4` for the actual credential configuration.

## Error Handling

- **Missing project.json**: Action fails if the project's `project.json` file cannot be found or read
- **Missing account tag**: Action fails if no `account:` tag is found in the project's tags array
- **Unsupported account/environment**: Action fails if the account type or environment combination is not supported
- **Missing role environment variable**: Action fails if the required AWS role environment variable is not set
- **Authentication failure**: If both role assumption and fallback credentials fail, the action will fail

## Troubleshooting

### Common Issues

1. **"No account tag found in project.json tags"**

   - Ensure your project's `project.json` has an `account:` tag in the tags array
   - Example: `"tags": ["account:aura"]`

2. **"No role mapping found for account: [account]"**

   - The account type is not supported by this action
   - Check the supported account types table above

3. **"Environment variable [ROLE_VAR] is not defined"**

   - The required AWS role environment variable is not set in the workflow
   - Ensure the appropriate role variables are configured in your GitHub repository

4. **Role assumption fails**

   - Check that the GitHub repository has the necessary OIDC permissions configured
   - Verify the role ARN is correct and accessible

5. **Permission denied**
   - Ensure the assumed role has the necessary permissions for your workflow
   - Check AWS CloudTrail logs for detailed error information

### Debugging Steps

1. Check that the project has the correct `account:` tag in `project.json`
2. Verify the environment variable for your account/environment combination is set
3. Confirm the role ARN is valid and the role exists in AWS
4. Check GitHub repository OIDC configuration

## Dependencies

- **Required**: `actions/github-script@v7` - Used to execute the JavaScript logic
- **Required**: `aws-actions/configure-aws-credentials@v4` - Used for actual credential configuration
- **Node.js modules**: `fs`, `path` (built-in Node.js modules)

## Contributing

To add support for a new account type:

1. Add the new account mapping to `set-role-from-account.js`:

   ```javascript
   const roleMapping = {
     // ... existing mappings
     'new-account': {
       dev: 'NEW_ACCOUNT_OIDC_SSO_DEV_ROLE',
       prod: 'NEW_ACCOUNT_OIDC_SSO_PROD_ROLE',
     },
   };
   ```

2. Update this README with the new account type in the supported accounts table

3. Ensure the corresponding environment variables are configured in GitHub

## Benefits

1. **Centralized Management**: All AWS credential logic in one place
2. **Consistency**: Standardized role session names and patterns
3. **Maintainability**: Easy to add new project types or modify existing ones
4. **Reduced Duplication**: Eliminates copy-paste errors across workflow files
5. **Environment Support**: Easy to add new environments without touching all workflows
6. **Tag-based Architecture**: Uses project.json tags for flexible, declarative account mapping
