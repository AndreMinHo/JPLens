const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// API URLs - configurable via environment variables
const JPLENS_CONTEXT_URL = process.env.JPLENS_CONTEXT_URL || 'http://127.0.0.1:8000';
const JPLENS_AI_CONTEXT_URL = process.env.JPLENS_AI_CONTEXT_URL || 'http://127.0.0.1:8001';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static('public'));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for image analysis
app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Step 1: Send image to JPLensContext API
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const contextResponse = await axios.post(`${JPLENS_CONTEXT_URL}/translate-image`, formData, {
      headers: formData.getHeaders()
    });

    const contextData = contextResponse.data;

    // Step 2: Send context data to JPLensAIContext API
    const aiResponse = await axios.post(`${JPLENS_AI_CONTEXT_URL}/analyze/simple`, {
      ocr: contextData.ocr,
      translation: {
        raw_text: contextData.translation.raw_text,
        literal: contextData.translation.translation.literal
      }
    });

    // Combine results
    const result = {
      originalImage: req.file.originalname,
      ocr: contextData.ocr,
      basicTranslation: contextData.translation,
      aiAnalysis: aiResponse.data
    };

    res.json(result);

  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({
      error: 'Failed to process image',
      details: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`JPLens master app running on http://localhost:${PORT}`);
});
