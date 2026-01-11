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

## Authentication

The application supports optional password authentication. Authentication is **only active when the `APP_PASSWORD` environment variable is set**.

- When `APP_PASSWORD` is not set: No authentication required (works like before)
- When `APP_PASSWORD` is set: Users will be prompted to enter credentials
  - **Username**: `admin` (fixed)
  - **Password**: Value of the `APP_PASSWORD` environment variable

### Setting the Password

**For Railway Deployment (to enable authentication):**
1. Go to your Railway project dashboard
2. Click on "Variables" in the project settings
3. Add a new variable: `APP_PASSWORD` with your desired password value
4. Redeploy the application to apply the changes

**For Local Development (optional):**
Add `APP_PASSWORD=your_password_here` to your `.env` file if you want to test authentication locally.

**Note**: The `/health` endpoint remains publicly accessible for monitoring purposes without authentication.

## Installation

```bash
npm install
```

## Usage

### Local Development (Multiple Options)

#### Option 1: Manual Setup
1. **Start the APIs:**
   - Start JPLensContext: `cd ../JPLensContext && uvicorn backend.main:app --reload`
   - Start JPLensAIContext: `cd ../JPLensAIContext && python main.py`

2. **Start the master app:**
   ```bash
   npm run dev  # For development with hot reloading
   # OR
   npm start    # For production mode
   ```

#### Option 2: Docker Compose (Recommended)
```bash
npm run docker:compose
```
This will start all three services (JPLensContext, JPLensAIContext, and Master App) in containers with proper networking.

#### Option 3: Individual Docker Containers
```bash
# Build the master app container
npm run docker:build

# Run in development mode (with hot reloading)
npm run docker:dev

# OR run in production mode
npm run docker:run
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
   
   **Option A: Internal URLs (Recommended for Better Performance)**
   
   If all services are in the same Railway project, use internal URLs:
   ```
   JPLENS_CONTEXT_URL=http://<JPLENS_CONTEXT_INTERNAL_URL>:PORT
   JPLENS_AI_CONTEXT_URL=http://<JPLENS_AI_CONTEXT_INTERNAL_URL>:PORT
   PORT=3000  # Usually set automatically by Railway
   ```
   
   **IMPORTANT**: Railway internal URLs **MUST include the port number**. Check each backend service's logs to confirm what port they're listening on. Common ports: 8000, 8001, 3000, 5000, etc.
   
   **Option B: Public URLs (Alternative)**
   
   If internal URLs don't work or services are in different projects:
   ```
   JPLENS_CONTEXT_URL=https://your-jplens-context-url.railway.app
   JPLENS_AI_CONTEXT_URL=https://your-jplens-ai-context-url.railway.app
   PORT=3000  # Usually set automatically by Railway
   ```

3. **Deployment Notes:**
   - Railway will automatically detect and use railwaypack (via NIXPACKS) for Node.js deployment
   - The `railway.json` configuration ensures proper health checks and restart policies
   - Build and deployment typically take 2-5 minutes
   - Note: `Dockerfile` is kept for local Docker development but Railway uses railwaypack

4. **Access the Application:**
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

- **Image Upload**: Drag-and-drop or click to select images (max 10MB)
- **Automatic Image Optimization**: Images are automatically resized to max 500px on longest side for faster processing
- **Real-time Processing**: Visual feedback during analysis
- **Comprehensive Results**: OCR text, confidence scores, translations, cultural insights
- **Error Handling**: Clear error messages for API failures, oversized files, and invalid images
- **Responsive Design**: Works on desktop and mobile devices

## Development

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **File Upload**: Multer middleware
- **API Client**: Axios for HTTP requests
