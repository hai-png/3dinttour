# Building for Windows

This guide explains how to build the 3D Virtual Tour application for Windows.

## Quick Start (Automated Build)

The easiest way to get a Windows executable is through **GitHub Actions**:

1. Go to the repository on GitHub: https://github.com/hai-png/3dinttour
2. Click on the **Actions** tab
3. Select **Build Windows App** workflow
4. Click **Run workflow** (or push a tag like `v1.0.0`)
5. Wait for the build to complete (~10-15 minutes)
6. Download the `.exe` installer from:
   - **Workflow artifacts** (if run manually)
   - **Releases page** (if triggered by a version tag)

## Manual Build (Local)

If you prefer to build locally on a machine with sufficient disk space:

### Prerequisites

- Node.js 18 or later
- At least 2GB free disk space
- Windows, macOS, or Linux

### Steps

```bash
# Install dependencies
npm install

# Build Windows installer
npm run build

# Or build portable version (no installation required)
npm run build:portable
```

The built files will be in the `dist/` folder:
- `3D Virtual Tour Setup X.X.X.exe` - NSIS installer
- `3D Virtual Tour X.X.X.exe` - Portable executable (if using portable build)

## Running in Development

To test the app without building:

```bash
# Start Electron in development mode
npm start
```

## Build Configuration

The build is configured in `package.json`:

```json
{
  "build": {
    "appId": "com.temer.virtour",
    "productName": "3D Virtual Tour",
    "win": {
      "target": ["nsis"],
      "icon": "icon-512.png"
    }
  }
}
```

## Troubleshooting

### "No space left on device"
- Ensure you have at least 2GB free disk space
- Clean npm cache: `npm cache clean --force`
- Remove node_modules and reinstall: `rm -rf node_modules && npm install`

### Build fails on Linux
- Install required dependencies:
  ```bash
  sudo apt-get install --no-install-recommends -y wine64 wine
  ```

### App doesn't start
- Check if all required files are in the build:
  - `index.html`
  - `*.js` files
  - `model/building.glb`
  - `project/` folder
  - `icon-*.png`

## File Size

Expected installer size: ~150-200MB (includes Electron runtime)
