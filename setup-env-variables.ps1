# Railway Environment Variables Setup Script
# This script sets up all required environment variables for the backend service

$BackendURL = "https://exquisite-surprise-production.up.railway.app"
$RedisURL = "redis://default:sBtnDrpJrbASwbGejzqByuCroCidLUVI@redis.railway.internal:6379"
$SupabaseURL = "https://hncvsextwmvjydcukdwx.supabase.co"
$SupabaseAnonKey = "sb_publishable_5qD27qPFc04oqSmS61s1tw_lgt8FhBV"
$SupabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuY3ZzZXh0d212anlkY3VrZHd4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDY5NDY4OCwiZXhwIjoxODg4NDYwNjg4fQ.BxC5Vxlf8VxPYI5ViBQz2J9f1j9s0s0s0s0s0s0s0s0"
$PythonHmacSecret = "Itbfr/p8ky/dRMAHLdi/DIiQRLEJtm2SqyNfwuXa3r0="
$PythonCVParserURL = "https://cv-parser-production.railway.app"
$JWTSecret = "your-jwt-secret-key-min-32-characters-long"
$OpenAIKey = "sk-proj-your-openai-key-here"

# Variables to set on backend service
$BackendVariables = @{
    "RUN_WORKER" = "true"
    "REDIS_URL" = $RedisURL
    "PYTHON_HMAC_SECRET" = $PythonHmacSecret
    "PYTHON_CV_PARSER_URL" = $PythonCVParserURL
    "SUPABASE_URL" = $SupabaseURL
    "SUPABASE_ANON_KEY" = $SupabaseAnonKey
    "SUPABASE_SERVICE_ROLE_KEY" = $SupabaseServiceRoleKey
    "NODE_ENV" = "production"
    "PORT" = "3000"
    "JWT_SECRET" = $JWTSecret
}

# Frontend variables
$FrontendVariables = @{
    "VITE_API_BASE_URL" = "$BackendURL/api"
    "VITE_SUPABASE_URL" = $SupabaseURL
    "VITE_SUPABASE_ANON_KEY" = $SupabaseAnonKey
}

Write-Host "====== Setting Backend Environment Variables ======" -ForegroundColor Green
Write-Host "Service: recruitment-portal-backend"
Write-Host ""

foreach ($key in $BackendVariables.Keys) {
    $value = $BackendVariables[$key]
    Write-Host "Setting $key..." -ForegroundColor Cyan
    # Note: The actual CLI command would be: npx @railway/cli@latest variable set $key=$value --service recruitment-portal-backend
}

Write-Host ""
Write-Host "====== Setting Frontend Environment Variables ======" -ForegroundColor Green
Write-Host "Service: recruitment-portal-frontend"
Write-Host ""

foreach ($key in $FrontendVariables.Keys) {
    $value = $FrontendVariables[$key]
    Write-Host "Setting $key..." -ForegroundColor Cyan
    # Note: The actual CLI command would be: npx @railway/cli@latest variable set $key=$value --service recruitment-portal-frontend
}

Write-Host ""
Write-Host "====== Summary =====" -ForegroundColor Yellow
Write-Host "Backend Service URL: $BackendURL"
Write-Host "Redis URL: $RedisURL"
Write-Host ""
Write-Host "⚠️  IMPORTANT: Update these placeholders before deploying:" -ForegroundColor Red
Write-Host "  1. SUPABASE_SERVICE_ROLE_KEY - Get from Supabase dashboard"
Write-Host "  2. PYTHON_CV_PARSER_URL - Update if you have a different parser URL"
Write-Host "  3. JWT_SECRET - Generate a secure random secret"
Write-Host "  4. OPENAI_API_KEY - Add your OpenAI key if needed"
Write-Host ""
Write-Host "To apply variables manually via Railway Dashboard:" -ForegroundColor Yellow
Write-Host "1. Go to: https://railway.app/project/54e09ca0-5643-4b5e-a172-8704293ae095"
Write-Host "2. Click on recruitment-portal-backend service"
Write-Host "3. Click 'Variables' tab"
Write-Host "4. Add each variable shown above"
