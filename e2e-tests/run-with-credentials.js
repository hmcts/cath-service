#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

const VAULT_NAME = 'pip-bootstrap-stg-kv';
const VAULT_URL = `https://${VAULT_NAME}.vault.azure.net`;

const SECRET_MAPPINGS = {
  'sso-test-system-admin-account-user': 'SSO_TEST_SYSTEM_ADMIN_EMAIL',
  'sso-test-system-admin-account-pwd': 'SSO_TEST_SYSTEM_ADMIN_PASSWORD',
  'sso-test-admin-local-account-user': 'SSO_TEST_LOCAL_ADMIN_EMAIL',
  'sso-test-admin-local-account-pwd': 'SSO_TEST_LOCAL_ADMIN_PASSWORD',
  'sso-test-admin-account-ctsc-user': 'SSO_TEST_CTSC_ADMIN_EMAIL',
  'sso-test-admin-account-ctsc-pwd': 'SSO_TEST_CTSC_ADMIN_PASSWORD',
  'sso-test-no-roles-account-user': 'SSO_TEST_NO_ROLES_EMAIL',
  'sso-test-no-roles-account-pwd': 'SSO_TEST_NO_ROLES_PASSWORD',
  'cft-valid-test-account': 'CFT_VALID_TEST_ACCOUNT',
  'cft-valid-test-account-password': 'CFT_VALID_TEST_ACCOUNT_PASSWORD',
  'cft-invalid-test-account': 'CFT_INVALID_TEST_ACCOUNT',
  'cft-invalid-test-account-password': 'CFT_INVALID_TEST_ACCOUNT_PASSWORD',
  'app-tenant': 'AZURE_TENANT_ID',
  'app-pip-data-management-id': 'AZURE_API_CLIENT_ID',
  'app-pip-data-management-pwd': 'AZURE_API_CLIENT_SECRET',
};

async function loadCredentialsFromAzure() {
  console.log('🔐 Loading test credentials from Azure Key Vault...');
  console.log(`📥 Fetching secrets from ${VAULT_NAME}...`);

  try {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(VAULT_URL, credential);

    const credentials = {};

    for (const [secretName, envVarName] of Object.entries(SECRET_MAPPINGS)) {
      try {
        const secret = await client.getSecret(secretName);
        credentials[envVarName] = secret.value;
      } catch (error) {
        console.error(`❌ Failed to fetch secret: ${secretName}`);
        throw error;
      }
    }

    // Validate all credentials were loaded
    const missingCreds = Object.values(SECRET_MAPPINGS).filter(
      (envVar) => !credentials[envVar]
    );

    if (missingCreds.length > 0) {
      throw new Error(`Missing credentials: ${missingCreds.join(', ')}`);
    }

    console.log('✅ Test credentials loaded successfully');
    console.log('');
    console.log('SSO Credentials:');
    console.log(`  - System Admin: ${credentials.SSO_TEST_SYSTEM_ADMIN_EMAIL}`);
    console.log(`  - Local Admin: ${credentials.SSO_TEST_LOCAL_ADMIN_EMAIL}`);
    console.log(`  - CTSC Admin: ${credentials.SSO_TEST_CTSC_ADMIN_EMAIL}`);
    console.log(`  - No Roles User: ${credentials.SSO_TEST_NO_ROLES_EMAIL}`);
    console.log('');
    console.log('CFT IDAM Credentials:');
    console.log(`  - Valid Account: ${credentials.CFT_VALID_TEST_ACCOUNT}`);
    console.log(`  - Invalid Account: ${credentials.CFT_INVALID_TEST_ACCOUNT}`);
    console.log('');

    return credentials;
  } catch (error) {
    console.error('');
    console.error('❌ Error loading credentials from Azure Key Vault');
    console.error('');
    console.error('Please check:');
    console.error('1. You are authenticated to Azure CLI (run: az login)');
    console.error('2. You have access to the Key Vault');
    console.error('3. Your Azure subscription is set correctly');
    console.error('');
    throw error;
  }
}

async function runPlaywright() {
  const args = process.argv.slice(2);

  // Check if running in CI
  if (process.env.CI === 'true') {
    console.log('ℹ️  Running in CI - using GitHub Secrets for SSO and CFT IDAM test credentials');
    console.log('');
  } else {
    // Load credentials from Azure Key Vault
    try {
      const credentials = await loadCredentialsFromAzure();

      // Set credentials as environment variables for Playwright
      for (const [key, value] of Object.entries(credentials)) {
        process.env[key] = value;
      }
    } catch (error) {
      console.error('Failed to load credentials:', error.message);
      process.exit(1);
    }
  }

  // Spawn Playwright with all environment variables
  console.log('🎭 Starting Playwright tests...');
  console.log('');

  const playwright = spawn('npx', ['playwright', 'test', ...args], {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  playwright.on('close', (code) => {
    process.exit(code || 0);
  });

  playwright.on('error', (error) => {
    console.error('Failed to start Playwright:', error);
    process.exit(1);
  });
}

runPlaywright().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
