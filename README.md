# Bag of Words - Análise de Site

Projeto para análise de palavras de qualquer site ou texto usando Processamento de Linguagem Natural (PLN), OCR e Bag of Words.

## Arquitetura

O projeto utiliza uma arquitetura híbrida com três componentes principais:

- **Frontend (React)**: Interface do usuário
- **Backend (Node.js)**: API REST que orquestra as requisições
- **Python API (Flask)**: Processamento NLP com Bag of Words

## Tecnologias

### Frontend
- React + Vite
- Tailwind CSS
- Axios (para comunicação com backend)

### Backend
- Node.js + Express
- Axios (para comunicação com Python API)
- Puppeteer (screenshot de páginas)
- Google Cloud Vision API (OCR)
- Sharp (pré-processamento de imagens)
- CORS

### Python API
- Flask
- Flask-CORS
- Bibliotecas padrão do Python (re, collections)

## Instalação

### 1. Instalar todas as dependências

Utilize os scripts para facilitar a instalação

```bash
./scripts/install.sh
```

Este script instala:
- Dependências do backend (Node.js)
- Dependências do frontend (React)
- Dependências do Python API (cria venv e instala pacotes)

### 2. Instalação manual (alternativa)

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

**Python API:**
```bash
cd python-api
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 3. Configurar Google Cloud Vision API

O projeto usa Google Cloud Vision API para OCR. Você precisa configurar as credenciais:

**Opção 1: API Key (mais simples)**
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione um existente
3. Ative a API "Cloud Vision API"
4. Vá em "Credenciais" e crie uma API Key
5. Adicione no arquivo `backend/.env`:
   ```
   GOOGLE_API_KEY=sua-api-key-aqui
   ```

**Opção 2: Service Account (recomendado para produção)**
1. Crie um Service Account no Google Cloud Console
2. Baixe o arquivo JSON de credenciais
3. Adicione no arquivo `backend/.env`:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./caminho/para/service-account-key.json
   ```

**Configurar Idioma (Opcional):**
Adicione no arquivo `backend/.env` para melhorar precisão:
```
OCR_LANGUAGE=pt  # Português (padrão), en (Inglês), es (Espanhol), etc.
```

**Limites e Cotas:**
- Text detection: 1.800 requisições/minuto
- Configure alertas no Google Cloud Console para monitorar uso
- Consulte [documentação de cotas](https://cloud.google.com/vision/quotas) para mais detalhes

## Execução

### Iniciar todos os serviços

```bash
./scripts/start-all.sh
```

Isso inicia:
- Python API na porta 5000
- Backend na porta 3001
- Frontend na porta 5173

### Iniciar serviços individualmente

```bash
# Python API
./scripts/start-python.sh

# Backend
./scripts/start-backend.sh

# Frontend
./scripts/start-frontend.sh
```

### Parar serviços

```bash
# Parar tudo
./scripts/stop-all.sh

# Parar individualmente
./scripts/stop-python.sh
./scripts/stop-backend.sh
./scripts/stop-frontend.sh
```

## Endpoints

### Backend (Node.js) - Porta 3001

- `GET /health` - Health check do backend
- `GET /health/python` - Verifica status da API Python
- `POST /api/analyze` - Analisa texto (chama Python API)
  ```json
  {
    "text": "texto para analisar"
  }
  ```

### Python API - Porta 5000

- `GET /health` - Health check da API Python
- `POST /api/process` - Processa texto com Bag of Words
  ```json
  {
    "text": "texto para processar"
  }
  ```

## Estrutura do Projeto

```
Bag_Site/
├── backend/           # API Node.js
│   ├── server/
│   │   └── index.js
│   └── package.json
├── frontend/          # React App
│   ├── src/
│   └── package.json
├── python-api/        # API Python (Flask)
│   ├── app.py
│   ├── requirements.txt
│   └── README.md
├── scripts/           # Scripts de gerenciamento
│   ├── install.sh
│   ├── start-all.sh
│   ├── stop-all.sh
│   └── ...
└── logs/              # Logs dos serviços
```

## Autor

Thiago Marques
