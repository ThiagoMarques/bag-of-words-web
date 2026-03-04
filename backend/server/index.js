// Backend API - Bag of Words
// Inicialização básica do servidor Express

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import puppeteer from 'puppeteer';
import vision from '@google-cloud/vision';
import sharp from 'sharp';
import { unlink, readFile } from 'fs/promises';
import { join } from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';
const OCR_LANGUAGE = process.env.OCR_LANGUAGE || 'pt'; 

// Configurar Google Cloud Vision API
let visionClient = null;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (GOOGLE_APPLICATION_CREDENTIALS) {
  // Usar service account (recomendado para produção)
  visionClient = new vision.ImageAnnotatorClient({
    keyFilename: GOOGLE_APPLICATION_CREDENTIALS
  });
  console.log('Google Cloud Vision configurado com service account');
} else if (GOOGLE_API_KEY) {
  // Usar API key (mais simples, mas menos seguro)
  visionClient = new vision.ImageAnnotatorClient({
    apiKey: GOOGLE_API_KEY
  });
  console.log('Google Cloud Vision configurado com API key');
} else {
  console.warn('Google Cloud Vision não configurado. Configure GOOGLE_API_KEY ou GOOGLE_APPLICATION_CREDENTIALS');
}

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
  let processedImagePath = null;

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

    await browser.close();
    browser = null;

    // Pré-processar imagem para melhorar precisão do OCR
    console.log('Pré-processando imagem para OCR...');
    processedImagePath = join(process.cwd(), 'screenshots', `processed-${Date.now()}.png`);
    
    // Obter dimensões da imagem original
    const metadata = await sharp(screenshotPath).metadata();
    const currentWidth = metadata.width || 1920;
    
    // Para OCR, ideal é ~300 DPI. Se a imagem for muito pequena, aumentamos
    // Mas não aumentamos se já for grande o suficiente (evita perda de qualidade)
    const minWidthForOCR = 2000; // ~200 DPI mínimo para boa qualidade OCR
    const targetWidth = currentWidth < minWidthForOCR ? minWidthForOCR : currentWidth;
    
    await sharp(screenshotPath)
      .grayscale() // Converter para preto e branco
      .normalize() // Aumentar contraste
      .sharpen() // Aumentar nitidez
      .resize(targetWidth, null, {
        withoutEnlargement: currentWidth >= minWidthForOCR,
        kernel: sharp.kernel.lanczos3
      })
      .png({ quality: 100 })
      .toFile(processedImagePath);
    
    console.log(`Imagem processada: ${currentWidth}px -> ${targetWidth}px`);

    // Extrair texto usando Google Cloud Vision API
    console.log('Iniciando OCR com Google Cloud Vision...');
    
    if (!visionClient) {
      throw new Error('Google Cloud Vision não está configurado. Configure GOOGLE_API_KEY ou GOOGLE_APPLICATION_CREDENTIALS');
    }

    // Ler imagem processada como buffer
    const imageBuffer = await readFile(processedImagePath);
    
    let pageText = '';
    
    try {
      // Fazer requisição para Cloud Vision API
      const imageContext = {
        languageHints: [OCR_LANGUAGE] 
      };
      
      const [result] = await visionClient.textDetection({
        image: { content: imageBuffer },
        imageContext: imageContext
      });

      // Extrair texto dos resultados
      const detections = result.textAnnotations;
      console.log(detections);
      
      if (detections && detections.length > 0) {
        // O primeiro elemento contém todo o texto detectado
        pageText = detections[0].description || '';
      }
      
      console.log(`Google Cloud Vision extraiu ${pageText.length} caracteres`);
      
      if (!pageText || pageText.trim().length === 0) {
        console.warn('Nenhum texto detectado na imagem');
        pageText = '';
      }
    } catch (visionError) {
      // Tratamento específico de erros do Google Cloud Vision
      if (visionError.code === 8 || visionError.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('Limite de cota do Google Cloud Vision atingido. Tente novamente mais tarde.');
      } else if (visionError.code === 7 || visionError.message?.includes('PERMISSION_DENIED')) {
        throw new Error('Permissão negada. Verifique suas credenciais do Google Cloud Vision.');
      } else {
        throw new Error(`Erro no Google Cloud Vision: ${visionError.message}`);
      }
    }
    
    // Processar screenshot para retornar se solicitado
    let screenshotBase64 = null;
    if (saveScreenshot) {
      try {
        const screenshotBuffer = await readFile(screenshotPath);
        screenshotBase64 = screenshotBuffer.toString('base64');
      } catch (err) {
        console.warn('Erro ao ler screenshot:', err.message);
      }
    }
    
    // Limpar arquivos temporários (sempre deletar após processar)
    try {
      await unlink(screenshotPath);
      if (processedImagePath) {
        await unlink(processedImagePath);
      }
    } catch (err) {
      console.warn('Erro ao remover arquivos temporários:', err.message);
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
    if (processedImagePath) {
      try {
        await unlink(processedImagePath);
      } catch (err) {
        // Ignorar erro de limpeza
      }
    }

    // Tratamento específico de erros
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
    } else if (error.message.includes('quota') || error.message.includes('Limite de cota')) {
      res.status(429).json({
        error: 'Limite de cota atingido',
        message: 'O limite de requisições do Google Cloud Vision foi atingido. Tente novamente mais tarde.',
        retryAfter: 60 // segundos
      });
    } else if (error.message.includes('Google Cloud Vision não está configurado')) {
      res.status(503).json({
        error: 'Serviço não configurado',
        message: 'Google Cloud Vision não está configurado. Configure GOOGLE_API_KEY ou GOOGLE_APPLICATION_CREDENTIALS no arquivo .env'
      });
    } else if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      res.status(403).json({
        error: 'Permissão negada',
        message: 'Credenciais do Google Cloud Vision inválidas ou sem permissão. Verifique suas credenciais.'
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

