# scrape-epstein-files.ps1
# Two-phase approach:
#   Phase 1: Scrape all listing pages to build a manifest of file URLs
#   Phase 2: Download all files from the manifest with rate limiting
#
# Usage:
#   .\scripts\scrape-epstein-files.ps1
#   .\scripts\scrape-epstein-files.ps1 -SkipScrape           # Skip phase 1, use existing manifest
#   .\scripts\scrape-epstein-files.ps1 -SkipExisting         # Don't re-download files already on disk
#   .\scripts\scrape-epstein-files.ps1 -DataSets @(1,2,3)    # Specify which data sets to scrape

param(
    [int[]]$DataSets = @(1, 2, 3),
    [string]$OutputDir = ".\downloads\epstein",
    [int]$RateLimitSeconds = 5,
    [int]$PageRateLimitSeconds = 3,
    [int]$MaxRetries = 3,
    [switch]$SkipScrape,
    [switch]$SkipExisting
)

# --- Configuration ---
$BaseUrl = "https://www.justice.gov"
$CookieString = 'nmstat=df771102-d8aa-11c0-f3f7-26266b706c64; ak_bmsc=4DF36BE9975AD4DF56F76009C1BD98CF~000000000000000000000000000000~YAAQ5XLNF+tX4PGdAQAAzFI79R/rJ2nl/Q3xGb69Sndbv6pL6dUy+HBy1DQbNHx79U6QLGtZSgjxrgtuYrSqF6b17Nzr1Z1oiqqRGp0q2YgKk0oEs7BF3fvHhKU2try6JSM2E427srMP4XjW8d/qeZ7u0EjQ313eNgm17TNNIRJCDpOvAEO/ii7W8a6GXujb2kf5s5y9sGrBaLLYzWK4h5pGIlY6dnkt8UuMT/HdCTLSMrONDR9s99WzQ3VGz7l1RJLTLlEw7TkxlxIn0dFKdXuLWicRpamwfiuupYwgrLGtFn3wS8UwzQPykzD5+oZ1cUFA70V0ukZNxNlMgiFCcy6cZPhqnpnSCCLcDJ4KZvbLY1c+60yh7/m2mZxp8B9I9Wwaa7CMZVDTGWW7JHCSViTvuLpCmzWVDzwCT7gsOGkgw5iUKGIc0NWaHCw5TWKCNKVbyoGO+o1FJwsbjw==; justiceGovAgeVerified=true'

$UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'

$Headers = @{
    'accept'                    = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    'accept-language'           = 'en-US,en;q=0.9'
    'referer'                   = 'https://www.justice.gov/epstein'
    'sec-ch-ua'                 = '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"'
    'sec-ch-ua-mobile'          = '?0'
    'sec-ch-ua-platform'        = '"Windows"'
    'sec-fetch-dest'            = 'document'
    'sec-fetch-mode'            = 'navigate'
    'sec-fetch-site'            = 'same-origin'
    'sec-fetch-user'            = '?1'
    'upgrade-insecure-requests' = '1'
}

# --- Data Set URL mapping ---
$DataSetPages = @{
    1 = '/epstein/doj-disclosures/data-set-1-files'
    2 = '/epstein/doj-disclosures/data-set-2-files'
    3 = '/epstein/doj-disclosures/data-set-3-files'
}

# --- Setup ---
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$ManifestFile = Join-Path $OutputDir "file-manifest.txt"
$LogFile = Join-Path $OutputDir "download-log.txt"
$ErrorLog = Join-Path $OutputDir "download-errors.txt"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry
    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN"  { Write-Host $logEntry -ForegroundColor Yellow }
        "OK"    { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry -ForegroundColor White }
    }
}

function Get-WebSession {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $cookiePairs = $CookieString -split '; '
    foreach ($pair in $cookiePairs) {
        $parts = $pair -split '=', 2
        if ($parts.Length -eq 2) {
            $cookie = New-Object System.Net.Cookie
            $cookie.Name = $parts[0]
            $cookie.Value = $parts[1]
            $cookie.Domain = "www.justice.gov"
            $session.Cookies.Add((New-Object System.Uri("https://www.justice.gov")), $cookie)
        }
    }
    return $session
}

# ============================================================
# PHASE 1: Scrape listing pages to build file manifest
# ============================================================
function Scrape-FileManifest {
    Write-Log "=== PHASE 1: Scraping file listing pages ===" "INFO"

    $allUrls = @()

    foreach ($ds in $DataSets) {
        if (-not $DataSetPages.ContainsKey($ds)) {
            Write-Log "Unknown data set: $ds, skipping" "WARN"
            continue
        }

        $basePath = $DataSetPages[$ds]
        Write-Log "Scraping Data Set $ds from $basePath" "INFO"

        # First, get page 0 to determine total pages
        $page = 0
        $hasMore = $true

        while ($hasMore) {
            $url = "$BaseUrl$basePath"
            if ($page -gt 0) {
                $url += "?page=$page"
            }

            Write-Host "  Fetching page $($page + 1): $url" -ForegroundColor Cyan

            try {
                $session = Get-WebSession
                $response = Invoke-WebRequest -Uri $url `
                    -Headers $Headers `
                    -UserAgent $UserAgent `
                    -WebSession $session `
                    -UseBasicParsing `
                    -ErrorAction Stop

                $html = $response.Content

                # Extract file URLs using regex
                $matches = [regex]::Matches($html, 'href="(https://www\.justice\.gov/epstein/files/[^"]+)"')

                $pageFileCount = 0
                foreach ($match in $matches) {
                    $fileUrl = $match.Groups[1].Value
                    $allUrls += $fileUrl
                    $pageFileCount++
                }

                Write-Log "  Page $($page + 1): Found $pageFileCount files" "OK"

                # Check if there's a next page
                if ($html -match "page=$($page + 1)`"") {
                    $page++
                }
                else {
                    $hasMore = $false
                }
            }
            catch {
                $errorMsg = $_.Exception.Message
                Write-Log "Error fetching page $page of Data Set $ds : $errorMsg" "ERROR"

                if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 403) {
                    Write-Log "403 Forbidden - cookies may have expired. Stopping scrape." "ERROR"
                    $hasMore = $false
                }
                else {
                    # Retry once after a longer wait
                    Start-Sleep -Seconds 10
                    $page++
                }
            }

            # Rate limit between page fetches
            if ($hasMore) {
                Start-Sleep -Seconds $PageRateLimitSeconds
            }
        }

        Write-Log "Data Set $ds complete. Total URLs so far: $($allUrls.Count)" "INFO"
    }

    # Write manifest
    $allUrls | Out-File -FilePath $ManifestFile -Encoding utf8
    Write-Log "Manifest saved: $ManifestFile ($($allUrls.Count) files)" "OK"

    return $allUrls
}

# ============================================================
# PHASE 2: Download files from manifest
# ============================================================
function Download-FromManifest {
    param([string[]]$FileUrls)

    Write-Log "=== PHASE 2: Downloading $($FileUrls.Count) files ===" "INFO"

    $totalDownloaded = 0
    $totalSkipped = 0
    $totalErrors = 0
    $totalFiles = $FileUrls.Count

    for ($i = 0; $i -lt $FileUrls.Count; $i++) {
        $fileUrl = $FileUrls[$i].Trim()
        if ([string]::IsNullOrWhiteSpace($fileUrl)) { continue }

        # Extract filename and dataset subfolder from URL
        # URL format: https://www.justice.gov/epstein/files/DataSet%201/EFTA00000001.pdf
        $urlParts = $fileUrl -replace 'https://www\.justice\.gov/epstein/files/', ''
        $urlDecoded = [Uri]::UnescapeDataString($urlParts)

        # Create subfolder structure (DataSet 1, DataSet 2, etc.)
        $subPath = $urlDecoded -replace '/', '\'
        $outPath = Join-Path $OutputDir $subPath
        $outDir = Split-Path $outPath -Parent

        if (-not (Test-Path $outDir)) {
            New-Item -ItemType Directory -Path $outDir -Force | Out-Null
        }

        # Skip if already exists
        if ($SkipExisting -and (Test-Path $outPath)) {
            $totalSkipped++
            if ($totalSkipped % 100 -eq 0) {
                Write-Host "  Skipped $totalSkipped existing files..." -ForegroundColor DarkGray
            }
            continue
        }

        # Progress
        $pct = [math]::Round(($i / $totalFiles) * 100, 1)
        Write-Host "  [$pct%] ($($i+1)/$totalFiles) Downloading: $(Split-Path $outPath -Leaf)" -ForegroundColor Cyan

        # Download with retries
        $success = $false
        for ($retry = 0; $retry -lt $MaxRetries; $retry++) {
            try {
                $session = Get-WebSession
                Invoke-WebRequest -Uri $fileUrl `
                    -Headers $Headers `
                    -UserAgent $UserAgent `
                    -WebSession $session `
                    -OutFile $outPath `
                    -UseBasicParsing `
                    -ErrorAction Stop

                $fileSize = (Get-Item $outPath).Length
                if ($fileSize -eq 0) {
                    Remove-Item $outPath -Force
                    Write-Log "Empty file, removed: $fileUrl" "WARN"
                }
                else {
                    $fileSizeKB = [math]::Round($fileSize / 1KB, 1)
                    Write-Log "Downloaded: $(Split-Path $outPath -Leaf) ($fileSizeKB KB)" "OK"
                    $totalDownloaded++
                    $success = $true
                }
                break
            }
            catch {
                $statusCode = $null
                if ($_.Exception.Response) {
                    $statusCode = [int]$_.Exception.Response.StatusCode
                }

                if ($statusCode -eq 404) {
                    Write-Log "404 Not Found: $(Split-Path $outPath -Leaf)" "WARN"
                    break
                }
                elseif ($statusCode -eq 403) {
                    Write-Log "403 Forbidden - cookies likely expired: $(Split-Path $outPath -Leaf)" "ERROR"
                    Add-Content -Path $ErrorLog -Value "$(Get-Date) | 403 | $fileUrl"
                    break
                }
                elseif ($statusCode -eq 429) {
                    $backoff = [math]::Pow(2, $retry + 1) * $RateLimitSeconds
                    Write-Log "429 Rate limited. Backing off ${backoff}s..." "WARN"
                    Start-Sleep -Seconds $backoff
                }
                else {
                    $errorMsg = $_.Exception.Message
                    Write-Log "Error (attempt $($retry+1)/$MaxRetries): $errorMsg" "ERROR"
                    Add-Content -Path $ErrorLog -Value "$(Get-Date) | $statusCode | $fileUrl | $errorMsg"
                    Start-Sleep -Seconds ($RateLimitSeconds * ($retry + 1))
                }
            }
        }

        if (-not $success) {
            $totalErrors++
        }

        # Rate limit between downloads (minimum 5 seconds)
        if ($i -lt ($FileUrls.Count - 1)) {
            Start-Sleep -Seconds $RateLimitSeconds
        }
    }

    # --- Summary ---
    Write-Log "========================================" "INFO"
    Write-Log "=== Download session complete ===" "INFO"
    Write-Log "Total in manifest: $totalFiles" "INFO"
    Write-Log "Downloaded: $totalDownloaded" "OK"
    Write-Log "Skipped (existing): $totalSkipped" "INFO"
    Write-Log "Errors: $totalErrors" "ERROR"
    Write-Log "Log: $LogFile" "INFO"
    if (Test-Path $ErrorLog) {
        Write-Log "Error log: $ErrorLog" "WARN"
    }
    Write-Log "========================================" "INFO"
}

# ============================================================
# MAIN EXECUTION
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "  Epstein Files Scraper & Downloader" -ForegroundColor White
Write-Host "  Data Sets: $($DataSets -join ', ')" -ForegroundColor White
Write-Host "  Output: $OutputDir" -ForegroundColor White
Write-Host "  Rate Limit: ${RateLimitSeconds}s between downloads" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""

if ($SkipScrape) {
    if (Test-Path $ManifestFile) {
        Write-Log "Skipping scrape, loading existing manifest: $ManifestFile" "INFO"
        $fileUrls = Get-Content $ManifestFile | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        Write-Log "Loaded $($fileUrls.Count) URLs from manifest" "OK"
    }
    else {
        Write-Log "No manifest found at $ManifestFile. Run without -SkipScrape first." "ERROR"
        exit 1
    }
}
else {
    $fileUrls = Scrape-FileManifest
}

if ($fileUrls.Count -gt 0) {
    Write-Host ""
    Write-Host "Found $($fileUrls.Count) files to download." -ForegroundColor Green
    Write-Host "Estimated time: ~$([math]::Round($fileUrls.Count * $RateLimitSeconds / 3600, 1)) hours at ${RateLimitSeconds}s rate limit" -ForegroundColor Yellow
    Write-Host ""

    Download-FromManifest -FileUrls $fileUrls
}
else {
    Write-Log "No files found in manifest. Check if scraping succeeded." "ERROR"
}

