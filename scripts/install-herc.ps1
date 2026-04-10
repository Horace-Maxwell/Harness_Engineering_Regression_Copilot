$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 18+ is required but was not found in PATH."
}

$nodeVersion = node -p "process.versions.node"
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 18) {
  throw "Node.js 18+ is required. Found v$nodeVersion."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm is required but was not found in PATH."
}

$installCommand = "install"
if (Test-Path "package-lock.json") {
  $installCommand = "ci"
}

Write-Host "Installing dependencies..."
npm $installCommand

Write-Host "Building HERC..."
npm run build

Write-Host "Linking herc into your local npm bin..."
npm link

Write-Host "Done. Run 'herc version' to verify the install."
