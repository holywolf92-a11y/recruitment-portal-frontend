# Fix PYTHON_CV_PARSER_URL for backend service
# This script updates the backend environment variable to point to the correct Python parser URL

Write-Host "Updating PYTHON_CV_PARSER_URL in Railway backend..." -ForegroundColor Cyan

$projectName = "gleaming-healing"
$serviceName = "recruitment-portal-backend"
$envName = "production"
$varName = "PYTHON_CV_PARSER_URL"
$varValue = "https://recruitment-portal-python-parser-production.up.railway.app"

Write-Host "`nProject: $projectName" -ForegroundColor Gray
Write-Host "Service: $serviceName" -ForegroundColor Gray
Write-Host "Variable: $varName = $varValue" -ForegroundColor Gray

Write-Host "`nTo update this variable:" -ForegroundColor Yellow
Write-Host "1. Go to: https://railway.app/project/gleaming-healing" -ForegroundColor Yellow
Write-Host "2. Click on the 'recruitment-portal-backend' service" -ForegroundColor Yellow
Write-Host "3. Click the 'Variables' tab" -ForegroundColor Yellow
Write-Host "4. Find 'PYTHON_CV_PARSER_URL'" -ForegroundColor Yellow
Write-Host "5. Update it to: $varValue" -ForegroundColor Yellow
Write-Host "6. Click 'Save' or press Enter" -ForegroundColor Yellow

Write-Host "`nOnce updated, the CV parsing should work!" -ForegroundColor Green
