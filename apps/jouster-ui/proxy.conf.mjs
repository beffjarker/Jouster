// Dynamic proxy configuration — reads PROXY_TARGET from .env or environment.
//
// Priority: shell env var > .env file > default ('qa')
//
// Usage:
//   nx serve jouster-ui                                    → uses .env PROXY_TARGET (or defaults to QA)
//   $env:PROXY_TARGET='prod'; nx serve jouster-ui          → overrides .env, targets production
//
// Or just set PROXY_TARGET in your .env file:
//   PROXY_TARGET=local    → localhost:3001
//   PROXY_TARGET=qa       → api-qa.jouster.org (default)
//   PROXY_TARGET=stg      → api-stg.jouster.org
//   PROXY_TARGET=prod     → jouster.org (production)
//   PROXY_TARGET=lambda   → API Gateway directly
//
// Shell override (temporary, single session):
//   Windows cmd:    set PROXY_TARGET=prod && nx serve jouster-ui
//   PowerShell:     $env:PROXY_TARGET='prod'; nx serve jouster-ui
//   bash/zsh:       PROXY_TARGET=prod nx serve jouster-ui

import dotenv from 'dotenv';
dotenv.config();

const targets = {
  local:   'http://localhost:3000',
  nonprod: 'https://api-nonprod.jouster.org',
  qa:      'https://api-qa.jouster.org',
  stg:     'https://api-stg.jouster.org',
  prod:    'https://jouster.org',
  lambda:  'https://jouster.org',  // API Gateway via CloudFront — same as prod for now
};

const target = process.env.PROXY_TARGET || 'qa';
const url = targets[target] || targets.qa;

// Warn if targeting production
if (target === 'prod' || target === 'lambda') {
  console.warn('\n⚠️  PROXY_TARGET=' + target + ' — Local UI is connecting to PRODUCTION backend!\n');
}

console.log('🔗 Proxy /api → ' + url + ' (PROXY_TARGET=' + target + ')');

const isRemote = target !== 'local';

export default {
  '/api': {
    target: url,
    secure: true,
    changeOrigin: true,
    // For remote targets: rewrite Origin header so the backend CORS policy accepts the request,
    // and rewrite cookie domains so session cookies work on localhost.
    ...(isRemote && {
      headers: {
        Origin: url,
      },
      cookieDomainRewrite: {
        '*': 'localhost',
      },
    }),
  },
};

