# PowerShell script to set VITE_API_BASE_URL in Railway
# Run this after authenticating with Railway CLI: railway login

Write-Host "`n=== Setting VITE_API_BASE_URL in Railway ===" -ForegroundColor Cyan

# Backend URL
$backendUrl = "https://recruitment-portal-backend-production-d1f7.up.railway.app/api"

# Frontend service ID (from Railway config)
$serviceId = "10b59aee-074a-49e4-b7b5-d303b953ce4f"

Write-Host "`nBackend URL: $backendUrl" -ForegroundColor White
Write-Host "Service ID: $serviceId" -ForegroundColor White

# Check if Railway CLI is authenticated
Write-Host "`nChecking Railway authentication..." -ForegroundColor Yellow
$whoami = railway whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Railway CLI is not authenticated!" -ForegroundColor Red
    Write-Host "`nPlease run: railway login" -ForegroundColor Yellow
    Write-Host "Then authenticate in the browser that opens." -ForegroundColor Yellow
    Write-Host "After authentication, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Railway CLI is authenticated" -ForegroundColor Green

# Set the environment variable
Write-Host "`nSetting VITE_API_BASE_URL..." -ForegroundColor Yellow
railway variables --set "VITE_API_BASE_URL=$backendUrl" --service $serviceId

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully set VITE_API_BASE_URL!" -ForegroundColor Green
    Write-Host "`nRailway will automatically redeploy the frontend." -ForegroundColor Cyan
    Write-Host "Wait 2-5 minutes for deployment to complete." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Failed to set variable. Error code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "`nPlease set it manually via Railway Dashboard:" -ForegroundColor Yellow
    Write-Host "1. Go to https://railway.app" -ForegroundColor White
    Write-Host "2. Open 'exquisite-surprise' project" -ForegroundColor White
    Write-Host "3. Click 'Variables' tab" -ForegroundColor White
    Write-Host "4. Add: VITE_API_BASE_URL = $backendUrl" -ForegroundColor White
}
