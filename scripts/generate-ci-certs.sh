#!/bin/bash

set -e

echo "🔐 Generating self-signed certificates for CI..."
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CERTS_DIR="$PROJECT_ROOT/apps/web/certs"

# Create certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

# Generate self-signed certificate using OpenSSL
cd "$CERTS_DIR"
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout localhost-key.pem \
  -out localhost.pem \
  -days 30 \
  -subj "/CN=localhost"

# Set appropriate permissions
chmod 600 localhost-key.pem
chmod 644 localhost.pem

echo ""
echo "✅ Certificates generated successfully!"
echo ""
echo "Certificate files created:"
echo "  - $CERTS_DIR/localhost.pem"
echo "  - $CERTS_DIR/localhost-key.pem"
echo ""
echo "Note: These are self-signed certificates for CI testing only."
echo "Playwright will ignore certificate errors with ignoreHTTPSErrors: true"
