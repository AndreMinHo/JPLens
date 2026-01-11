// DOM elements
const uploadForm = document.getElementById('uploadForm');
const imageInput = document.getElementById('imageInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const fileText = document.querySelector('.file-text');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const errorDiv = document.getElementById('error');

// Cropping elements
const cropperSection = document.getElementById('cropperSection');
const cropperImage = document.getElementById('cropperImage');
const cropBtn = document.getElementById('cropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');

// Result elements
const ocrText = document.getElementById('ocrText');
const confidence = document.getElementById('confidence');
const basicTranslation = document.getElementById('basicTranslation');
const aiAnalysis = document.getElementById('aiAnalysis');
const errorMessage = document.getElementById('errorMessage');

// Global variables
let cropper = null;
let selectedFile = null;
let isCroppingActive = false;

// Cropping functions
function showCroppingInterface(file) {
    // Create object URL for the image
    const imageUrl = URL.createObjectURL(file);

    // Set the image source
    cropperImage.src = imageUrl;

    // Show the cropping section
    cropperSection.style.display = 'block';

    // Hide upload section and other elements
    document.querySelector('.upload-section').style.display = 'none';
    hideLoading();
    hideResults();
    hideError();

    // Initialize cropper when image loads
    cropperImage.onload = () => {
        // Destroy existing cropper if it exists
        if (cropper) {
            cropper.destroy();
        }

        // Check if device is mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

        // Initialize new cropper with mobile optimizations
        cropper = new Cropper(cropperImage, {
            aspectRatio: NaN, // Free cropping by default
            viewMode: 1,
            dragMode: 'move',
            responsive: true,
            restore: false,
            checkCrossOrigin: false,
            checkOrientation: false,
            modal: true,
            guides: true,
            center: true,
            highlight: false,
            background: false,
            autoCrop: true,
            autoCropArea: isMobile ? 0.6 : 0.8, // Smaller initial crop area on mobile
            zoomOnWheel: !isMobile, // Disable wheel zoom on mobile to prevent conflicts
            zoomOnTouch: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: !isMobile, // Disable double-click on mobile
            minCropBoxWidth: isMobile ? 50 : 0, // Minimum crop box size on mobile
            minCropBoxHeight: isMobile ? 50 : 0,
            wheelZoomRatio: 0.1, // Slower zoom for better control
            touchDragZoom: isMobile, // Enable touch drag zoom on mobile
        });
    };
}

function hideCroppingInterface() {
    cropperSection.style.display = 'none';
    document.querySelector('.upload-section').style.display = 'block';

    // Destroy cropper and revoke object URL
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    if (cropperImage.src) {
        URL.revokeObjectURL(cropperImage.src);
        cropperImage.src = '';
    }
}

// Event handlers for cropping controls
cropBtn.addEventListener('click', () => {
    if (cropper && selectedFile) {
        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            maxWidth: 4096,
            maxHeight: 4096,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        // Convert canvas to blob
        canvas.toBlob((blob) => {
            // Create a new file from the blob
            const croppedFile = new File([blob], selectedFile.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
            });

            // Update the file input with the cropped image
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(croppedFile);
            imageInput.files = dataTransfer.files;

            // Hide cropping interface and show upload section
            hideCroppingInterface();

            // Auto-submit the form
            uploadForm.dispatchEvent(new Event('submit'));
        }, 'image/jpeg', 0.95);
    }
});

cancelCropBtn.addEventListener('click', () => {
    // Hide cropping interface and show upload section
    hideCroppingInterface();
});

// Update file input label when file is selected and show cropping interface
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        if (!allowedTypes.includes(file.type)) {
            showError('Invalid file type. Please select a valid image file (JPEG, PNG, GIF, WebP, or BMP).');
            imageInput.value = ''; // Clear the input
            fileText.textContent = 'Choose an image...';
            return;
        }

        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            showError('File size too large. Please select an image smaller than 10MB.');
            imageInput.value = ''; // Clear the input
            fileText.textContent = 'Choose an image...';
            return;
        }

        // Check if file is empty
        if (file.size === 0) {
            showError('Empty file detected. Please select a valid image file.');
            imageInput.value = ''; // Clear the input
            fileText.textContent = 'Choose an image...';
            return;
        }

        // Store the selected file
        selectedFile = file;
        fileText.textContent = file.name;

        // Show cropping interface
        showCroppingInterface(file);
    } else {
        fileText.textContent = 'Choose an image...';
        selectedFile = null;
        hideCroppingInterface();
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
