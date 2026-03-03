#!/bin/bash

# Script para instalar dependências do frontend e backend
cd "$(dirname "$0")/.."

echo "Instalando dependências do backend..."
cd backend
npm install

echo ""
echo "Instalando dependências do frontend..."
cd ../frontend
npm install

echo ""
echo "Dependências instaladas com sucesso!"

