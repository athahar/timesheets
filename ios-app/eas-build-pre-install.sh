#!/usr/bin/env bash
set -euo pipefail

echo "🔧 EAS pre-install: bundler + pods"

cd "$(dirname "$0")"

if [ -d ios ]; then
  cd ios
  if [ -f "../Gemfile" ]; then
    bundle install --path ../vendor/bundle
    bundle exec pod install --repo-update
  else
    pod install --repo-update
  fi
  cd ..
fi
