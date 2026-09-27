@echo off
setlocal EnableDelayedExpansion
title Campus Passport

:: ============================================================
:: 1. Determine launcher location and project root
:: ============================================================
set "SCRIPT_DIR=%~dp0"

:: Check whether launcher is in the project root or inside backend\
if exist "%SCRIPT_DIR%backend\app\main.py" (
    set "PROJECT_ROOT=%SCRIPT_DIR%"
    set "BACKEND_DIR=%SCRIPT_DIR%backend"
) else if exist "%SCRIPT_DIR%app\main.py" (
    pushd "%SCRIPT_DIR%.."
    set "PROJECT_ROOT=!CD!\"
    popd
    set "BACKEND_DIR=%SCRIPT_DIR%"
) else (
    echo ============================================================
    echo   ERROR: Cannot find Campus Passport backend directory!
    echo ============================================================
    echo Expected to find "backend\app\main.py" in:
    echo   %SCRIPT_DIR%
    echo.
    echo Please make sure the entire ZIP was extracted before running.
    echo ============================================================
    echo.
    pause
    exit /b 1
)

:: Strip trailing backslashes for clean paths
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
if "%BACKEND_DIR:~-1%"=="\" set "BACKEND_DIR=%BACKEND_DIR:~0,-1%"

set "VENV_DIR=%BACKEND_DIR%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"

:: ============================================================
:: 2. Detect Python (py launcher or python in PATH)
:: ============================================================
set "SYSTEM_PYTHON="

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "SYSTEM_PYTHON=py -3"
    goto :PYTHON_OK
)

py --version >nul 2>&1
if not errorlevel 1 (
    set "SYSTEM_PYTHON=py"
    goto :PYTHON_OK
)

python --version >nul 2>&1
if not errorlevel 1 (
    set "SYSTEM_PYTHON=python"
    goto :PYTHON_OK
)

echo.
echo ============================================================
echo   ERROR: Python is not installed or not found in PATH!
echo ============================================================
echo.
echo Campus Passport requires Python 3.11 or higher to run.
echo.
echo 1. Download Python from the official website:
echo    https://www.python.org/downloads/
echo.
echo 2. Run the installer and CRITICALLY check this box:
echo    [X] Add python.exe to PATH
echo.
echo 3. After installation finishes, double-click this launcher again.
echo ============================================================
echo.
pause
exit /b 1

:PYTHON_OK
echo [OK] Detected Python:
%SYSTEM_PYTHON% --version

:: ============================================================
:: 3. Create virtual environment if missing
:: ============================================================
if not exist "%VENV_PYTHON%" (
    echo.
    echo [1/4] Creating virtual environment at backend\.venv...
    %SYSTEM_PYTHON% -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo.
        echo ============================================================
        echo   ERROR: Failed to create virtual environment!
        echo ============================================================
        echo Please ensure Python is installed with venv module.
        echo ============================================================
        echo.
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created.
) else (
    echo [OK] Virtual environment found.
)

:: ============================================================
:: 4. Install dependencies if not already installed
:: ============================================================
"%VENV_PYTHON%" -c "import fastapi, uvicorn, sqlalchemy, pydantic, aiofiles" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [2/4] Installing dependencies from backend\requirements.txt...
    echo (This only happens on the first run; it may take 1-2 minutes)
    "%VENV_PYTHON%" -m pip install -r "%BACKEND_DIR%\requirements.txt"
    if errorlevel 1 (
        echo.
        echo ============================================================
        echo   ERROR: Failed to install Python dependencies!
        echo ============================================================
        echo Please check your internet connection and try again.
        echo Requirements file: "%BACKEND_DIR%\requirements.txt"
        echo ============================================================
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Dependencies already installed.
)

:: ============================================================
:: 5. Initialize .env from .env.example if missing
:: ============================================================
if not exist "%BACKEND_DIR%\.env" (
    if exist "%BACKEND_DIR%\.env.example" (
        echo.
        echo [3/4] Creating backend\.env from .env.example...
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
        echo [OK] backend\.env created.
        echo       To use Campus Lens AI features, set your GROQ_API_KEY in backend\.env.
    )
)

:: ============================================================
:: 6. Check if port 8000 is already in use
:: ============================================================
"%VENV_PYTHON%" -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.bind(('127.0.0.1', 8000)); s.close()" >nul 2>&1
if errorlevel 1 (
    echo.
    echo ============================================================
    echo   WARNING: Port 8000 is already in use!
    echo ============================================================
    echo Another application or an existing Campus Passport instance
    echo is already running on port 8000.
    echo.
    echo If Campus Passport is already running, open your browser to:
    echo   http://localhost:8000/
    echo.
    echo Otherwise, close the application using port 8000 and try again.
    echo ============================================================
    echo.
    pause
    exit /b 1
)

:: ============================================================
:: 7. Set PYTHONPATH
:: ============================================================
set "PYTHONPATH=%PROJECT_ROOT%"

:: ============================================================
:: 8. Start background browser opener
:: ============================================================
if exist "%BACKEND_DIR%\open_browser.py" (
    start "" /B "%VENV_PYTHON%" "%BACKEND_DIR%\open_browser.py"
)

:: ============================================================
:: 9. Start FastAPI server
:: ============================================================
echo.
echo ============================================================
echo               CAMPUS PASSPORT IS RUNNING
echo ============================================================
echo.
echo   Open in browser:  http://localhost:8000/
echo   API Health:       http://localhost:8000/health
echo   API Docs:         http://localhost:8000/docs
echo.
echo   Your default browser will open automatically in a moment.
echo.
echo   Keep this window open while using Campus Passport.
echo   Close this window or press Ctrl+C to stop the server.
echo ============================================================
echo.

cd /d "%PROJECT_ROOT%"
"%VENV_PYTHON%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

if errorlevel 1 (
    echo.
    echo ============================================================
    echo   Campus Passport server stopped unexpectedly.
    echo ============================================================
    echo Please review the error messages above.
    echo ============================================================
    echo.
    pause
)
