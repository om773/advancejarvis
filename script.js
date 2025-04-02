const startButton = document.getElementById('startbutton-btn');

class VoiceAssistant {
    
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.visualizer = null;
        
        this.initializeElements();
        this.setupSpeechRecognition();
        this.setupVisualizer();
        this.addEventListeners();
    }

    initializeElements() {
        this.startButton = document.getElementById('startButton');
        this.statusText = document.getElementById('status-text');
        this.historyDiv = document.getElementById('history');
        this.visualizerCanvas = document.getElementById('visualizer');
    }

    setupSpeechRecognition() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-IN';

            this.recognition.onstart = () => this.onRecognitionStart();
            this.recognition.onend = () => this.onRecognitionEnd();
            this.recognition.onresult = (event) => this.onRecognitionResult(event);
            this.recognition.onerror = (event) => this.onRecognitionError(event);
        } else {
            this.showError("Speech recognition is not supported in this browser.");
        }
    }
    

    setupVisualizer() {
        const canvas = this.visualizerCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        this.visualizer = {
            draw: () => {
                ctx.clearRect(0, 0, width, height);
                if (this.isListening) {
                    // Create animated waves
                    ctx.beginPath();
                    ctx.moveTo(0, height/2);
                    for(let i = 0; i < width; i++) {
                        const y = height/2 + Math.sin(i/10 + Date.now()/200) * 20;
                        ctx.lineTo(i, y);
                    }
                    ctx.strokeStyle = getComputedStyle(document.documentElement)
                        .getPropertyValue('--bs-info');
                    ctx.stroke();
                } else {
                    // Draw flat line
                    ctx.beginPath();
                    ctx.moveTo(0, height/2);
                    ctx.lineTo(width, height/2);
                    ctx.strokeStyle = '#666';
                    ctx.stroke();
                }
                requestAnimationFrame(() => this.visualizer.draw());
            }
        };
        this.visualizer.draw();
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.toggleListening());
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        this.recognition.start();
        this.isListening = true;
        this.startButton.innerHTML = '<i class="bi bi-mic-mute"></i> Stop Listening';
        this.startButton.classList.add('btn-danger');
        this.startButton.classList.remove('btn-primary');
        document.body.classList.add('listening');
    }

    stopListening() {
        this.recognition.stop();
        this.isListening = false;
        this.startButton.innerHTML = '<i class="bi bi-mic"></i> Start Listening';
        this.startButton.classList.add('btn-primary');
        this.startButton.classList.remove('btn-danger');
        document.body.classList.remove('listening');
    }

    async processCommand(command) {
        try {
            const response = await fetch('/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command: command })
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, I encountered an error processing your request.';
        }
    }

    speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        this.synthesis.speak(utterance);
    }

    addToHistory(command, response) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="user-command">
                <i class="bi bi-person-circle"></i> You: ${command}
            </div>
            <div class="assistant-response">
                <i class="bi bi-robot"></i> Jarvis: ${response}
            </div>
        `;
        this.historyDiv.insertBefore(historyItem, this.historyDiv.firstChild);
    }

    updateStatus(text, type = 'secondary') {
        this.statusText.textContent = text;
        this.statusText.className = `badge bg-${type}`;
    }

    showError(message) {
        this.updateStatus(message, 'danger');
        this.addToHistory('Error', message);
    }

    // Speech Recognition Event Handlers
    onRecognitionStart() {
        this.updateStatus('Listening...', 'success');
    }

    onRecognitionEnd() {
        this.stopListening();
        this.updateStatus('Click to Start', 'secondary');
    }

    async onRecognitionResult(event) {
        const command = event.results[0][0].transcript;
        this.updateStatus('Processing...', 'info');
        
        const response = await this.processCommand(command);
        this.addToHistory(command, response);
        this.speak(response);
        
        this.updateStatus('Click to Start', 'secondary');
    }

    onRecognitionError(event) {
        this.showError(`Error: ${event.error}`);
        this.stopListening();
    }
}

// Initialize the voice assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const assistant = new VoiceAssistant();
});