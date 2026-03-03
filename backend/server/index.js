// Backend API - Bag of Words
// Inicialização básica do servidor Express

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

// Middlewares
app.use(cors());
app.use(express.json());

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Bag of Words API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Rota para verificar status da API Python
app.get('/health/python', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/health`);
    res.json({
      status: 'ok',
      python_api: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'API Python não está disponível',
      error: error.message
    });
  }
});

// Rota para processar texto (integração com Python API)
app.post('/api/analyze', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: 'Texto não fornecido ou inválido'
      });
    }

    // Chamar API Python para processar
    const pythonResponse = await axios.post(`${PYTHON_API_URL}/api/process`, {
      text: text
    });

    res.json({
      success: true,
      data: pythonResponse.data
    });

  } catch (error) {
    console.error('Erro ao processar texto:', error.message);
    
    if (error.response) {
      // Erro da API Python
      res.status(error.response.status).json({
        error: 'Erro ao processar texto',
        details: error.response.data
      });
    } else if (error.code === 'ECONNREFUSED') {
      // API Python não está rodando
      res.status(503).json({
        error: 'API Python não está disponível',
        message: 'Certifique-se de que a API Python está rodando na porta 5000'
      });
    } else {
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bag of Words API - Análise de Texto',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      pythonHealth: '/health/python',
      analyze: '/api/analyze (POST)'
    },
    python_api_url: PYTHON_API_URL
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Python API: ${PYTHON_API_URL}`);
});

