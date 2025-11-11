# Jouster Tools Directory

This directory contains development and analysis tools used in the Jouster project.

## Tools Overview

### FFDec (Free Flash Decompiler) v19.1.0
**Location:** `tools/ffdec/`
**Purpose:** Decompiling and analyzing Adobe Flash SWF files for the Flash Experiments feature

#### Installation Details
- **Version:** 19.1.0 (Released: 2023-10-16)
- **Platform:** Cross-platform (Windows, macOS, Linux)
- **License:** GPL v3+ (see `tools/ffdec/license.txt`)

#### Available Executables
- **Windows:** `ffdec.exe` - Native Windows executable
- **Cross-platform:** `ffdec.jar` - Java JAR file (requires Java Runtime)
- **Batch Scripts:** 
  - `ffdec.bat` - Windows batch launcher
  - `ffdec.sh` - Unix/Linux shell launcher

#### Key Features (v19.1.0)
- Mochicrypt packed binarydata tags support
- DefineSprite replacement with GIF imports
- SVG frames/shapes export with advanced features
- AS1/2/3 P-code decompilation with inline documentation
- Shape point editing and transformation
- Command-line interface for automation

#### Usage Examples

**Basic Decompilation (Windows):**
```bash
cd tools/ffdec
ffdec.exe path/to/file.swf
```

**Command Line Export (Cross-platform):**
```bash
cd tools/ffdec  
java -jar ffdec.jar -export script,image,sound output_folder input.swf
```

**Extract Assets for Flash Experiments:**
```bash
cd tools/ffdec
ffdec.exe -export all ../extracted_content/ ../../temp_flash_exps/example.swf
```

#### Dependencies
- **Java Runtime:** Required for JAR execution (Java 8+ recommended)
- **Libraries:** All required libraries included in `lib/` directory
- **Native Libraries:** Platform-specific libraries included

#### Integration with Jouster
FFDec is used to analyze and extract assets from Flash files in the `temp_flash_exps/` directory for the Flash Experiments feature. Extracted content is processed and converted to modern web technologies (Canvas, WebGL, etc.).

## Tool Management Guidelines

### Adding New Tools
1. Create a dedicated subdirectory in `tools/`
2. Include all executables and dependencies
3. Add documentation to this README
4. Update `.gitignore` if needed for large binaries

### Version Management
- Keep only the latest stable version of each tool
- Document version numbers and release dates
- Remove old versions and duplicate files
- Maintain changelog information when available

### Platform Compatibility
- Prioritize cross-platform tools when possible
- Include platform-specific executables when necessary
- Provide clear usage instructions for each platform
- Test tools on the primary development environment

## File Structure
```
tools/
├── README.md                 # This documentation
├── ffdec/                   # FFDec Flash Decompiler v19.1.0
│   ├── ffdec.exe           # Windows executable
│   ├── ffdec.jar           # Cross-platform JAR
│   ├── ffdec.bat           # Windows launcher script
│   ├── ffdec.sh            # Unix/Linux launcher script
│   ├── CHANGELOG.md        # Version history
│   ├── license.txt         # GPL v3+ license
│   ├── lib/                # Required libraries
│   └── flashlib/           # Flash runtime libraries
└── flash_files_list.txt    # Flash files inventory
```

## Security and Compliance

### License Compliance
- FFDec: GPL v3+ - Source code attribution required for distribution
- All library licenses documented in respective `.license.txt` files

### Security Considerations
- Tools are used for analysis of legacy Flash content only
- No network connectivity required for core functionality
- All executables scanned and verified from official sources

## Troubleshooting

### Common Issues

**Java Runtime Not Found:**
```bash
# Install Java Runtime Environment
# Windows: Download from Oracle or use chocolatey
choco install javaruntime

# Verify installation
java -version
```

**Permission Denied (Unix/Linux):**
```bash
# Make scripts executable
chmod +x tools/ffdec/ffdec.sh
```

**Large SWF Files:**
- Increase Java heap size: `java -Xmx2g -jar ffdec.jar`
- Use command-line mode for batch processing
- Consider breaking large files into smaller components

### Getting Help
- FFDec Documentation: Check `CHANGELOG.md` for version-specific features
- Java Issues: Verify Java Runtime Environment installation
- Flash Content: Refer to Flash Experiments documentation

## Related Documentation
- [Flash Experiments Architecture](../FLASH_EXPERIMENTS_ARCHITECTURE.md)
- [Complete Flash Analysis](../COMPLETE_FLASH_EXPERIMENTS_ANALYSIS.md)
- [Main Project README](../README.md)
