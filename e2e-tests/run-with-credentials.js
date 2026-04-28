#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the parent directory
config({ path: path.resolve(__dirname, '../.env') });

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
        console.log(`  ✓ Loaded secret: ${secretName} → ${envVarName}`);
      } catch (error) {
        console.error(`  ❌ Failed to fetch secret: ${secretName} (${error.message})`);
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

    console.log('✅ Test credentials loaded successfully from Key Vault');
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
    if (process.env.CI === 'true') {
      console.error('Running in CI - ensure the runner has Azure credentials configured:');
      console.error('  - Workload Identity (OIDC) configured for the GitHub Actions runner, OR');
      console.error('  - AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID are set as env vars');
    } else {
      console.error('Please check:');
      console.error('1. You are authenticated to Azure CLI (run: az login)');
      console.error('2. You have access to the Key Vault');
      console.error('3. Your Azure subscription is set correctly');
    }
    console.error('');
    throw error;
  }
}

async function runPlaywright() {
  const args = process.argv.slice(2);

  // Load credentials from Azure Key Vault (works both locally and in CI via workload identity)
  console.log(process.env.CI === 'true' ? 'ℹ️  Running in CI' : 'ℹ️  Running locally');
  console.log('');

  try {
    const credentials = await loadCredentialsFromAzure();

    // Set credentials as environment variables for Playwright
    for (const [key, value] of Object.entries(credentials)) {
      process.env[key] = value;
    }
  } catch (error) {
    console.error('Failed to load credentials from Key Vault:', error.message);
    process.exit(1);
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
