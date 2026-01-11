const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// API URLs - configurable via environment variables
const JPLENS_CONTEXT_URL = process.env.JPLENS_CONTEXT_URL ? ensureProtocol(process.env.JPLENS_CONTEXT_URL) : 'http://127.0.0.1:8000';
const JPLENS_AI_CONTEXT_URL = process.env.JPLENS_AI_CONTEXT_URL ? ensureProtocol(process.env.JPLENS_AI_CONTEXT_URL) : 'http://127.0.0.1:8001';

// Helper function to ensure URLs have proper protocol
function ensureProtocol(url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Internal Railway URLs don't need https, external public URLs do
  if (url.includes('.railway.internal')) {
    return `http://${url}`;
  }
  return `https://${url}`;
}

// Configure multer for file uploads
const storage = multer.memoryStorage();

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Function to validate and resize image to max 500px on longest side
async function resizeImage(buffer, mimetype) {
  try {
    // Check if buffer is empty
    if (!buffer || buffer.length === 0) {
      throw new Error('Empty file detected');
    }

    // Check if file is actually an image
    if (!mimetype.startsWith('image/')) {
      throw new Error('Invalid file type. Only image files are allowed.');
    }

    let sharpInstance = sharp(buffer);

    // Get image metadata (this will fail for corrupted images)
    const metadata = await sharpInstance.metadata();

    // Validate image dimensions
    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0) {
      throw new Error('Invalid image dimensions');
    }

    // If image is already small enough (both dimensions <= 500), return original
    if (metadata.width <= 500 && metadata.height <= 500) {
      return buffer;
    }

    // Calculate new dimensions maintaining aspect ratio
    let { width, height } = metadata;
    if (width > height) {
      if (width > 500) {
        height = Math.round((height * 500) / width);
        width = 500;
      }
    } else {
      if (height > 500) {
        width = Math.round((width * 500) / height);
        height = 500;
      }
    }

    // Resize and return buffer
    const resizedBuffer = await sharpInstance
      .resize(width, height, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 90 }) // Convert to JPEG for smaller size
      .toBuffer();

    return resizedBuffer;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Image validation failed: ${error.message}`);
  }
}

// Authentication middleware (only active if APP_PASSWORD is set)
function checkAuth(req, res, next) {
  // Skip authentication if APP_PASSWORD is not set
  if (!process.env.APP_PASSWORD) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="JPLens"');
    return res.status(401).send('Authentication required');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === 'admin' && password === process.env.APP_PASSWORD) {
    return next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="JPLens"');
    return res.status(401).send('Authentication required');
  }
}

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Apply authentication to all routes
app.use(checkAuth);

// Serve static files
app.use(express.static('public'));

// Middleware to handle multer errors
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 10MB.' });
    }
  } else if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
};

// API endpoint for image analysis
app.post('/analyze', upload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Resize image to prevent large file processing issues
    const resizedBuffer = await resizeImage(req.file.buffer, req.file.mimetype);

    // Step 1: Send resized image to JPLensContext API
    const formData = new FormData();
    formData.append('file', resizedBuffer, {
      filename: req.file.originalname,
      contentType: 'image/jpeg' // Always JPEG after resizing
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

    let errorMessage = 'Failed to process image';
    if (error.response) {
      errorMessage = `API Error: ${error.response.status} - ${error.response.data?.message || error.message}`;
    } else if (error.message.includes('Image validation failed')) {
      errorMessage = error.message.replace('Image validation failed: ', '');
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`JPLens master app running on http://localhost:${PORT}`);
  console.log(`🔗 API URLs configured:`);
  console.log(`   Context API: ${JPLENS_CONTEXT_URL}`);
  console.log(`   AI Context API: ${JPLENS_AI_CONTEXT_URL}`);
});
