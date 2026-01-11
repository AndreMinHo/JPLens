// DOM elements
const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const fileText = document.querySelector('.file-text');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const errorDiv = document.getElementById('error');

// Camera elements
const cameraBtn = document.getElementById('cameraBtn');
const cameraContainer = document.getElementById('cameraContainer');
const cameraVideo = document.getElementById('cameraVideo');
const captureBtn = document.getElementById('captureBtn');
const cancelCameraBtn = document.getElementById('cancelCameraBtn');

let cameraStream = null;

// Result elements
const ocrText = document.getElementById('ocrText');
const confidence = document.getElementById('confidence');
const basicTranslation = document.getElementById('basicTranslation');
const aiAnalysis = document.getElementById('aiAnalysis');
const errorMessage = document.getElementById('errorMessage');

// Update file input label when file is selected
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileText.textContent = file.name;
    } else {
        fileText.textContent = 'Choose an image...';
    }
});

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);

    // Show loading, hide other sections
    showLoading();
    hideResults();
    hideError();

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            displayResults(data);
        } else {
            showError(data.error || 'An error occurred while processing the image');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to connect to the server. Please make sure the APIs are running.');
    }
});

// Display functions
function showLoading() {
    loading.style.display = 'block';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Processing...';
}

function hideLoading() {
    loading.style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Image';
}

function displayResults(data) {
    hideLoading();
    results.style.display = 'block';

    // OCR Text
    ocrText.textContent = data.ocr.text;
    confidence.textContent = `Confidence: ${(data.ocr.confidence * 100).toFixed(2)}%`;

    // Basic Translation
    const trans = data.basicTranslation.translation;
    basicTranslation.innerHTML = `
        <p><strong>Raw Text:</strong> ${data.basicTranslation.raw_text}</p>
        <p><strong>Literal:</strong> ${trans.literal}</p>
        <p><strong>Natural:</strong> ${trans.natural}</p>
        <p><strong>Context:</strong> ${data.basicTranslation.context.usage} (${data.basicTranslation.context.formality})</p>
    `;

    // AI Analysis
    const ai = data.aiAnalysis.ai_enhanced_analysis;
    aiAnalysis.innerHTML = `
        <p><strong>Natural Translation:</strong> ${ai.natural_translation}</p>
        <p><strong>Cultural Note:</strong> ${ai.cultural_note}</p>
        <p><strong>Insight:</strong> ${ai.insight}</p>
        <p><strong>Usage Example:</strong></p>
        <p>Japanese: ${ai.usage_example.example_japanese}</p>
        <p>English: ${ai.usage_example.example_english}</p>
    `;
}

function hideResults() {
    results.style.display = 'none';
}

function showError(message) {
    hideLoading();
    errorDiv.style.display = 'block';
    errorMessage.textContent = message;
}

function hideError() {
    errorDiv.style.display = 'none';
}

// Camera functionality
cameraBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', capturePhoto);
cancelCameraBtn.addEventListener('click', stopCamera);

async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraVideo.srcObject = cameraStream;
        cameraContainer.style.display = 'block';
        cameraBtn.style.display = 'none';
    } catch (error) {
        console.error('Error accessing camera:', error);
        showError('Unable to access camera. Please check permissions and try again.');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraVideo.srcObject = null;
    cameraContainer.style.display = 'none';
    cameraBtn.style.display = 'block';
}

function capturePhoto() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = cameraVideo.videoWidth;
    canvas.height = cameraVideo.videoHeight;
    ctx.drawImage(cameraVideo, 0, 0);

    canvas.toBlob((blob) => {
        const file = new File([blob], 'captured-photo.png', { type: 'image/png' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;
        fileText.textContent = 'Captured photo';
        stopCamera();
    }, 'image/png');
}
