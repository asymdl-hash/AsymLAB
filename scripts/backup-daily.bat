@echo off
REM ============================================
REM  AsymLAB — Backup Diário do Supabase
REM  Executar manualmente ou via Task Scheduler
REM ============================================

echo.
echo  AsymLAB Backup - Iniciando...
echo.

cd /d "F:\AsymLAB"
node scripts\backup-supabase.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  ✅ Backup concluído com sucesso!
) else (
    echo.
    echo  ❌ Backup falhou! Verificar logs em DB\Supabase\logs\
)

REM Descomente a linha abaixo para manter a janela aberta (útil para debug)
REM pause
