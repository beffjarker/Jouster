module.exports = ({ github, context, core }) => {
  const account = process.env.ACCOUNT;
  const environment = process.env.ENVIRONMENT;

  console.log(
    `Setting role for account: ${account}, environment: ${environment}`
  );

  // Role mapping based on account and environment
  const roleMapping = {
    aura: {
      dev: 'AURA_OIDC_SSO_DEV_ROLE',
      prod: 'AURA_OIDC_SSO_PROD_ROLE',
    },
    rscom: {
      dev: 'RSCOM_OIDC_SSO_DEV_ROLE',
      prod: 'RSCOM_OIDC_SSO_PROD_ROLE',
    },
    'rscom-ecom': {
      dev: 'ECOM_OIDC_SSO_DEV_ROLE',
      prod: 'ECOM_OIDC_SSO_PROD_ROLE',
      qa: 'ECOM_OIDC_SSO_QA_ROLE',
      stg: 'ECOM_OIDC_SSO_STG_ROLE',
    },
  };

  // Get the appropriate role based on account and environment
  const accountRoles = roleMapping[account];
  if (!accountRoles) {
    console.log(`No role mapping found for account: ${account}`);
    return;
  }

  const roleVar = accountRoles[environment];
  if (!roleVar) {
    core.setFailed(
      `No role found for account: ${account}, environment: ${environment}`
    );
    return;
  }

  // Get the actual role ARN from the environment variable
  const roleArn = process.env[roleVar];
  if (!roleArn) {
    core.setFailed(`Environment variable ${roleVar} is not defined`);
    return;
  }

  console.log(`Selected role variable: ${roleVar}, ARN: ${roleArn}`);
  core.setOutput('role-arn', roleArn);

  return { roleArn };
};
