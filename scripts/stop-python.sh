#!/bin/bash

# Script para parar a API Python

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
PID_FILE="$LOG_DIR/python.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "API Python não está rodando"
    exit 0
fi

PID=$(cat "$PID_FILE")

if ! ps -p $PID > /dev/null 2>&1; then
    echo "API Python não está rodando (PID antigo: $PID)"
    rm -f "$PID_FILE"
    exit 0
fi

echo "Parando API Python (PID: $PID)..."
kill $PID

# Aguardar processo terminar
sleep 2

# Verificar se ainda está rodando
if ps -p $PID > /dev/null 2>&1; then
    echo "Forçando encerramento..."
    kill -9 $PID
fi

rm -f "$PID_FILE"
echo "API Python parada"

