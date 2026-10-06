@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
	echo Creating virtual environment...
	py -m venv .venv

	if errorlevel 1 (
		echo Failed to create virtual environment.
		exit /b 1
	)
)

call ".venv\Scripts\activate.bat"

echo Installing requirements...
python -m pip install -r requirements.txt

if errorlevel 1 (
	echo Failed to install requirements.
	exit /b 1
)

echo.
echo Starting Thingificator...
echo.
echo Open in browser: http://127.0.0.1:5000
echo.

python app.py

endlocal