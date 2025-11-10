#!/bin/bash
# Git History Cleanup Script
# This removes exposed AWS credentials from ALL git history

set -e

echo "========================================="
echo "AWS CREDENTIALS - GIT HISTORY CLEANUP"
echo "========================================="
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  All collaborators will need to re-clone the repo"
echo ""
echo "This script will:"
echo "1. Remove aws/credentials from all commits"
echo "2. Remove .env files from all commits"
echo "3. Force push to GitHub"
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Installing git-filter-repo (if needed)..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "git-filter-repo not found. Installing..."
    pip3 install git-filter-repo || pip install git-filter-repo
fi

echo ""
echo "Step 2: Creating backup..."
cd ..
cp -r Jouster Jouster-backup-$(date +%Y%m%d-%H%M%S)
cd Jouster

echo ""
echo "Step 3: Removing sensitive files from git history..."
git filter-repo --path aws/credentials --invert-paths --force
git filter-repo --path .env --invert-paths --force
git filter-repo --path aws/config --invert-paths --force

echo ""
echo "Step 4: Verifying removal..."
if git log --all --full-history -- aws/credentials | grep -q "commit"; then
    echo "❌ ERROR: aws/credentials still found in history!"
    exit 1
else
    echo "✅ aws/credentials removed from history"
fi

if git log --all --full-history -- .env | grep -q "commit"; then
    echo "❌ ERROR: .env still found in history!"
    exit 1
else
    echo "✅ .env removed from history"
fi

echo ""
echo "Step 5: Ready to force push to GitHub"
echo ""
echo "⚠️  IMPORTANT: Run these commands to push:"
echo ""
echo "    git remote add origin-clean https://github.com/beffjarker/Jouster.git"
echo "    git push origin-clean --force --all"
echo "    git push origin-clean --force --tags"
echo ""
echo "After force push:"
echo "1. Verify credentials are gone: https://github.com/beffjarker/Jouster/commits"
echo "2. Notify AWS support that history is cleaned"
echo "3. Delete old access keys in AWS IAM"
echo "4. Create new access keys"
echo "5. Add new keys to GitHub Secrets"
echo ""
echo "========================================="
echo "✅ CLEANUP COMPLETE"
echo "========================================="

