#!/bin/bash

# Script para iniciar frontend, backend e Python API em paralelo
cd "$(dirname "$0")/.."

echo "Iniciando todos os serviços..."

# Inicia Python API primeiro
echo "Iniciando API Python..."
./scripts/start-python.sh
sleep 2

# Inicia backend em background
cd backend
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend iniciado (PID: $BACKEND_PID)"

# Aguarda um pouco para o backend iniciar
sleep 2

# Inicia frontend em background
cd ../frontend
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend iniciado (PID: $FRONTEND_PID)"

# Salva os PIDs para poder parar depois
echo $BACKEND_PID > ../logs/backend.pid
echo $FRONTEND_PID > ../logs/frontend.pid

echo ""
echo "Serviços iniciados!"
echo "Python API: http://localhost:5000"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Para parar, execute: ./scripts/stop-all.sh"
echo "Logs em: logs/"

# Mantém o script rodando
wait

