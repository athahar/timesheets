#!/usr/bin/env bash
set -euo pipefail

echo "🔧 EAS pre-install: ensure cocoapods on PATH"

# Only needed for iOS builds
if [[ "${EAS_BUILD_PLATFORM:-}" != "ios" ]]; then
  echo "Non-iOS build detected, skipping cocoapods setup"
  exit 0
fi

# Install cocoapods in user gem directory if not already available
export GEM_HOME="$HOME/.rubygems"
export PATH="$GEM_HOME/bin:$PATH"

if ! command -v pod >/dev/null 2>&1; then
  echo "📦 Installing CocoaPods..."
  gem install --user-install cocoapods -v 1.14.3 --no-document
else
  echo "✅ CocoaPods already installed: $(pod --version)"
fi
# Provide a stable shim inside the project (optional safety)
mkdir -p ".eas/bin"
cat > ".eas/bin/pod" <<'EOF'
#!/usr/bin/env bash
exec pod "$@"
EOF
chmod +x ".eas/bin/pod"

# Persist env so later build phases see CocoaPods on PATH
{
  echo "export GEM_HOME=\"$HOME/.rubygems\""
  echo "export PATH=\"$(pwd)/.eas/bin:$HOME/.rubygems/bin:\$PATH\""
} >> "$EAS_BUILD_ENVIRONMENT"

echo "PATH=$PATH"
echo "Using pod: $(command -v pod || echo 'not yet available')"
echo "pod version: $(pod --version || echo 'unknown')"
