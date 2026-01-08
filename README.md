# JPLens Master Application

A web application that integrates JPLensContext and JPLensAIContext APIs to analyze Japanese text from images.

## Overview

This master application provides a user-friendly web interface to:
1. Upload images containing Japanese text
2. Extract text using OCR (JPLensContext API)
3. Provide AI-enhanced analysis and cultural insights (JPLensAIContext API)

## Prerequisites

- Node.js 16+
- Running instances of:
  - JPLensContext API (http://localhost:8000)
  - JPLensAIContext API (http://localhost:8001)

## Installation

```bash
npm install
```

## Usage

### Local Development

1. **Start the APIs:**
   - Start JPLensContext: `cd ../JPLensContext && uvicorn backend.main:app --reload`
   - Start JPLensAIContext: `cd ../JPLensAIContext && python main.py`

2. **Start the master app:**
   ```bash
   npm start
   ```

3. **Open your browser:**
   - Navigate to http://localhost:3000
   - Upload an image with Japanese text
   - View the OCR results and AI analysis

### Cloud Deployment (Railway)

1. **Deploy APIs to Railway:**
   - Create Railway account at https://railway.app
   - Deploy JPLensContext: Connect `../JPLensContext` repo to Railway
   - Deploy JPLensAIContext: Connect `../JPLensAIContext` repo to Railway
   - Deploy JPLens Master: Connect this repo to Railway

2. **Configure Environment Variables:**
   In the JPLens Master Railway project, set:
   ```
   JPLENS_CONTEXT_URL=https://your-jplens-context-url.railway.app
   JPLENS_AI_CONTEXT_URL=https://your-jplens-ai-context-url.railway.app
   ```

3. **Access the Application:**
   - Railway will provide a public URL (e.g., `https://jplens-master.railway.app`)
   - Works on any device with internet access
   - No local setup required beyond API keys

## Architecture

```
User Uploads Image
        ↓
JPLens Master App (Port 3000)
        ↓
JPLensContext API (Port 8000)
    - OCR + Basic Translation
        ↓
JPLensAIContext API (Port 8001)
    - AI-Enhanced Analysis
        ↓
Combined Results Displayed
```

## API Integration

The app chains two API calls:
- `POST /translate-image` to JPLensContext for OCR and basic translation
- `POST /analyze/simple` to JPLensAIContext for enhanced AI analysis

## Features

- **Image Upload**: Drag-and-drop or click to select images
- **Real-time Processing**: Visual feedback during analysis
- **Comprehensive Results**: OCR text, confidence scores, translations, cultural insights
- **Error Handling**: Clear error messages for API failures
- **Responsive Design**: Works on desktop and mobile devices

## Development

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **File Upload**: Multer middleware
- **API Client**: Axios for HTTP requests