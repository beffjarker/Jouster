# WSL2 Installation Guide for Jouster Project

This guide will help you install WSL2 to properly run the DynamoDB conversation history system.

## Prerequisites Check

First, verify your Windows version supports WSL2:
- Windows 10 version 2004 and higher (Build 19041 and higher)
- Windows 11 (all versions)

Check your version: `winver`

## Installation Steps

### Option 1: Modern Installation (Windows 10 2004+/Windows 11)

1. **Run as Administrator** - Open PowerShell or Command Prompt as Administrator
2. **Install WSL2**:
   ```powershell
   wsl --install
   ```
3. **Restart your computer** when prompted
4. **Set up Ubuntu** (will launch automatically after restart)

### Option 2: Manual Installation (if Option 1 fails)

Run these commands **as Administrator** in PowerShell:

```powershell
# Enable WSL feature
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# Enable Virtual Machine Platform
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# Restart computer (required)
# After restart, run:
wsl --set-default-version 2

# Install Ubuntu from Microsoft Store or via PowerShell:
wsl --install -d Ubuntu
```

### Option 3: Microsoft Store Installation

1. Open Microsoft Store
2. Search for "Ubuntu" or "WSL"
3. Install "Ubuntu" (latest version)
4. Launch Ubuntu from Start Menu
5. Complete initial setup (username/password)

## After WSL2 Installation

Once WSL2 is installed and Ubuntu is running, you'll need to install the required tools:

### 1. Update Ubuntu packages:
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install AWS CLI:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt install unzip
unzip awscliv2.zip
sudo ./aws/install
```

### 3. Install Docker (for DynamoDB Local):
```bash
sudo apt install docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 4. Install Docker Compose:
```bash
sudo apt install docker-compose
```

## Verify Installation

Test that everything works:
```bash
# Check WSL version
wsl --status

# Check AWS CLI
aws --version

# Check Docker
docker --version
docker-compose --version
```

## Next Steps for Conversation History

After WSL2 is installed:

1. **Navigate to your project** in WSL2:
   ```bash
   cd /mnt/h/projects/Jouster/conversation-history
   ```

2. **Start DynamoDB**:
   ```bash
   docker-compose up -d
   ```

3. **Initialize tables**:
   ```bash
   ./init-tables.sh
   ```

## Troubleshooting

### Common Issues:

1. **"WSL 2 requires an update to its kernel component"**
   - Download and install: https://aka.ms/wsl2kernel

2. **"Please enable the Virtual Machine Platform Windows feature"**
   - Run: `dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart`
   - Restart computer

3. **Docker permission denied**
   - Run: `sudo usermod -aG docker $USER`
   - Logout and login to WSL2

4. **Can't access Windows files**
   - Windows drives are mounted at `/mnt/c/`, `/mnt/h/`, etc.

### Performance Tips:
- Store project files in WSL2 filesystem for better performance: `~/projects/`
- Use Windows Terminal for better WSL2 experience
- Install VS Code WSL extension for development
