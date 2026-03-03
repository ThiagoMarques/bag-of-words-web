#!/bin/bash

# Script para parar o backend
echo "Parando backend..."

# Procura por processos do Node na porta 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null

if [ $? -eq 0 ]; then
    echo "Backend parado com sucesso"
else
    echo "Nenhum processo do backend encontrado"
fi

