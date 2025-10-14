# Wait for DynamoDB Local to be ready
Write-Host "Waiting for DynamoDB Local to be ready..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    Start-Sleep -Seconds 2
    try {
        # DynamoDB Local returns 400 with authentication error when it's ready
        $response = Invoke-WebRequest -Uri 'http://localhost:8000' -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        # If we get any response (including 400), DynamoDB is ready
        if ($response) {
            Write-Host "✅ DynamoDB Local is ready! (Status: $($response.StatusCode))" -ForegroundColor Green
            exit 0
        }
    } catch [System.Net.WebException] {
        # Check if it's a 400 response (which means DynamoDB is ready)
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-Host "✅ DynamoDB Local is ready! (Status: 400)" -ForegroundColor Green
            exit 0
        }
        Write-Host "⏳ Still waiting for DynamoDB Local... (Attempt $attempt/$maxAttempts)" -ForegroundColor Cyan
    } catch {
        Write-Host "⏳ Still waiting for DynamoDB Local... (Attempt $attempt/$maxAttempts)" -ForegroundColor Cyan
    }

    if ($attempt -ge $maxAttempts) {
        Write-Host "❌ Timeout waiting for DynamoDB Local after $maxAttempts attempts" -ForegroundColor Red
        exit 1
    }
} while ($true)
