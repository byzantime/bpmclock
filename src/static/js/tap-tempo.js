/**
 * Tap Tempo Perfectionist
 * PID controller-based rhythm training app
 */

// ========================================
// Constants and Configuration
// ========================================

const PID_CONFIG = {
    Kp: 1.0,    // Proportional gain - immediate error response
    Ki: 0.3,    // Integral gain - accumulated error (rushing/dragging)
    Kd: 0.5,    // Derivative gain - rate of change (accelerating/decelerating)
};

const THRESHOLDS = {
    PERFECT: 0.02,      // Within 2% is perfect
    GOOD: 0.05,         // Within 5% is good
    ACCEPTABLE: 0.10,   // Within 10% is acceptable
};

const COLORS = {
    PERFECT: '#4a7c59',     // success-green
    GOOD: '#c4914e',        // warning-amber
    OFF: '#a85858',         // error-red
    NEUTRAL: '#5b7c99',     // slate-blue
};

// ========================================
// State Management
// ========================================

class TapTempoState {
    constructor() {
        this.reset();
    }

    reset() {
        this.targetBPM = 120;
        this.targetInterval = 500; // milliseconds
        this.sessionDuration = 60; // seconds

        this.isRunning = false;
        this.startTime = null;
        this.elapsedTime = 0;

        this.taps = [];
        this.tapIntervals = [];

        // PID controller state
        this.errorIntegral = 0;
        this.previousError = 0;

        // Statistics
        this.accuracyHistory = [];
        this.runningAccuracy = 0;
    }

    setTargetBPM(bpm) {
        this.targetBPM = bpm;
        this.targetInterval = (60 / bpm) * 1000;
    }

    addTap(timestamp) {
        this.taps.push(timestamp);

        if (this.taps.length >= 2) {
            const interval = timestamp - this.taps[this.taps.length - 2];
            this.tapIntervals.push(interval);
        }
    }

    getLastInterval() {
        return this.tapIntervals.length > 0
            ? this.tapIntervals[this.tapIntervals.length - 1]
            : null;
    }

    calculatePID() {
        if (this.tapIntervals.length === 0) {
            return { p: 0, i: 0, d: 0, total: 0 };
        }

        const lastInterval = this.getLastInterval();
        const error = lastInterval - this.targetInterval;

        // P: Proportional - current error
        const p = error * PID_CONFIG.Kp;

        // I: Integral - accumulated error over time
        this.errorIntegral += error;
        const i = this.errorIntegral * PID_CONFIG.Ki;

        // D: Derivative - rate of change of error
        const d = (error - this.previousError) * PID_CONFIG.Kd;
        this.previousError = error;

        const total = p + i + d;

        return { p, i, d, total };
    }

    calculateAccuracy() {
        if (this.tapIntervals.length === 0) return null;

        const lastInterval = this.getLastInterval();
        const error = Math.abs(lastInterval - this.targetInterval);
        const errorPercent = error / this.targetInterval;
        const accuracy = Math.max(0, 1 - errorPercent) * 100;

        this.accuracyHistory.push(accuracy);

        // Running average
        if (this.accuracyHistory.length > 0) {
            const sum = this.accuracyHistory.reduce((a, b) => a + b, 0);
            this.runningAccuracy = sum / this.accuracyHistory.length;
        }

        return accuracy;
    }

    getTempoStatus() {
        if (this.tapIntervals.length < 3) {
            return { status: 'warming-up', text: 'Keep tapping...' };
        }

        const pid = this.calculatePID();
        const lastInterval = this.getLastInterval();
        const error = lastInterval - this.targetInterval;
        const errorPercent = Math.abs(error) / this.targetInterval;

        // Check if on time
        if (errorPercent < THRESHOLDS.PERFECT) {
            return { status: 'on-time', text: 'Perfect timing!', class: 'on-time' };
        }

        // Check rushing vs dragging (integral term)
        if (Math.abs(pid.i) > this.targetInterval * 0.1) {
            if (pid.i < 0) {
                return { status: 'rushing', text: 'Rushing overall', class: 'rushing' };
            } else {
                return { status: 'dragging', text: 'Dragging overall', class: 'dragging' };
            }
        }

        // Check acceleration/deceleration (derivative term)
        if (Math.abs(pid.d) > this.targetInterval * 0.05) {
            if (pid.d < 0) {
                return { status: 'accelerating', text: 'Accelerating', class: 'accelerating' };
            } else {
                return { status: 'decelerating', text: 'Decelerating', class: 'decelerating' };
            }
        }

        // Default: slight error
        if (error < 0) {
            return { status: 'rushing', text: 'Slightly early', class: 'rushing' };
        } else {
            return { status: 'dragging', text: 'Slightly late', class: 'dragging' };
        }
    }
}

// ========================================
// Audio Metronome
// ========================================

class AudioMetronome {
    constructor() {
        this.audioContext = null;
        this.intervalId = null;
        this.isRunning = false;
        this.bpm = 120;
        this.visualCallback = null;
    }

    init() {
        // Create audio context on user interaction
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    setBPM(bpm) {
        this.bpm = bpm;
        if (this.isRunning) {
            this.stop();
            this.start();
        }
    }

    setVisualCallback(callback) {
        this.visualCallback = callback;
    }

    playClick() {
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;

        // Create oscillator for click sound
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // High frequency click
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        // Short envelope for crisp click
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        oscillator.start(now);
        oscillator.stop(now + 0.03);

        // Trigger visual callback
        if (this.visualCallback) {
            this.visualCallback();
        }
    }

    start() {
        this.init();

        if (this.isRunning) return;

        this.isRunning = true;
        const intervalMs = (60 / this.bpm) * 1000;

        // Play first click immediately
        this.playClick();

        // Schedule subsequent clicks
        this.intervalId = setInterval(() => {
            this.playClick();
        }, intervalMs);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}

// ========================================
// Visualization (Canvas)
// ========================================

class CircularVisualization {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maxTaps = 60; // Show last 60 taps
        this.centerX = canvas.width / 2;
        this.centerY = canvas.height / 2;
        // Larger outer radius for the visualization ring
        this.outerRadius = Math.min(this.centerX, this.centerY) - 20;
        // Inner radius to clear space for the tap button (256px diameter = 128px radius + padding)
        this.innerRadius = 140;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(state) {
        this.clear();
        this.drawClockFace();
        this.drawTaps(state);
    }

    drawClockFace() {
        const ctx = this.ctx;

        // Draw outer circle
        ctx.strokeStyle = '#e8e5e0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.outerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw inner circle (around tap button)
        ctx.strokeStyle = '#e8e5e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, this.innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw tick marks (12 positions like a clock) on outer ring
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI * 2 / 12) - Math.PI / 2;
            const x1 = this.centerX + Math.cos(angle) * (this.outerRadius - 15);
            const y1 = this.centerY + Math.sin(angle) * (this.outerRadius - 15);
            const x2 = this.centerX + Math.cos(angle) * this.outerRadius;
            const y2 = this.centerY + Math.sin(angle) * this.outerRadius;

            ctx.strokeStyle = '#e8e5e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    drawTaps(state) {
        if (state.taps.length === 0) return;

        const ctx = this.ctx;
        const tapsToShow = state.taps.slice(-this.maxTaps);
        const intervalsToShow = state.tapIntervals.slice(-this.maxTaps);

        // Position dots in the middle of the ring (between inner and outer radius)
        const ringRadius = (this.innerRadius + this.outerRadius) / 2;

        tapsToShow.forEach((tap, index) => {
            // Calculate position around circle
            const angle = (index / this.maxTaps) * Math.PI * 2 - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * ringRadius;
            const y = this.centerY + Math.sin(angle) * ringRadius;

            // Determine color based on accuracy
            let color = COLORS.NEUTRAL;
            let size = 6;

            if (index > 0 && intervalsToShow[index - 1]) {
                const interval = intervalsToShow[index - 1];
                const error = Math.abs(interval - state.targetInterval);
                const errorPercent = error / state.targetInterval;

                if (errorPercent < THRESHOLDS.PERFECT) {
                    color = COLORS.PERFECT;
                    size = 7;
                } else if (errorPercent < THRESHOLDS.GOOD) {
                    color = COLORS.GOOD;
                    size = 6;
                } else {
                    color = COLORS.OFF;
                    size = 5;
                }
            }

            // Draw tap dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();

            // Add subtle glow for recent taps
            if (index >= tapsToShow.length - 5) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(x, y, size + 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        });
    }
}

// ========================================
// UI Controller
// ========================================

class TapTempoUI {
    constructor() {
        this.state = new TapTempoState();
        this.visualization = null;
        this.metronome = new AudioMetronome();
        this.sessionTimer = null;
        this.updateTimer = null;

        this.initElements();
        this.initEventListeners();
        this.initMetronome();
    }

    initMetronome() {
        // Set up visual callback for metronome beats
        this.metronome.setVisualCallback(() => {
            this.pulseMetronomeIndicator();
        });
    }

    pulseMetronomeIndicator() {
        const indicator = document.getElementById('metronome-pulse');
        if (!indicator) return;

        // Add pulse effect
        indicator.style.transform = 'scale(1.4)';
        indicator.style.opacity = '1';

        setTimeout(() => {
            indicator.style.transform = 'scale(1)';
            indicator.style.opacity = '0.6';
        }, 100);
    }

    initElements() {
        // Setup screen
        this.setupScreen = document.getElementById('setup-screen');
        this.targetBPMInput = document.getElementById('target-bpm');
        this.targetIntervalDisplay = document.getElementById('target-interval');
        this.sessionDurationSelect = document.getElementById('session-duration');
        this.startButton = document.getElementById('start-button');
        this.bpmDecreaseBtn = document.getElementById('bpm-decrease');
        this.bpmIncreaseBtn = document.getElementById('bpm-increase');

        // Training screen
        this.trainingScreen = document.getElementById('training-screen');
        this.tapZone = document.getElementById('tap-zone');
        this.timeRemaining = document.getElementById('time-remaining');
        this.tapCount = document.getElementById('tap-count');
        this.accuracy = document.getElementById('accuracy');
        this.tempoStatus = document.getElementById('tempo-status');
        this.tapFeedback = document.getElementById('tap-feedback');
        this.stopButton = document.getElementById('stop-button');

        // PID debug
        this.pidP = document.getElementById('pid-p');
        this.pidI = document.getElementById('pid-i');
        this.pidD = document.getElementById('pid-d');

        // Canvas
        const canvas = document.getElementById('tap-circle');
        this.visualization = new CircularVisualization(canvas);

        // Summary screen
        this.summaryScreen = document.getElementById('summary-screen');
        this.summaryVerdict = document.getElementById('summary-verdict');
        this.summaryTaps = document.getElementById('summary-taps');
        this.summaryAccuracy = document.getElementById('summary-accuracy');
        this.summaryConsistency = document.getElementById('summary-consistency');
        this.summaryTendency = document.getElementById('summary-tendency');
        this.summaryStability = document.getElementById('summary-stability');
        this.summaryBestRun = document.getElementById('summary-best-run');
        this.retryButton = document.getElementById('retry-button');
        this.newSettingsButton = document.getElementById('new-settings-button');
    }

    initEventListeners() {
        // Setup screen
        this.startButton.addEventListener('click', () => this.startSession());
        this.targetBPMInput.addEventListener('input', (e) => this.updateTargetBPM(e.target.value));
        this.bpmDecreaseBtn.addEventListener('click', () => this.adjustBPM(-5));
        this.bpmIncreaseBtn.addEventListener('click', () => this.adjustBPM(5));

        // Training screen
        this.tapZone.addEventListener('click', () => this.handleTap());
        this.tapZone.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                this.handleTap();
            }
        });
        this.stopButton.addEventListener('click', () => this.endSession());

        // Summary screen
        this.retryButton.addEventListener('click', () => this.retrySession());
        this.newSettingsButton.addEventListener('click', () => this.showSetup());

        // Global keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (this.state.isRunning && e.code === 'Space') {
                e.preventDefault();
                this.handleTap();
            }
        });
    }

    adjustBPM(delta) {
        const currentBPM = parseInt(this.targetBPMInput.value);
        const newBPM = Math.max(40, Math.min(240, currentBPM + delta));
        this.targetBPMInput.value = newBPM;
        this.updateTargetBPM(newBPM);
    }

    updateTargetBPM(bpm) {
        const interval = Math.round((60 / bpm) * 1000);
        this.targetIntervalDisplay.textContent = interval;
    }

    showSetup() {
        this.setupScreen.classList.remove('hidden');
        this.trainingScreen.classList.add('hidden');
        this.summaryScreen.classList.add('hidden');
    }

    showTraining() {
        this.setupScreen.classList.add('hidden');
        this.trainingScreen.classList.remove('hidden');
        this.summaryScreen.classList.add('hidden');

        // Focus tap zone for keyboard input
        this.tapZone.focus();
    }

    showSummary() {
        this.setupScreen.classList.add('hidden');
        this.trainingScreen.classList.add('hidden');
        this.summaryScreen.classList.remove('hidden');
    }

    startSession() {
        // Get settings
        this.state.reset();
        this.state.setTargetBPM(parseInt(this.targetBPMInput.value));
        this.state.sessionDuration = parseInt(this.sessionDurationSelect.value);

        // Start session
        this.state.isRunning = true;
        this.state.startTime = Date.now();

        // Start metronome
        this.metronome.setBPM(this.state.targetBPM);
        this.metronome.start();

        // Show training screen
        this.showTraining();
        this.updateUI();

        // Start timers
        this.sessionTimer = setTimeout(() => this.endSession(), this.state.sessionDuration * 1000);
        this.updateTimer = setInterval(() => this.updateUI(), 100);
    }

    retrySession() {
        // Use same settings
        const bpm = this.state.targetBPM;
        const duration = this.state.sessionDuration;

        this.state.reset();
        this.state.setTargetBPM(bpm);
        this.state.sessionDuration = duration;

        this.state.isRunning = true;
        this.state.startTime = Date.now();

        // Start metronome
        this.metronome.setBPM(this.state.targetBPM);
        this.metronome.start();

        this.showTraining();
        this.updateUI();

        this.sessionTimer = setTimeout(() => this.endSession(), this.state.sessionDuration * 1000);
        this.updateTimer = setInterval(() => this.updateUI(), 100);
    }

    endSession() {
        this.state.isRunning = false;

        // Stop metronome
        this.metronome.stop();

        if (this.sessionTimer) clearTimeout(this.sessionTimer);
        if (this.updateTimer) clearInterval(this.updateTimer);

        this.generateSummary();
        this.showSummary();
    }

    handleTap() {
        if (!this.state.isRunning) return;

        const timestamp = Date.now();
        this.state.addTap(timestamp);

        // Visual feedback
        this.tapZone.classList.add('active');
        setTimeout(() => this.tapZone.classList.remove('active'), 150);

        // Update immediately
        this.updateUI();
    }

    updateUI() {
        if (!this.state.isRunning) return;

        // Update timer
        const elapsed = Math.floor((Date.now() - this.state.startTime) / 1000);
        const remaining = Math.max(0, this.state.sessionDuration - elapsed);
        this.timeRemaining.textContent = remaining;

        // Update tap count
        this.tapCount.textContent = this.state.taps.length;

        // Update accuracy
        if (this.state.runningAccuracy > 0) {
            this.accuracy.textContent = this.state.runningAccuracy.toFixed(1) + '%';
        } else {
            this.accuracy.textContent = '—';
        }

        // Update tempo status
        if (this.state.tapIntervals.length > 0) {
            const status = this.state.getTempoStatus();
            this.tempoStatus.innerHTML = `<span class="tempo-indicator ${status.class}">${status.text}</span>`;

            // Update tap feedback
            const lastAccuracy = this.state.calculateAccuracy();
            if (lastAccuracy !== null) {
                const lastInterval = this.state.getLastInterval();
                const diff = lastInterval - this.state.targetInterval;
                const diffMs = Math.abs(diff).toFixed(0);

                if (Math.abs(diff) / this.state.targetInterval < THRESHOLDS.PERFECT) {
                    this.tapFeedback.textContent = `Perfect! (${lastAccuracy.toFixed(1)}%)`;
                    this.tapFeedback.style.color = COLORS.PERFECT;
                } else if (diff < 0) {
                    this.tapFeedback.textContent = `${diffMs}ms early`;
                    this.tapFeedback.style.color = COLORS.GOOD;
                } else {
                    this.tapFeedback.textContent = `${diffMs}ms late`;
                    this.tapFeedback.style.color = COLORS.GOOD;
                }
            }
        }

        // Update PID values
        const pid = this.state.calculatePID();
        this.pidP.textContent = pid.p.toFixed(1);
        this.pidI.textContent = pid.i.toFixed(1);
        this.pidD.textContent = pid.d.toFixed(1);

        // Update visualization
        this.visualization.draw(this.state);
    }

    generateSummary() {
        // Basic stats
        this.summaryTaps.textContent = this.state.taps.length;
        this.summaryAccuracy.textContent = this.state.runningAccuracy.toFixed(1) + '%';

        // Consistency score (0-100 based on standard deviation)
        if (this.state.tapIntervals.length > 1) {
            const mean = this.state.tapIntervals.reduce((a, b) => a + b, 0) / this.state.tapIntervals.length;
            const variance = this.state.tapIntervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.state.tapIntervals.length;
            const stdDev = Math.sqrt(variance);
            const consistency = Math.max(0, 100 - (stdDev / this.state.targetInterval * 100));
            this.summaryConsistency.textContent = consistency.toFixed(0);
        } else {
            this.summaryConsistency.textContent = '—';
        }

        // Tendency analysis
        const avgError = this.state.tapIntervals.length > 0
            ? this.state.tapIntervals.reduce((sum, interval) => sum + (interval - this.state.targetInterval), 0) / this.state.tapIntervals.length
            : 0;

        if (Math.abs(avgError) < this.state.targetInterval * 0.02) {
            this.summaryTendency.textContent = 'Perfectly balanced';
        } else if (avgError < 0) {
            this.summaryTendency.textContent = `Rushing (avg ${Math.abs(avgError).toFixed(0)}ms early)`;
        } else {
            this.summaryTendency.textContent = `Dragging (avg ${avgError.toFixed(0)}ms late)`;
        }

        // Stability (looking at derivative)
        const tempoChanges = [];
        for (let i = 1; i < this.state.tapIntervals.length; i++) {
            tempoChanges.push(Math.abs(this.state.tapIntervals[i] - this.state.tapIntervals[i - 1]));
        }
        const avgChange = tempoChanges.length > 0
            ? tempoChanges.reduce((a, b) => a + b, 0) / tempoChanges.length
            : 0;

        if (avgChange < this.state.targetInterval * 0.05) {
            this.summaryStability.textContent = 'Very stable';
        } else if (avgChange < this.state.targetInterval * 0.1) {
            this.summaryStability.textContent = 'Moderately stable';
        } else {
            this.summaryStability.textContent = 'Inconsistent tempo';
        }

        // Best accuracy run (consecutive perfect taps)
        let bestRun = 0;
        let currentRun = 0;
        this.state.tapIntervals.forEach(interval => {
            const error = Math.abs(interval - this.state.targetInterval);
            const errorPercent = error / this.state.targetInterval;
            if (errorPercent < THRESHOLDS.PERFECT) {
                currentRun++;
                bestRun = Math.max(bestRun, currentRun);
            } else {
                currentRun = 0;
            }
        });
        this.summaryBestRun.textContent = bestRun > 0 ? `${bestRun} perfect taps` : 'None';

        // Verdict
        if (this.state.runningAccuracy >= 98) {
            this.summaryVerdict.textContent = 'Outstanding! You have metronome-like precision.';
        } else if (this.state.runningAccuracy >= 95) {
            this.summaryVerdict.textContent = 'Excellent work! Very consistent timing.';
        } else if (this.state.runningAccuracy >= 90) {
            this.summaryVerdict.textContent = 'Good job! Keep practicing for even better consistency.';
        } else if (this.state.runningAccuracy >= 80) {
            this.summaryVerdict.textContent = 'Not bad! Focus on maintaining steady tempo.';
        } else {
            this.summaryVerdict.textContent = 'Keep practicing! Consistency takes time to develop.';
        }
    }
}

// ========================================
// Initialize App
// ========================================

let app;

function init() {
    app = new TapTempoUI();
    console.log('Tap Tempo Perfectionist initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
