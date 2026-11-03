/**
 * Load secrets from AWS Secrets Manager into process.env.
 *
 * SECRETS_ARNS is a comma-separated list of secret ARNs (set by Terraform from
 * `secret_arns`). Each secret's SecretString must be a JSON object of
 * `{ "ENV_VAR_NAME": "value" }`. Variables already present in the environment are
 * not overwritten. No-op when SECRETS_ARNS is unset (local dev, previews).
 *
 * @module config/secrets
 */

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {{ getSecretValue: (params: { SecretId: string }) => { promise: () => Promise<{ SecretString?: string }> } }} [client]
 * @returns {Promise<string[]>} the names of the variables that were set
 */
async function loadSecretsIntoEnv(env = process.env, client) {
  const arns = (env.SECRETS_ARNS || '')
    .split(',')
    .map((arn) => arn.trim())
    .filter(Boolean);

  if (arns.length === 0) {
    return [];
  }

  let secretsClient = client;
  if (!secretsClient) {
    const AWS = require('aws-sdk');
    secretsClient = new AWS.SecretsManager({ region: env.AWS_REGION || 'us-west-2' });
  }

  const loaded = [];
  for (const arn of arns) {
    const { SecretString } = await secretsClient.getSecretValue({ SecretId: arn }).promise();
    let values;
    try {
      values = JSON.parse(SecretString || '{}');
    } catch {
      throw new Error(`Secret ${arn} is not a JSON object of environment variables`);
    }
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new Error(`Secret ${arn} is not a JSON object of environment variables`);
    }
    for (const [name, value] of Object.entries(values)) {
      if (env[name] === undefined && typeof value === 'string') {
        env[name] = value;
        loaded.push(name);
      }
    }
  }

  return loaded;
}

module.exports = { loadSecretsIntoEnv };
