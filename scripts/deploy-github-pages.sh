#!/bin/bash
# GitHub Pages Build and Deploy Script
# Prepares and deploys the project to GitHub Pages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_DIR/build"
GITHUB_REPO="github.com:hai-png/3dtour.git"
BRANCH="gh-pages"

echo "=========================================="
echo "  GitHub Pages Build & Deploy"
echo "=========================================="
echo "  Project: $PROJECT_DIR"
echo "  Repo:    $GITHUB_REPO"
echo "  Branch:  $BRANCH"
echo "=========================================="
echo ""

# Step 1: Run media optimization
echo "📦 Step 1: Optimizing media files..."
echo ""
bash "$SCRIPT_DIR/optimize-images.sh"
echo ""
echo "⚠️  Skipping video optimization (videos already optimized)"
# bash "$SCRIPT_DIR/optimize-videos.sh"  # Videos are already optimized
echo ""

# Step 2: Create clean build directory
echo "📦 Step 2: Creating build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy essential files for GitHub Pages
echo "  Copying files to build directory..."
cp "$PROJECT_DIR/index.html" "$BUILD_DIR/"
cp "$PROJECT_DIR/icon.svg" "$BUILD_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/icon-192.png" "$BUILD_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/icon-512.png" "$BUILD_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/temerlogo.png" "$BUILD_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/tour-data.json" "$BUILD_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/contact-config.json" "$BUILD_DIR/" 2>/dev/null || true

# Copy directories
cp -r "$PROJECT_DIR/gallery" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/panorama" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/hdr" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/model" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/2d-floor-plan" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/3d-floor-plan" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/unit-image-video" "$BUILD_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/project" "$BUILD_DIR/" 2>/dev/null || true

# Create manifest.json if it doesn't exist
if [ ! -f "$BUILD_DIR/manifest.json" ]; then
    echo "  Creating manifest.json..."
    cat > "$BUILD_DIR/manifest.json" << 'EOF'
{
  "name": "3D Interactive Tour",
  "short_name": "3DTour",
  "description": "Interactive 3D property tour",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d1117",
  "theme_color": "#0d1117",
  "orientation": "landscape",
  "icons": [
    {
      "src": "icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
EOF
fi

# Create .nojekyll file to prevent Jekyll processing
touch "$BUILD_DIR/.nojekyll"

# Create CNAME file if you want custom domain (optional)
# echo "yourdomain.com" > "$BUILD_DIR/CNAME"

echo ""

# Step 3: Initialize git repo in build directory
echo "📦 Step 3: Preparing git repository..."
cd "$BUILD_DIR"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
fi

# Configure git for GitHub Pages
git config user.name "GitHub Actions Bot"
git config user.email "actions@github.com"

# Add all files
git add -A

# Check if there are changes
if git diff --staged --quiet; then
    echo "  No changes to deploy."
    exit 0
fi

# Commit changes
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
git commit -m "Deploy to GitHub Pages - $TIMESTAMP"

echo ""

# Step 4: Deploy to GitHub
echo "📦 Step 4: Deploying to GitHub..."

# Check if remote exists
if ! git remote | grep -q "origin"; then
    git remote add origin "git@$GITHUB_REPO"
else
    git remote set-url origin "git@$GITHUB_REPO"
fi

# Fetch latest from origin
git fetch origin || true

# Check if gh-pages branch exists
if git branch -r | grep -q "origin/$BRANCH"; then
    echo "  Branch $BRANCH exists, pushing changes..."
else
    echo "  Creating $BRANCH branch..."
fi

# Force push to gh-pages branch
git push -f origin HEAD:$BRANCH

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo "  Your site will be available at:"
echo "  https://hai-png.github.io/3dtour/"
echo ""
echo "  Note: It may take 1-2 minutes for"
echo "  changes to propagate on GitHub Pages."
echo "=========================================="
