#!/bin/bash
# deploy.sh — push portfolio to GitHub in one shot
# Usage: bash deploy.sh

set -e  # exit on any error

GITHUB_USER="haidmoham"
REPO_NAME="haidmoham.github.io"

echo "🚀 Deploying portfolio to GitHub..."
echo ""

# Make sure we're in the portfolio directory
if [ ! -f "index.html" ]; then
  echo "❌ Error: run this script from the portfolio folder (where index.html lives)"
  exit 1
fi

# Init git if needed
if [ ! -d ".git" ]; then
  echo "📁 Initializing git repo..."
  git init
  git branch -M main
fi

# Stage and commit
echo "📝 Staging files..."
git add .

if git diff --cached --quiet; then
  echo "ℹ️  Nothing to commit — already up to date."
else
  git commit -m "Deploy portfolio"
fi

# Add remote if not already added
if ! git remote | grep -q origin; then
  echo "🔗 Adding GitHub remote..."
  git remote add origin "https://github.com/${GITHUB_USER}/${REPO_NAME}.git"
fi

# Push
echo "⬆️  Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Your site will be live in ~1 minute at:"
echo "   https://${GITHUB_USER}.github.io"
echo ""
echo "Next: configure custom domain in repo Settings → Pages,"
echo "then add Cloudflare DNS records (see README)."
