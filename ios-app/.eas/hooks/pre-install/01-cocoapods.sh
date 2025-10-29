#!/usr/bin/env bash
set -euo pipefail
echo "🔧 EAS pre-install: bundler + pods"
PROJECT_ROOT="${PROJECT_ROOT:-$(pwd)}"
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo "Current directory: $(pwd)"

cd "$PROJECT_ROOT"
echo "After cd PROJECT_ROOT: $(pwd)"

if [ ! -d ios ]; then
  echo "❌ No ios/ directory found at $(pwd)"
  exit 1
fi

echo "✅ Found ios/ directory"

# Ensure bundler dependencies (includes CocoaPods) are installed locally
if [ -f Gemfile ]; then
  echo "📦 Installing bundler gems (includes CocoaPods)..."
  bundle install --path vendor/bundle --quiet
  echo "✅ Gems installed"

  echo "🔧 Creating pod shim for PATH..."
  BUNDLE_BIN="$(bundle exec ruby -e 'puts Gem.bindir')"
  mkdir -p ".eas/pod-shim"
  cat <<'EOF' > ".eas/pod-shim/pod"
#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"
bundle exec pod "$@"
EOF
  chmod +x ".eas/pod-shim/pod"

  echo "✅ Pod shim created at $(pwd)/.eas/pod-shim/pod"
  echo "PATH=$(pwd)/.eas/pod-shim:$PATH" >> "$EAS_BUILD_ENVIRONMENT"
else
  echo "⚠️  No Gemfile found, attempting to use system pod"
fi

echo "📦 Running pod install via bundler..."
cd ios
bundle exec pod install --repo-update
cd ..

echo "✅ Pod install complete"
