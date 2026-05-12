# download-epstein-files.ps1
# Downloads files from justice.gov/epstein with rate limiting
# Usage: .\scripts\download-epstein-files.ps1 [-StartIndex 4577] [-EndIndex 5000] [-Dataset "DataSet 3"] [-OutputDir ".\downloads\epstein"]

param(
    [int]$StartIndex = 0,
    [int]$EndIndex = 99999999,
    [string]$Prefix = "EFTA",
    [int]$PadWidth = 12,
    [string]$Dataset = "DataSet 3",
    [string]$OutputDir = ".\downloads\epstein",
    [int]$RateLimitSeconds = 5,
    [string[]]$Extensions = @('.pdf', '.mp3', '.mp4', '.wav', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.bmp'),
    [int]$MaxRetries = 3,
    [int]$Max404Streak = 100,
    [switch]$SkipExisting
)

# --- Configuration ---
$BaseUrl = "https://www.justice.gov/epstein/files"
$EncodedDataset = [Uri]::EscapeDataString($Dataset)

$Headers = @{
    'accept'                    = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
    'accept-language'           = 'en-US,en;q=0.9'
    'cache-control'             = 'max-age=0'
    'priority'                  = 'u=0, i'
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

$UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'

# Cookie string - UPDATE THESE if they expire
$CookieString = 'nmstat=df771102-d8aa-11c0-f3f7-26266b706c64; _ga=GA1.1.1585995321.1770279923; _ga_DKBJ584YLP=GS2.1.s1770948517$o1$g1$t1770948579$j59$l0$h0; _ga_67X1G0DGL9=GS2.1.s1770948517$o1$g1$t1770948579$j59$l0$h0; _ga_ZC7E8DWE3S=GS2.1.s1770948518$o1$g1$t1770948579$j59$l0$h0; _ga_CSLL4ZEK4L=GS2.1.s1778015358$o12$g0$t1778015358$j60$l0$h0; justiceGovAgeVerified=true'

# --- Setup ---
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "[INFO] Created output directory: $OutputDir" -ForegroundColor Cyan
}

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

function Download-File {
    param(
        [string]$Url,
        [string]$OutPath,
        [int]$RetryCount = 0
    )

    try {
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

        # Parse and add cookies
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

        $response = Invoke-WebRequest -Uri $Url `
            -Headers $Headers `
            -UserAgent $UserAgent `
            -WebSession $session `
            -OutFile $OutPath `
            -PassThru `
            -UseBasicParsing `
            -ErrorAction Stop

        $statusCode = $response.StatusCode
        $fileSize = (Get-Item $OutPath).Length

        if ($fileSize -eq 0) {
            Remove-Item $OutPath -Force
            Write-Log "Empty file removed: $OutPath" "WARN"
            return $false
        }

        $fileSizeKB = [math]::Round($fileSize / 1KB, 2)
        Write-Log "Downloaded: $(Split-Path $OutPath -Leaf) ($fileSizeKB KB) [HTTP $statusCode]" "OK"
        return $true
    }
    catch {
        $errorMsg = $_.Exception.Message
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($statusCode -eq 404) {
            Write-Log "Not found (404): $Url" "WARN"
            return $false
        }
        elseif ($statusCode -eq 403) {
            Write-Log "Forbidden (403): $Url - cookies may have expired" "ERROR"
            Add-Content -Path $ErrorLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | 403 | $Url"
            return $false
        }
        elseif ($statusCode -eq 429 -or $errorMsg -match "rate|throttl") {
            $backoff = [math]::Pow(2, $RetryCount + 1) * $RateLimitSeconds
            Write-Log "Rate limited. Backing off for $backoff seconds..." "WARN"
            Start-Sleep -Seconds $backoff
            if ($RetryCount -lt $MaxRetries) {
                return Download-File -Url $Url -OutPath $OutPath -RetryCount ($RetryCount + 1)
            }
            return $false
        }
        else {
            Write-Log "Error downloading $Url : $errorMsg" "ERROR"
            Add-Content -Path $ErrorLog -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | $statusCode | $Url | $errorMsg"
            if ($RetryCount -lt $MaxRetries) {
                $backoff = ($RetryCount + 1) * $RateLimitSeconds
                Write-Log "Retrying in $backoff seconds (attempt $($RetryCount + 1)/$MaxRetries)..." "WARN"
                Start-Sleep -Seconds $backoff
                return Download-File -Url $Url -OutPath $OutPath -RetryCount ($RetryCount + 1)
            }
            return $false
        }
    }
}

# --- Main Download Loop ---
Write-Log "=== Starting download session ===" "INFO"
Write-Log "Range: $Prefix$StartIndex to $Prefix$EndIndex" "INFO"
Write-Log "Dataset: $Dataset" "INFO"
Write-Log "Extensions: $($Extensions -join ', ')" "INFO"
Write-Log "Rate limit: ${RateLimitSeconds}s between requests" "INFO"
Write-Log "Output: $OutputDir" "INFO"
Write-Log "=================================" "INFO"

$totalDownloaded = 0
$totalSkipped = 0
$totalNotFound = 0
$totalErrors = 0
$consecutive404 = 0

for ($i = $StartIndex; $i -le $EndIndex; $i++) {
    # Zero-pad: EFTA + digits padded so total ID length = $PadWidth (e.g. EFTA00818213 = 12 chars)
    $numDigits = $PadWidth - $Prefix.Length
    $fileId = "$Prefix$($i.ToString().PadLeft($numDigits, '0'))"
    $foundForIndex = $false

    foreach ($ext in $Extensions) {
        $filename = "$fileId$ext"
        $outPath = Join-Path $OutputDir $filename

        # Skip if file already exists and flag is set
        if ($SkipExisting -and (Test-Path $outPath)) {
            Write-Log "Skipping existing: $filename" "INFO"
            $totalSkipped++
            $foundForIndex = $true
            continue
        }

        $url = "$BaseUrl/$EncodedDataset/$filename"

        $success = Download-File -Url $url -OutPath $outPath

        if ($success) {
            $totalDownloaded++
            $foundForIndex = $true
            # If we found a file with this extension, skip remaining extensions for this index
            break
        }

        # Rate limit between extension attempts
        Start-Sleep -Milliseconds 1000
    }

    if (-not $foundForIndex) {
        $totalNotFound++
        $consecutive404++
        if ($consecutive404 -ge $Max404Streak) {
            Write-Log "Stopping: $Max404Streak consecutive files not found. Likely reached end of dataset." "WARN"
            break
        }
    }
    else {
        $consecutive404 = 0
    }

    # Rate limit between file indices (minimum 5 seconds)
    if ($i -lt $EndIndex) {
        Write-Host "  Waiting ${RateLimitSeconds}s before next request..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $RateLimitSeconds
    }
}

# --- Summary ---
Write-Log "=== Download session complete ===" "INFO"
Write-Log "Downloaded: $totalDownloaded" "OK"
Write-Log "Skipped (existing): $totalSkipped" "INFO"
Write-Log "Not found: $totalNotFound" "WARN"
Write-Log "Errors: $totalErrors" "ERROR"
Write-Log "Log file: $LogFile" "INFO"
if (Test-Path $ErrorLog) {
    Write-Log "Error log: $ErrorLog" "WARN"
}




