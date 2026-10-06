#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

if [ ! -f ".venv/bin/python" ]; then
	echo "Creating virtual environment..."
	python3 -m venv .venv
fi

source ".venv/bin/activate"

echo "Installing requirements..."
python -m pip install -r requirements.txt

echo
echo "Starting Thingificator..."
echo
echo -e "Open in browser: \033]8;;http://127.0.0.1:5000\033\\http://127.0.0.1:5000\033]8;;\033\\"
echo

python app.py