#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Ensure we're in the project root directory
cd "$(dirname "$0")"

# Activate virtual environment (assuming it's in the current directory)
source .venv/bin/activate

# Install npm packages
npm run build

# Run the Python script to generate HTML
python3 main.py

# Deactivate virtual environment
deactivate

netlify dev --no-open
