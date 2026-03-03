#!/bin/bash

# Script para parar o frontend
echo "Parando frontend..."

# Procura por processos do Vite na porta 5173
lsof -ti:5173 | xargs kill -9 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Frontend parado com sucesso"
else
    echo "Nenhum processo do frontend encontrado"
fi

