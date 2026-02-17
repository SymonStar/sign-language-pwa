// Main App
class App {
    constructor() {
        this.poseDetector = null;
        this.apiClient = new APIClient();
        this.isRunning = false;
        
        this.elements = {
            video: document.getElementById('webcam'),
            canvas: document.getElementById('canvas'),
            status: document.getElementById('status'),
            translation: document.getElementById('translation'),
            words: document.getElementById('words'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn')
        };

        this.setupEventListeners();
        this.checkAPIHealth();
    }

    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.stopBtn.addEventListener('click', () => this.stop());
    }

    async checkAPIHealth() {
        this.updateStatus('Checking API connection...');
        const health = await this.apiClient.healthCheck();
        
        if (health && health.status === 'ok') {
            this.updateStatus('Ready to start');
        } else {
            this.updateStatus('API connection failed. Check backend.');
        }
    }

    async start() {
        try {
            this.updateStatus('Requesting camera permission...');
            
            // Request camera first
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            
            this.updateStatus('Initializing pose detection...');
            
            // Initialize pose detector
            this.poseDetector = new PoseDetector(this.elements.video, this.elements.canvas);
            
            // Give stream to video
            this.elements.video.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.elements.video.onloadedmetadata = () => {
                    this.elements.canvas.width = this.elements.video.videoWidth;
                    this.elements.canvas.height = this.elements.video.videoHeight;
                    resolve();
                };
            });
            
            await this.poseDetector.initialize();
            
            // Set callback for frame batches
            this.poseDetector.onFrameCallback = (frames) => this.onFrameBatch(frames);
            
            // Start processing
            this.poseDetector.processFrame();
            
            this.isRunning = true;
            this.elements.startBtn.style.display = 'none';
            this.elements.stopBtn.style.display = 'block';
            this.updateStatus('Active - Start signing!', 'active');
            
        } catch (error) {
            console.error('Start error:', error);
            alert('Error: ' + error.message);
            this.updateStatus('Error: ' + error.message);
        }
    }

    async onFrameBatch(frames) {
        if (!this.isRunning) return;

        try {
            this.updateStatus('Processing...', 'processing');
            
            const result = await this.apiClient.translate(frames);
            
            this.elements.translation.textContent = result.translation;
            this.elements.words.textContent = `Recognized: ${result.words.join(', ')}`;
            
            this.updateStatus('Active - Start signing!', 'active');
            
        } catch (error) {
            console.error('Translation error:', error);
            this.updateStatus('Translation failed. Retrying...');
        }
    }

    stop() {
        this.isRunning = false;
        
        if (this.poseDetector) {
            this.poseDetector.stop();
            this.poseDetector.clearCanvas();
        }
        
        this.elements.startBtn.style.display = 'block';
        this.elements.stopBtn.style.display = 'none';
        this.updateStatus('Stopped');
        this.elements.translation.textContent = 'Start signing...';
        this.elements.words.textContent = '';
    }

    updateStatus(message, className = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = 'status ' + className;
    }
}

// Initialize app when page loads
window.addEventListener('load', () => {
    new App();
});
