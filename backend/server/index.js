// Backend API - Bag of Words
// Inicialização básica do servidor Express

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { unlink, readFile } from 'fs/promises';
import { join } from 'path';

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

// Rota para processar URL (screenshot + OCR + análise)
app.post('/api/analyze-url', async (req, res) => {
  let browser = null;
  let screenshotPath = null;

  try {
    const { url, saveScreenshot } = req.body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({
        error: 'URL não fornecida ou inválida'
      });
    }

    // Validar URL
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({
        error: 'URL inválida'
      });
    }

    // Fazer screenshot com Puppeteer
    console.log(`Iniciando screenshot de: ${url}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navegar para a URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Fazer screenshot
    screenshotPath = join(process.cwd(), 'screenshots', `screenshot-${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });

    // Extrair texto da página
    const pageText = await page.evaluate(() => {
      return document.body.innerText;
    });

    await browser.close();
    browser = null;

    // Processar screenshot
    let screenshotBase64 = null;
    if (saveScreenshot) {
      try {
        const screenshotBuffer = await readFile(screenshotPath);
        screenshotBase64 = screenshotBuffer.toString('base64');
      } catch (err) {
        console.warn('Erro ao ler screenshot:', err.message);
      }
    }
    
    // Limpar screenshot temporário (sempre deletar após processar)
    try {
      await unlink(screenshotPath);
    } catch (err) {
      console.warn('Erro ao remover screenshot:', err.message);
    }

    // Processar texto com Python API
    const pythonResponse = await axios.post(`${PYTHON_API_URL}/api/process`, {
      text: pageText
    });

    const responseData = {
      success: true,
      data: pythonResponse.data,
      url: url
    };

    if (screenshotBase64) {
      responseData.screenshot = `data:image/png;base64,${screenshotBase64}`;
    }

    res.json(responseData);

  } catch (error) {
    console.error('Erro ao processar URL:', error.message);
    
    // Limpar recursos
    if (browser) {
      await browser.close();
    }
    if (screenshotPath) {
      try {
        await unlink(screenshotPath);
      } catch (err) {
        // Ignorar erro de limpeza
      }
    }

    if (error.message.includes('Navigation timeout')) {
      res.status(408).json({
        error: 'Timeout ao carregar a página',
        message: 'A URL demorou muito para carregar'
      });
    } else if (error.message.includes('net::ERR')) {
      res.status(400).json({
        error: 'Erro ao acessar a URL',
        message: 'Não foi possível acessar o site. Verifique se a URL está correta.'
      });
    } else {
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
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
      analyze: '/api/analyze (POST) - Análise de texto direto',
      analyzeUrl: '/api/analyze-url (POST) - Análise de URL (screenshot)'
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

