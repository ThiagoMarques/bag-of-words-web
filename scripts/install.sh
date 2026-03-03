#!/bin/bash

# Script para instalar dependências do frontend, backend e Python API
cd "$(dirname "$0")/.."

echo "Instalando dependências do backend..."
cd backend
npm install

echo ""
echo "Instalando dependências do frontend..."
cd ../frontend
npm install

echo ""
echo "Configurando API Python..."
cd ../python-api

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "Aviso: Python3 não está instalado. Pule esta etapa se não for usar Python."
else
    # Criar ambiente virtual se não existir
    if [ ! -d "venv" ]; then
        echo "Criando ambiente virtual Python..."
        python3 -m venv venv
    fi
    
    # Ativar e instalar dependências
    source venv/bin/activate
    echo "Instalando dependências Python..."
    pip install -q -r requirements.txt
    deactivate
fi

echo ""
echo "Dependências instaladas com sucesso!"

