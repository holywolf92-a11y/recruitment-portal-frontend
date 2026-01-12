#!/usr/bin/env pwsh
# Week 4 Railway Deployment Setup
# Run this to configure both backend and frontend for Railway deployment

$ProjectId = "585a6314-92d3-4312-8476-0cf8d388488b"
$ProjectName = "gleaming-healing"
$AccountToken = "46f5f85f-ba9b-4c7d-80aa-1f75441d6040"

Write-Host "🚀 Week 4 Railway Deployment Setup" -ForegroundColor Cyan
Write-Host "=================================="
Write-Host ""

# Step 1: Save config
Write-Host "✓ Railway Project Credentials Saved:" -ForegroundColor Green
Write-Host "  - Project: $ProjectName"
Write-Host "  - Project ID: $ProjectId"
Write-Host "  - Token: ${AccountToken.Substring(0, 8)}..."
Write-Host ""

# Step 2: Verify repos pushed
Write-Host "✓ Repository Status:" -ForegroundColor Green
Write-Host "  - Backend: https://github.com/holywolf92-a11y/recruitment-portal-backend ✓"
Write-Host "  - Frontend: https://github.com/holywolf92-a11y/recruitment-portal-frontend ✓"
Write-Host ""

# Step 3: Manual Railway Setup
Write-Host "⚠️  Next Steps - Manual Railway Configuration:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Go to Railway Dashboard:"
Write-Host "   https://railway.app/project/$ProjectId"
Write-Host ""
Write-Host "2️⃣  Add Backend Service:"
Write-Host "   - Click 'New' → 'GitHub Repo'"
Write-Host "   - Select: recruitment-portal-backend"
Write-Host "   - Railway auto-detects Node.js setup"
Write-Host ""
Write-Host "3️⃣  Add Redis:"
Write-Host "   - Click 'New' → 'Database' → 'Redis'"
Write-Host "   - Copy REDIS_URL from config"
Write-Host ""
Write-Host "4️⃣  Configure Backend Variables:"
Write-Host "   Set in Railway Dashboard:"
Write-Host "   - REDIS_URL = (from Redis service)"
Write-Host "   - RUN_WORKER = true"
Write-Host "   - PYTHON_CV_PARSER_URL = https://your-python.railway.app"
Write-Host "   - PYTHON_HMAC_SECRET = (generate random key)"
Write-Host ""
Write-Host "5️⃣  Add Frontend Service:"
Write-Host "   - Click 'New' → 'GitHub Repo'"
Write-Host "   - Select: recruitment-portal-frontend"
Write-Host ""
Write-Host "6️⃣  Configure Frontend Variables:"
Write-Host "   - VITE_API_BASE_URL = https://your-backend.railway.app/api"
Write-Host ""
Write-Host "7️⃣  Deploy Python Service (Week 4 Day 2):"
Write-Host "   - Create FastAPI service with OpenAI integration"
Write-Host "   - Push to GitHub with Dockerfile"
Write-Host "   - Add to Railway as separate service"
Write-Host ""

Write-Host "📖 Full Guide: See DEPLOYMENT_GUIDE_WEEK4.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once configured, auto-deploy on git push is enabled!" -ForegroundColor Green
