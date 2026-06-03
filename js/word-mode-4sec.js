// Word-by-Word Mode App - 4 SECOND CAPTURE VERSION
class WordModeApp {
    constructor() {
        this.poseDetector = null;
        this.apiClient = new APIClient();
        this.isRunning = false;
        this.isCapturing = false;
        this.captureFrames = [];
        this.currentWord = null;
        this.sentence = [];
        
        this.elements = {
            video: document.getElementById('webcam'),
            canvas: document.getElementById('canvas'),
            status: document.getElementById('status'),
            currentWord: document.getElementById('currentWord'),
            confidence: document.getElementById('confidence'),
            countdown: document.getElementById('countdown'),
            wordChips: document.getElementById('wordChips'),
            translationResult: document.getElementById('translationResult'),
            startBtn: document.getElementById('startBtn'),
            captureBtn: document.getElementById('captureBtn'),
            addWordBtn: document.getElementById('addWordBtn'),
            translateBtn: document.getElementById('translateBtn'),
            clearBtn: document.getElementById('clearBtn'),
            stopBtn: document.getElementById('stopBtn')
        };

        this.setupEventListeners();
        this.checkAPIHealth();
    }

    setupEventListeners() {
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.captureBtn.addEventListener('click', () => this.captureGesture());
        this.elements.addWordBtn.addEventListener('click', () => this.addWordToSentence());
        this.elements.translateBtn.addEventListener('click', () => this.translateSentence());
        this.elements.clearBtn.addEventListener('click', () => this.clearSentence());
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
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            
            this.updateStatus('Initializing pose detection...');
            
            this.poseDetector = new PoseDetector(this.elements.video, this.elements.canvas);
            this.elements.video.srcObject = stream;
            
            await new Promise((resolve) => {
                this.elements.video.onloadedmetadata = () => {
                    this.elements.canvas.width = this.elements.video.videoWidth;
                    this.elements.canvas.height = this.elements.video.videoHeight;
                    resolve();
                };
            });
            
            await this.poseDetector.initialize();
            
            // Set callback for continuous frame capture
            this.poseDetector.onFrameCallback = (frames) => this.onFrameCapture(frames);
            
            this.poseDetector.processFrame();
            
            this.isRunning = true;
            this.elements.startBtn.style.display = 'none';
            this.elements.captureBtn.style.display = 'block';
            this.elements.clearBtn.style.display = 'block';
            this.elements.stopBtn.style.display = 'block';
            this.updateStatus('Ready! Click "Capture Sign" when ready to sign');
            
        } catch (error) {
            console.error('Start error:', error);
            alert('Error: ' + error.message);
            this.updateStatus('Error: ' + error.message);
        }
    }

    async captureGesture() {
        if (this.isCapturing) return;
        
        this.isCapturing = true;
        this.captureFrames = [];
        this.elements.captureBtn.disabled = true;
        
        // Countdown
        await this.showCountdown();
        
        // Capture for 4 seconds (CHANGED FROM 2)
        this.updateStatus('Signing... Hold your gesture for 4 seconds!');
        this.elements.currentWord.textContent = '📹 Recording...';
        this.elements.confidence.textContent = '';
        
        // Actively capture frames for 4 seconds at ~30fps
        const captureInterval = setInterval(() => {
            if (this.poseDetector && this.poseDetector.lastFrame) {
                this.captureFrames.push(this.poseDetector.lastFrame);
            }
        }, 33); // ~30fps
        
        // CHANGED: 4000ms instead of 2000ms
        await new Promise(resolve => setTimeout(resolve, 4000));
        clearInterval(captureInterval);
        
        // Stop capturing
        this.updateStatus('Processing...');
        
        // Send frames to API
        await this.recognizeGesture();
        
        this.isCapturing = false;
        this.elements.captureBtn.disabled = false;
    }

    async showCountdown() {
        const countdown = this.elements.countdown;
        
        for (let i = 3; i > 0; i--) {
            countdown.textContent = i;
            countdown.classList.add('active');
            await new Promise(resolve => setTimeout(resolve, 1000));
            countdown.classList.remove('active');
        }
    }

    onFrameCapture(frames) {
        // Not used in word mode - we capture directly from poseDetector.lastFrame
    }

    async recognizeGesture() {
        if (this.captureFrames.length === 0) {
            this.updateStatus('No frames captured. Try again.');
            this.elements.currentWord.textContent = '-';
            return;
        }

        console.log(`[DEBUG] Captured ${this.captureFrames.length} frames`);

        try {
            const result = await this.apiClient.translate(this.captureFrames);
            
            if (result.words && result.words.length > 0) {
                this.currentWord = {
                    word: result.words[0],
                    confidence: result.confidence
                };
                
                this.elements.currentWord.textContent = result.words[0];
                this.elements.confidence.textContent = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
                
                // Show add button
                this.elements.addWordBtn.style.display = 'block';
                this.updateStatus('Word recognized! Add to sentence or capture another.');
            } else {
                this.elements.currentWord.textContent = '❌ Not recognized';
                this.elements.confidence.textContent = 'Try signing more clearly';
                this.updateStatus('No gesture recognized. Try again.');
            }
            
        } catch (error) {
            console.error('Recognition error:', error);
            this.updateStatus('Recognition failed. Try again.');
            this.elements.currentWord.textContent = '❌ Error';
        }
    }

    addWordToSentence() {
        if (!this.currentWord) return;
        
        this.sentence.push(this.currentWord.word);
        this.renderSentence();
        
        // Reset current word
        this.currentWord = null;
        this.elements.currentWord.textContent = '-';
        this.elements.confidence.textContent = '';
        this.elements.addWordBtn.style.display = 'none';
        
        // Show translate button if we have words
        if (this.sentence.length > 0) {
            this.elements.translateBtn.style.display = 'block';
        }
        
        this.updateStatus('Word added! Capture next word or translate sentence.');
    }

    renderSentence() {
        const container = this.elements.wordChips;
        container.innerHTML = '';
        
        if (this.sentence.length === 0) {
            container.innerHTML = '<span class="empty-state">No words yet. Start signing!</span>';
            return;
        }
        
        this.sentence.forEach((word, index) => {
            const chip = document.createElement('div');
            chip.className = 'word-chip';
            chip.innerHTML = `
                <span>${word}</span>
                <button class="remove-btn" onclick="app.removeWord(${index})">×</button>
            `;
            container.appendChild(chip);
        });
    }

    removeWord(index) {
        this.sentence.splice(index, 1);
        this.renderSentence();
        
        if (this.sentence.length === 0) {
            this.elements.translateBtn.style.display = 'none';
            this.elements.translationResult.classList.remove('active');
        }
    }

    async translateSentence() {
        if (this.sentence.length === 0) return;
        
        this.updateStatus('Translating to natural English...');
        this.elements.translateBtn.disabled = true;
        
        try {
            // Call API to translate word sequence
            const response = await fetch(`${this.apiClient.baseURL}/translate-sentence`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words: this.sentence })
            });
            
            const result = await response.json();
            
            this.elements.translationResult.textContent = `📝 ${result.translation}`;
            this.elements.translationResult.classList.add('active');
            this.updateStatus('Translation complete!');
            
        } catch (error) {
            console.error('Translation error:', error);
            // Fallback: just join words
            const fallback = this.sentence.join(' ') + '.';
            this.elements.translationResult.textContent = `📝 ${fallback}`;
            this.elements.translationResult.classList.add('active');
            this.updateStatus('Translation complete (basic mode)');
        }
        
        this.elements.translateBtn.disabled = false;
    }

    clearSentence() {
        this.sentence = [];
        this.currentWord = null;
        this.renderSentence();
        this.elements.currentWord.textContent = '-';
        this.elements.confidence.textContent = '';
        this.elements.addWordBtn.style.display = 'none';
        this.elements.translateBtn.style.display = 'none';
        this.elements.translationResult.classList.remove('active');
        this.updateStatus('Cleared! Ready to start new sentence.');
    }

    stop() {
        this.isRunning = false;
        
        if (this.poseDetector) {
            this.poseDetector.stop();
            this.poseDetector.clearCanvas();
        }
        
        this.elements.startBtn.style.display = 'block';
        this.elements.captureBtn.style.display = 'none';
        this.elements.addWordBtn.style.display = 'none';
        this.elements.translateBtn.style.display = 'none';
        this.elements.clearBtn.style.display = 'none';
        this.elements.stopBtn.style.display = 'none';
        
        this.updateStatus('Stopped');
        this.clearSentence();
    }

    updateStatus(message) {
        this.elements.status.textContent = message;
    }
}

// Initialize app
let app;
window.addEventListener('load', () => {
    app = new WordModeApp();
});
