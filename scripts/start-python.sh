#!/bin/bash

# Script para iniciar a API Python

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON_DIR="$PROJECT_DIR/python-api"
LOG_DIR="$PROJECT_DIR/logs"

# Criar diretório de logs se não existir
mkdir -p "$LOG_DIR"

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "Erro: Python3 não está instalado"
    exit 1
fi

# Verificar se o ambiente virtual existe
if [ ! -d "$PYTHON_DIR/venv" ]; then
    echo "Criando ambiente virtual..."
    cd "$PYTHON_DIR"
    python3 -m venv venv
fi

# Ativar ambiente virtual e instalar dependências
cd "$PYTHON_DIR"
source venv/bin/activate

# Verificar se requirements.txt existe e instalar dependências
if [ -f "requirements.txt" ]; then
    echo "Instalando/atualizando dependências Python..."
    pip install -q -r requirements.txt
fi

# Verificar se já está rodando
if [ -f "$LOG_DIR/python.pid" ]; then
    PID=$(cat "$LOG_DIR/python.pid")
    if ps -p $PID > /dev/null 2>&1; then
        echo "API Python já está rodando (PID: $PID)"
        exit 0
    fi
fi

# Iniciar API Python
echo "Iniciando API Python..."
nohup python3 app.py > "$LOG_DIR/python.log" 2>&1 &
PYTHON_PID=$!

# Salvar PID
echo $PYTHON_PID > "$LOG_DIR/python.pid"

echo "API Python iniciada (PID: $PYTHON_PID)"
echo "Logs: $LOG_DIR/python.log"
echo "API disponível em: http://localhost:5000"

