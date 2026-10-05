@echo off
rem ============================================================================
rem Graphify CLI Runner Wrapper for Windows CMD / PowerShell
rem Football Player Token Marketplace - Grupo Q
rem ============================================================================

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    py -3 "%~dp0graphify.py" %*
    exit /b %ERRORLEVEL%
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python "%~dp0graphify.py" %*
    exit /b %ERRORLEVEL%
)

where python3 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python3 "%~dp0graphify.py" %*
    exit /b %ERRORLEVEL%
)

echo [ERROR] Python 3 no esta instalado o no se encuentra en el PATH. >&2
exit /b 1
