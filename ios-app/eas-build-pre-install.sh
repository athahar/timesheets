#!/usr/bin/env bash

set -euo pipefail

echo "🔧 EAS Pre-Install Hook: Setting up CocoaPods for Widget Extension"

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if ios directory exists (bare workflow)
if [ -d "ios" ]; then
  echo "✅ Found ios/ directory (bare workflow detected)"

  # Install CocoaPods if not already installed
  if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    sudo gem install cocoapods
  else
    echo "✅ CocoaPods already installed: $(pod --version)"
  fi

  # Install pods
  echo "📦 Installing iOS dependencies..."
  cd ios
  pod install --repo-update
  cd ..

  echo "✅ CocoaPods setup complete"
else
  echo "⚠️ No ios/ directory found, skipping pod install"
fi
