#!/bin/bash

# Kill background processes on exit
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

echo "Starting Free to Debate Project..."

# Start Backend
echo "[1/2] Starting Backend Server..."
cd backend
# Check if venv exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

python server.py &
BACKEND_PID=$!

# Wait a bit for backend to initialize
sleep 2

# Start Frontend
echo "[2/2] Starting Frontend Dev Server..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo "Access the application at http://localhost:5173"
echo "Backend running at http://localhost:8000"
echo "Press Ctrl+C to stop."

wait
