# AsymLAB - Deploy Vercel

Write-Host "AsymLAB - Deploy Vercel" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verificar login
Write-Host "Passo 1: Verificar login Vercel..." -ForegroundColor Yellow
$loginCheck = vercel whoami 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Nao estas logado no Vercel!`n" -ForegroundColor Red
    Write-Host "Vou abrir o browser para fazeres login..." -ForegroundColor Yellow
    Write-Host "1. Clica em Continue with GitHub" -ForegroundColor White
    Write-Host "2. Autoriza o Vercel" -ForegroundColor White
    Write-Host "3. Volta aqui e pressiona ENTER`n" -ForegroundColor White
    
    Start-Process "https://vercel.com/login"
    Read-Host "Pressiona ENTER apos fazer login"
    
    Write-Host "`nA fazer login via CLI..." -ForegroundColor Yellow
    vercel login
} else {
    Write-Host "Ja estas logado!`n" -ForegroundColor Green
}

# Deploy
Write-Host "Passo 2: A fazer deploy..." -ForegroundColor Yellow
Write-Host "Isto pode demorar 2-3 minutos...`n" -ForegroundColor White

vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeploy concluido com sucesso!" -ForegroundColor Green
    Write-Host "A tua app esta online!`n" -ForegroundColor Cyan
} else {
    Write-Host "`nErro no deploy!" -ForegroundColor Red
}

Read-Host "Pressiona ENTER para sair"
