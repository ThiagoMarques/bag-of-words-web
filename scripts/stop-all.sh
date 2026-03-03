#!/bin/bash

# Script para parar frontend, backend e Python API
cd "$(dirname "$0")/.."

echo "Parando todos os serviços..."

# Para Python API
./scripts/stop-python.sh

# Para backend
if [ -f logs/backend.pid ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    kill $BACKEND_PID 2>/dev/null
    rm logs/backend.pid
    echo "Backend parado"
else
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    echo "Backend parado (via porta)"
fi

# Para frontend
if [ -f logs/frontend.pid ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    kill $FRONTEND_PID 2>/dev/null
    rm logs/frontend.pid
    echo "Frontend parado"
else
    lsof -ti:5173 | xargs kill -9 2>/dev/null
    echo "Frontend parado (via porta)"
fi

echo "Todos os serviços foram parados"

