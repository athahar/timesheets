#!/usr/bin/env bash
set -euo pipefail
echo "🔧 EAS pre-install: bundler + pods"
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo "Current directory: $(pwd)"

cd "$PROJECT_ROOT"
echo "After cd PROJECT_ROOT: $(pwd)"

if [ -d ios ]; then
  echo "✅ Found ios/ directory"

  # Install bundler gems first
  if [ -f Gemfile ]; then
    echo "✅ Found Gemfile, installing gems..."
    bundle install --path vendor/bundle --quiet
    echo "✅ Gems installed"
  fi

  # Install pods
  cd ios
  echo "Now in: $(pwd)"

  if [ -f ../Gemfile ]; then
    echo "📦 Installing pods with bundler..."
    bundle exec pod install --repo-update
    echo "✅ Pods installed via bundler"
  else
    echo "⚠️  No Gemfile found, using system pod"
    pod install --repo-update
  fi

  cd ..
else
  echo "❌ No ios/ directory found at $(pwd)"
  exit 1
fi

echo "✅ Pod install complete"
