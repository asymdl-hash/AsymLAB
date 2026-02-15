@echo off
REM ============================================
REM  AsymLAB — Backup Diário do Supabase
REM  Executar manualmente ou via Task Scheduler
REM ============================================
REM
REM  NOTA: Este script NÃO precisa do "npm run dev" 
REM  a correr! Corre directamente com Node.js.
REM
REM  Task Scheduler:
REM    Programa: F:\AsymLAB\scripts\backup-daily.bat
REM    Agendar: Diariamente às 03:00
REM    Condição: Iniciar apenas se rede disponível
REM ============================================

echo.
echo ========================================
echo  AsymLAB - Backup Diario
echo  %date% %time%
echo ========================================
echo.

cd /d "F:\AsymLAB"

REM Verificar se o script existe
if not exist "scripts\backup-supabase.js" (
    echo  ERRO: Script de backup nao encontrado!
    echo  Path: F:\AsymLAB\scripts\backup-supabase.js
    exit /b 1
)

REM Executar backup (standalone, sem servidor)
node scripts\backup-supabase.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Backup concluido com sucesso!
) else (
    echo.
    echo  ERRO no backup! Verificar logs em DB\Supabase\logs\
)

REM Descomente a linha abaixo para manter a janela aberta (útil para debug)
REM pause
