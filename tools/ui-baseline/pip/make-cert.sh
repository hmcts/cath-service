#!/usr/bin/env bash
# Creates a local CA and a localhost certificate for pip-frontend's HTTPS, so browsers stop
# warning once the CA is trusted on the machine running the browser. The CA is name-constrained
# to localhost/127.0.0.1: even if its key leaked it could not vouch for any other site.
# Keys stay in CERT_DIR (outside the repo); only the CA certificate is meant to be shared.
set -euo pipefail

CERT_DIR="${1:?usage: make-cert.sh <directory for keys and certificates>}"
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

if [ ! -f parity-local-ca.key ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 -sha256 \
    -subj "/CN=CaTH parity local CA (localhost only)" \
    -keyout parity-local-ca.key -out parity-local-ca.crt \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -addext "nameConstraints=critical,permitted;DNS:localhost,permitted;IP:127.0.0.1/255.255.255.255" 2>/dev/null
fi

# Browsers reject leaf certificates valid for more than 398 days
openssl req -newkey rsa:2048 -nodes -sha256 -subj "/CN=localhost" -keyout localhost.key -out localhost.csr 2>/dev/null
openssl x509 -req -in localhost.csr -CA parity-local-ca.crt -CAkey parity-local-ca.key -CAcreateserial \
  -days 397 -sha256 -out localhost.crt \
  -extfile <(printf "subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n") 2>/dev/null
rm -f localhost.csr

echo "CA certificate to trust in your browser's OS: $CERT_DIR/parity-local-ca.crt"
