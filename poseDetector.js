class PoseDetector {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.hands = null;
        this.pose = null;
        this.faceMesh = null;
        this.isInitialized = false;
        this.frameBuffer = [];
        this.onFrameCallback = null;
        this.currentHandsData = null;
        this.currentPoseData = null;
        this.currentFaceData = null;
    }

    async initialize() {
        // Initialize Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Initialize Pose
        this.pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        this.pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Initialize Face Mesh
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: false,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Set up result handlers
        this.hands.onResults((results) => this.onHandsResults(results));
        this.pose.onResults((results) => this.onPoseResults(results));
        this.faceMesh.onResults((results) => this.onFaceResults(results));

        this.isInitialized = true;
    }

    async startCamera() {
        this.processFrame();
    }

    async processFrame() {
        if (!this.isInitialized) return;

        await this.hands.send({ image: this.video });
        await this.pose.send({ image: this.video });
        await this.faceMesh.send({ image: this.video });

        requestAnimationFrame(() => this.processFrame());
    }

    onHandsResults(results) {
        this.currentHandsData = results;
    }

    onPoseResults(results) {
        this.currentPoseData = results;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawPose(results);
        this.drawHands(this.currentHandsData);
        this.drawFace(this.currentFaceData);
        
        this.extractSkeletalData();
    }

    onFaceResults(results) {
        this.currentFaceData = results;
    }

    drawHands(handsData) {
        if (!handsData || !handsData.multiHandLandmarks) return;

        handsData.multiHandLandmarks.forEach((landmarks, index) => {
            const handedness = handsData.multiHandedness[index].label;
            const color = handedness === 'Left' ? '#FF0000' : '#0000FF';
            
            drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, { color, lineWidth: 2 });
            drawLandmarks(this.ctx, landmarks, { color, radius: 3 });
        });
    }

    drawPose(results) {
        if (!results.poseLandmarks) return;

        drawConnectors(this.ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(this.ctx, results.poseLandmarks, { color: '#00FF00', radius: 3 });
    }

    drawFace(faceData) {
        if (!faceData || !faceData.multiFaceLandmarks) return;

        faceData.multiFaceLandmarks.forEach((landmarks) => {
            const keyPoints = [10, 152, 234, 454, 70, 300];
            keyPoints.forEach(idx => {
                if (landmarks[idx]) {
                    drawLandmarks(this.ctx, [landmarks[idx]], { color: '#FFFF00', radius: 2 });
                }
            });
        });
    }

    extractSkeletalData() {
        const skeletalData = {
            timestamp: Date.now(),
            frame_id: this.frameBuffer.length,
            pose_landmarks: null,
            left_hand: null,
            right_hand: null,
            face_landmarks: null
        };

        if (this.currentPoseData && this.currentPoseData.poseLandmarks) {
            skeletalData.pose_landmarks = this.currentPoseData.poseLandmarks.map(lm => [
                Math.round(lm.x * 1000) / 1000,
                Math.round(lm.y * 1000) / 1000,
                Math.round(lm.z * 1000) / 1000
            ]);
        }

        if (this.currentHandsData && this.currentHandsData.multiHandLandmarks) {
            this.currentHandsData.multiHandLandmarks.forEach((landmarks, index) => {
                const handedness = this.currentHandsData.multiHandedness[index].label;
                const handData = landmarks.map(lm => [
                    Math.round(lm.x * 1000) / 1000,
                    Math.round(lm.y * 1000) / 1000,
                    Math.round(lm.z * 1000) / 1000
                ]);

                if (handedness === 'Left') {
                    skeletalData.left_hand = handData;
                } else {
                    skeletalData.right_hand = handData;
                }
            });
        }

        if (this.currentFaceData && this.currentFaceData.multiFaceLandmarks) {
            const faceLandmarks = this.currentFaceData.multiFaceLandmarks[0];
            if (faceLandmarks) {
                const keyIndices = [10, 152, 234, 454, 70, 300];
                skeletalData.face_landmarks = keyIndices.map(idx => [
                    Math.round(faceLandmarks[idx].x * 1000) / 1000,
                    Math.round(faceLandmarks[idx].y * 1000) / 1000,
                    Math.round(faceLandmarks[idx].z * 1000) / 1000
                ]);
            }
        }

        this.frameBuffer.push(skeletalData);

        if (this.frameBuffer.length >= CONFIG.FRAME_BATCH_SIZE) {
            if (this.onFrameCallback) {
                this.onFrameCallback([...this.frameBuffer]);
            }
            this.frameBuffer = [];
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    stop() {
        if (this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
        }
    }
}
