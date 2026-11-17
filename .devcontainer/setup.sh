#!/usr/bin/env bash
set -e

# Load nvm
export NVM_DIR="/usr/local/share/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Use project-specified Node version (or LTS)
nvm install
nvm use
corepack enable

# Optional: ensure Playwright browsers are installed globally
npx playwright install --with-deps

# Install kubelogin for AKS authentication
echo "Installing kubelogin..."
KUBELOGIN_VERSION=$(curl -s https://api.github.com/repos/Azure/kubelogin/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
curl -sSL "https://github.com/Azure/kubelogin/releases/download/${KUBELOGIN_VERSION}/kubelogin-linux-amd64.zip" -o /tmp/kubelogin.zip
unzip -q /tmp/kubelogin.zip -d /tmp
sudo mv /tmp/bin/linux_amd64/kubelogin /usr/local/bin/
sudo chmod +x /usr/local/bin/kubelogin
rm -rf /tmp/kubelogin.zip /tmp/bin
echo "✅ kubelogin ${KUBELOGIN_VERSION} installed"

# Install hai (HMCTS AI CLI) and Claude Code
# hai runs Claude Code with the HMCTS model route and credentials, and execs `claude` from
# PATH, so claude-code goes in alongside it. Both go under the default Node version, in a
# subshell: an interactive shell gets the default, not the .nvmrc version selected above,
# so globals installed under that one would be off PATH. Unpinned because hai updates
# itself when it runs. The hmcts-lib feed allows anonymous reads so no npm auth is needed,
# and the registry is scoped to @hmcts-cft so claude-code still comes from npmjs.
# Not fatal under `set -e` — the dev container is usable without it.
echo "Installing hai and Claude Code..."
if (
  nvm use default
  npm install -g \
    --@hmcts-cft:registry=https://pkgs.dev.azure.com/hmcts/Artifacts/_packaging/hmcts-lib/npm/registry/ \
    @anthropic-ai/claude-code @hmcts-cft/hai-cli
); then
  echo "✅ hai and Claude Code installed — start a session with 'hai'"
else
  echo "⚠️  Could not install hai; re-run the npm install from .devcontainer/setup.sh by hand"
fi

# Configure bash history for unlimited size
echo "Configuring bash history..."
cat >> /home/vscode/.bashrc << 'EOF'

# Unlimited bash history
HISTSIZE=-1
HISTFILESIZE=-1
EOF
echo "✅ Bash history configured"

echo "✅ Dev container setup complete."
