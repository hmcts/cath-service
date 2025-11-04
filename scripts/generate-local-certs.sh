#!/bin/bash

set -e

echo "🔐 Generating local HTTPS certificates with mkcert..."
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ Error: mkcert is not installed"
    echo ""
    echo "Please install mkcert first:"
    echo ""
    echo "  macOS:   brew install mkcert"
    echo "  Windows: choco install mkcert"
    echo "  Linux:   See https://github.com/FiloSottile/mkcert#installation"
    echo ""
    echo "After installation, run: mkcert -install"
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CERTS_DIR="$PROJECT_ROOT/apps/web/certs"

# Create certs directory if it doesn't exist
mkdir -p "$CERTS_DIR"

# Generate certificate for localhost
cd "$CERTS_DIR"
mkcert localhost 127.0.0.1 ::1

# Rename files to expected names
mv localhost+2.pem localhost.pem
mv localhost+2-key.pem localhost-key.pem

echo ""
echo "✅ Certificates generated successfully!"
echo ""
echo "Certificate files created:"
echo "  - $CERTS_DIR/localhost.pem"
echo "  - $CERTS_DIR/localhost-key.pem"
echo ""
echo "You can now run 'yarn dev' to start the server with HTTPS."
echo "Access the application at: https://localhost:8080"
