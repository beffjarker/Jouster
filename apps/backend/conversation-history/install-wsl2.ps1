# WSL2 Installation Script for Jouster Project
# Run this script as Administrator in PowerShell

Write-Host "Installing WSL2 for Jouster Conversation History System..." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# Check Windows version
$version = [System.Environment]::OSVersion.Version
Write-Host "Windows Version: $($version.Major).$($version.Minor).$($version.Build)" -ForegroundColor Yellow

if ($version.Build -lt 19041) {
    Write-Host "ERROR: WSL2 requires Windows 10 build 19041 or higher" -ForegroundColor Red
    Write-Host "Please update Windows and try again" -ForegroundColor Red
    exit 1
}

try {
    # Modern installation method (Windows 10 2004+)
    Write-Host "Attempting modern WSL installation..." -ForegroundColor Cyan
    wsl --install

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: WSL2 installation initiated!" -ForegroundColor Green
        Write-Host "NEXT STEPS:" -ForegroundColor Yellow
        Write-Host "1. Restart your computer when prompted" -ForegroundColor White
        Write-Host "2. Ubuntu will launch automatically after restart" -ForegroundColor White
        Write-Host "3. Set up username and password in Ubuntu" -ForegroundColor White
        Write-Host "4. Run the post-installation setup (see WSL2-INSTALLATION.md)" -ForegroundColor White
    } else {
        throw "Modern installation failed, trying manual method..."
    }

} catch {
    Write-Host "Modern installation not available, using manual method..." -ForegroundColor Yellow

    # Manual installation
    Write-Host "Enabling WSL feature..." -ForegroundColor Cyan
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

    Write-Host "Enabling Virtual Machine Platform..." -ForegroundColor Cyan
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

    Write-Host "MANUAL INSTALLATION STEPS INITIATED" -ForegroundColor Green
    Write-Host "NEXT STEPS:" -ForegroundColor Yellow
    Write-Host "1. RESTART your computer now" -ForegroundColor Red
    Write-Host "2. After restart, run: wsl --set-default-version 2" -ForegroundColor White
    Write-Host "3. Install Ubuntu: wsl --install -d Ubuntu" -ForegroundColor White
    Write-Host "4. Follow the remaining steps in WSL2-INSTALLATION.md" -ForegroundColor White
}

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Installation script completed. Check messages above." -ForegroundColor Green
