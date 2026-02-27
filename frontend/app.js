/**
 * PDERAX - AI Document Analysis Platform
 * Clean, Stable & Optimized Version with Progress Visualization
 */

class PDERAXApp {
    constructor() {
        this.currentAnalysis = null;
        this.isProcessing = false;
        this.analysisChart = null;
        this.progressInterval = null;
        this.currentStage = 0;
        this.flashcards = [];
        this.currentFlashcardIndex = 0;
        
        // DOM Elements with safe fallbacks
        this.elements = this.initializeElements();
        this.init();
    }

    initializeElements() {
        const elements = {};
        const elementIds = [
            'uploadSection', 'loadingSection', 'resultsSection', 'errorSection',
            'fileInput', 'uploadArea', 'fileInfo', 'downloadButtons',
            'summaryContent', 'insightsContent', 'qaContent', 'errorMessage',
            'overviewStats', 'visualizationContent', 'progressFill',
            'progressPercent', 'progressTime', 'insightsCount', 'qaCount',
            'sentimentScore', 'confidenceScore'
        ];

        elementIds.forEach(id => {
            elements[id] = document.getElementById(id);
        });

        return elements;
    }

    init() {
        // Check auth but don't block initialization
        if (!this.checkAuthentication()) {
            return; // Will redirect to login
        }
        
        this.initializeDragAndDrop();
        this.initializeFileInput();
        this.initializeEventListeners();
        this.checkBackendStatus();
        
        console.log('PDERAX Initialized');
    }

    checkAuthentication() {
        // Check if localStorage is available
        try {
            localStorage.getItem('test');
        } catch (e) {
            console.error('[Auth] localStorage not available:', e);
            this.showError('Storage access required. Please enable cookies or use a web server.');
            return false;
        }
        
        const token = localStorage.getItem('pderax_access_token');
        console.log('[Auth] Token present:', !!token);
        
        if (!token) {
            console.log('[Auth] No token found, redirecting to login');
            const redirect = encodeURIComponent(window.location.href);
            window.location.href = `frontend/login.html?redirect=${redirect}`;
            return false;
        }
        
        // Basic token validation (check if it looks like a JWT)
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('[Auth] Invalid token format, clearing and redirecting');
            localStorage.removeItem('pderax_access_token');
            window.location.href = 'frontend/login.html';
            return false;
        }
        
        // Check token expiration
        try {
            const payload = JSON.parse(atob(parts[1]));
            const exp = payload.exp * 1000;
            if (Date.now() >= exp) {
                console.error('[Auth] Token expired, clearing and redirecting');
                localStorage.removeItem('pderax_access_token');
                localStorage.removeItem('pderax_refresh_token');
                localStorage.removeItem('pderax_user');
                window.location.href = 'frontend/login.html';
                return false;
            }
        } catch (e) {
            console.error('[Auth] Could not parse token:', e);
        }
        
        return true;
    }

    initializeDragAndDrop() {
        const { uploadArea, fileInput } = this.elements;
        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
    }

    initializeFileInput() {
        const { fileInput } = this.elements;
        if (!fileInput) return;

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });
    }

    initializeEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            if (document.body.classList.contains('menu-open')) {
                this.toggleMobileMenu(false);
                return;
            }

            if (this.currentAnalysis) {
                this.resetApp();
            }
        });

        // Mobile menu
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');
        const navLinks = document.querySelectorAll('.nav-link');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }

        if (mobileNavOverlay) {
            mobileNavOverlay.addEventListener('click', () => this.toggleMobileMenu(false));
        }

        if (navLinks.length) {
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768 && document.body.classList.contains('menu-open')) {
                        this.toggleMobileMenu(false);
                    }
                });
            });
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && document.body.classList.contains('menu-open')) {
                this.toggleMobileMenu(false);
            }
        });
    }

    async checkBackendStatus() {
        try {
            if (!window.apiService) {
                console.error('[Backend] API service not available');
                this.updateStatusIndicator(false);
                return;
            }
            
            console.log('[Backend] Checking health at:', window.apiService.baseURL);
            const isHealthy = await window.apiService.healthCheck();
            console.log('[Backend] Health check result:', isHealthy);
            this.updateStatusIndicator(isHealthy);
            
            if (!isHealthy) {
                console.warn('[Backend] Server not responding. Make sure it is running on', window.apiService.baseURL);
            }
        } catch (error) {
            console.error('[Backend] Status check failed:', error);
            this.updateStatusIndicator(false);
        }
    }

    updateStatusIndicator(isHealthy) {
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isHealthy ? 'online' : 'offline'}`;
            statusIndicator.textContent = isHealthy ? 'Backend Connected' : 'Backend Offline';
        }
        
        // Also show a warning toast if backend is offline
        if (!isHealthy && this.elements.uploadArea) {
            console.warn('[Backend] Backend is offline - uploads will fail');
        }
    }

    handleFileSelection(file) {
        if (this.isProcessing) {
            this.showToast('Please wait for current analysis to complete', 'warning');
            return;
        }

        // File validation
        if (!this.validateFile(file)) {
            return;
        }

        this.displayFileInfo(file);
        this.processFile(file);
    }

    validateFile(file) {
        const allowedTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            this.showError(`Unsupported file type: ${fileExtension}. Supported: PDF, DOCX, XLSX, TXT`);
            return false;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            this.showError(`File too large (${this.formatFileSize(file.size)}). Max: 50MB`);
            return false;
        }

        if (file.size === 0) {
            this.showError('File is empty');
            return false;
        }

        return true;
    }

    displayFileInfo(file) {
        const { fileInfo } = this.elements;
        if (!fileInfo) return;

        fileInfo.innerHTML = `
            <div class="file-info-display">
                <div class="file-icon">
                    <i class="fas fa-file-${this.getFileIconType(file.name)}"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${this.escapeHtml(file.name)}</div>
                    <div class="file-meta">
                        <span class="file-size">
                            <i class="fas fa-weight-hanging"></i>
                            ${this.formatFileSize(file.size)}
                        </span>
                        <span class="file-type">
                            <i class="fas fa-tag"></i>
                            ${this.getFileType(file.name)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    async processFile(file) {
        this.isProcessing = true;
        this.showLoading();
        
        try {
            console.log('Processing file:', file.name);
            
            // Start progress simulation with stages
            this.startProgressWithStages();
            
            // Make API call with timeout
            const data = await this.makeApiCall(file);
            
            // Complete the progress
            this.completeProgress();
            this.handleApiResponse(data);
            
        } catch (error) {
            this.stopProgressSimulation();
            this.handleProcessingError(error);
        } finally {
            this.isProcessing = false;
        }
    }

    startProgressWithStages() {
        this.currentStage = 0;
        let progress = 0;
        
        // Define stages with their progress ranges
        const stages = [
            { name: 'Text Extraction', start: 0, end: 25 },
            { name: 'AI Analysis', start: 25, end: 60 },
            { name: 'Insight Generation', start: 60, end: 85 },
            { name: 'Report Compilation', start: 85, end: 95 }
        ];
        
        this.stopProgressSimulation(); // Clear any existing interval
        
        // Initialize stage indicators
        this.initializeStageIndicators();
        
        this.progressInterval = setInterval(() => {
            if (!this.isProcessing) {
                this.stopProgressSimulation();
                return;
            }
            
            const currentStage = stages[this.currentStage];
            
            // Smooth progress within current stage
            progress += (currentStage.end - progress) * 0.08;
            
            if (progress >= currentStage.end - 1 && this.currentStage < stages.length - 1) {
                // Move to next stage
                this.currentStage++;
                this.updateStageIndicator(this.currentStage);
            }
            
            if (progress >= 95) {
                progress = 95;
            }
            
            this.updateProgress(progress);
            this.updateStageProgress(progress, stages);
            
        }, 100);
    }

    initializeStageIndicators() {
        // Reset all stage indicators
        const stageInfos = document.querySelectorAll('.stage-info');
        const milestones = document.querySelectorAll('.milestone');
        
        stageInfos.forEach(stage => stage.classList.remove('active'));
        milestones.forEach(milestone => milestone.classList.remove('active'));
        
        // Activate first stage
        if (stageInfos[0]) stageInfos[0].classList.add('active');
        if (milestones[0]) milestones[0].classList.add('active');
        
        // Reset stage progress bars
        const stageProgressBars = document.querySelectorAll('.stage-progress');
        stageProgressBars.forEach(bar => bar.style.width = '0%');
    }

    updateStageIndicator(stageIndex) {
        const stageInfos = document.querySelectorAll('.stage-info');
        const milestones = document.querySelectorAll('.milestone');
        
        // Activate current stage
        if (stageInfos[stageIndex]) stageInfos[stageIndex].classList.add('active');
        if (milestones[stageIndex]) milestones[stageIndex].classList.add('active');
    }

    updateStageProgress(progress, stages) {
        const currentStage = stages[this.currentStage];
        const stageProgress = ((progress - currentStage.start) / (currentStage.end - currentStage.start)) * 100;
        
        const stageProgressBars = document.querySelectorAll('.stage-progress');
        if (stageProgressBars[this.currentStage]) {
            stageProgressBars[this.currentStage].style.width = `${Math.min(100, stageProgress)}%`;
        }
        
        // Update completed stages to 100%
        for (let i = 0; i < this.currentStage; i++) {
            if (stageProgressBars[i]) {
                stageProgressBars[i].style.width = '100%';
            }
        }
    }

    completeProgress() {
        this.stopProgressSimulation();
        this.updateProgress(100);
        
        // Complete all stages
        const stageProgressBars = document.querySelectorAll('.stage-progress');
        stageProgressBars.forEach(bar => bar.style.width = '100%');
        
        const stageInfos = document.querySelectorAll('.stage-info');
        const milestones = document.querySelectorAll('.milestone');
        
        stageInfos.forEach(stage => stage.classList.add('active'));
        milestones.forEach(milestone => milestone.classList.add('active'));
    }

    stopProgressSimulation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    async makeApiCall(file) {
        if (!window.apiService) {
            throw new Error('API service not available');
        }

        // Add timeout to API call
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 90000); // 90 second timeout
        });

        const apiPromise = window.apiService.uploadAndAnalyze(file);
        
        return Promise.race([apiPromise, timeoutPromise]);
    }

    handleApiResponse(data) {
        console.log('API Response:', data);
        
        if (!data || data.status !== 'success') {
            throw new Error(data?.error || 'Analysis failed');
        }

        if (!data.analysis) {
            throw new Error('No analysis data received');
        }

        // Validate we have some content
        const { analysis } = data;
        const hasContent = analysis.summary || 
                          (analysis.insights && analysis.insights.length > 0) || 
                          (analysis.questions_answers && analysis.questions_answers.length > 0);
        
        if (!hasContent) {
            throw new Error('Document processed but no analysis content generated');
        }

        this.currentAnalysis = data;
        this.displayResults(data);
    }

    handleProcessingError(error) {
        console.error('Processing error:', error);
        
        let userMessage = 'Analysis failed. Please try again.';
        
        if (error.message.includes('timeout')) {
            userMessage = 'Request timeout. Please try again with a smaller file.';
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Cannot connect')) {
            userMessage = 'Network error. Please check your connection and ensure the backend is running.';
        } else if (error.message.includes('No analysis data')) {
            userMessage = 'Server returned no analysis data. Please try again.';
        } else if (error.message.includes('Session expired') || error.message.includes('log in')) {
            userMessage = 'Session expired. Redirecting to login...';
            setTimeout(() => {
                window.location.href = 'frontend/login.html';
            }, 2000);
        } else if (error.message.includes('Access denied') || error.message.includes('verify')) {
            userMessage = error.message;
        } else if (error.message) {
            userMessage = error.message;
        }
        
        this.showError(userMessage);
    }

    updateProgress(progress) {
        const { progressFill, progressPercent, progressTime } = this.elements;
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
        
        // Update estimated time
        if (progressTime) {
            const remaining = Math.max(0, (100 - progress) / 10);
            progressTime.textContent = `Estimated: ${Math.ceil(remaining)}s`;
        }
    }

    displayResults(data) {
        this.showResults();
        
        try {
            this.displayOverview(data);
            this.displaySummary(data.analysis);
            this.displayInsights(data.analysis);
            this.displayQnA(data.analysis);
            this.displayDownloadButtons(data.export_files);
        } catch (error) {
            console.error('Error displaying results:', error);
            this.showError('Error displaying analysis results');
        }
    }

    displayOverview(data) {
        const { overviewStats } = this.elements;
        if (!overviewStats) return;

        const analysis = data.analysis || {};
        const wordCount = analysis.summary ? this.countWords(analysis.summary) : 0;
        const insightsCount = analysis.insights ? analysis.insights.length : 0;
        const qaCount = analysis.questions_answers ? analysis.questions_answers.length : 0;
        
        overviewStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${this.escapeHtml(data.filename || 'Unknown')}</div>
                    <div class="stat-label">Document</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-font"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${wordCount}</div>
                    <div class="stat-label">Words</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${insightsCount}</div>
                    <div class="stat-label">Insights</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-question-circle"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-value">${qaCount}</div>
                    <div class="stat-label">Q&A</div>
                </div>
            </div>
        `;
    }

    displaySummary(analysis) {
        const { summaryContent } = this.elements;
        if (!summaryContent) return;

        if (analysis?.summary?.trim()) {
            summaryContent.innerHTML = `
                <div class="summary-content">
                    <div class="summary-text">${this.formatText(analysis.summary)}</div>
                </div>
            `;
        } else {
            summaryContent.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-file-alt"></i>
                    <p>No summary available</p>
                </div>
            `;
        }
    }

    displayInsights(analysis) {
        const { insightsContent, insightsCount } = this.elements;
        if (!insightsContent) return;

        const insights = analysis?.insights || [];
        
        if (insightsCount) {
            insightsCount.textContent = insights.length;
        }

        if (insights.length > 0) {
            insightsContent.innerHTML = insights
                .map((insight, index) => `
                    <div class="insight-item">
                        <div class="insight-marker">${index + 1}</div>
                        <div class="insight-text">${this.formatText(insight)}</div>
                    </div>
                `)
                .join('');
        } else {
            insightsContent.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-lightbulb"></i>
                    <p>No insights generated</p>
                </div>
            `;
        }
    }

    displayQnA(analysis) {
        const { qaContent, qaCount } = this.elements;
        if (!qaContent) return;

        const qaPairs = analysis?.questions_answers || [];
        
        if (qaCount) {
            qaCount.textContent = qaPairs.length;
        }

        if (qaPairs.length > 0) {
            qaContent.innerHTML = qaPairs
                .map((qa, index) => `
                    <div class="qa-item">
                        <div class="qa-question">
                            <strong>Q${index + 1}:</strong> ${this.formatText(qa.question)}
                        </div>
                        <div class="qa-answer">
                            <strong>A:</strong> ${this.formatText(qa.answer)}
                        </div>
                    </div>
                `)
                .join('');
        } else {
            qaContent.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-question-circle"></i>
                    <p>No Q&A generated</p>
                </div>
            `;
        }
    }

    displayDownloadButtons(exportFiles) {
        const { downloadButtons } = this.elements;
        if (!downloadButtons) return;

        if (exportFiles && typeof exportFiles === 'object') {
            downloadButtons.innerHTML = `
                <div class="download-options">
                    <button class="action-btn primary" onclick="app.downloadFile('txt')">
                        <i class="fas fa-file-alt"></i>
                        TXT
                    </button>
                    <button class="action-btn primary" onclick="app.downloadFile('docx')">
                        <i class="fas fa-file-word"></i>
                        DOCX
                    </button>
                    <button class="action-btn primary" onclick="app.downloadFile('pdf')">
                        <i class="fas fa-file-pdf"></i>
                        PDF
                    </button>
                </div>
            `;
        } else {
            downloadButtons.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-download"></i>
                    <p>Export unavailable</p>
                </div>
            `;
        }
    }

    async downloadFile(format) {
        if (!this.currentAnalysis?.export_files?.[format]) {
            this.showError('Download not available');
            return;
        }

        try {
            this.showToast('Preparing download...', 'info');
            
            const filename = this.currentAnalysis.export_files[format];
            const blob = await window.apiService.downloadFile(filename);
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis_${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.showToast('Download completed!', 'success');
        } catch (error) {
            console.error('Download error:', error);
            this.showError('Download failed');
        }
    }

    // UI State Management
    showLoading() {
        this.hideAllSections();
        const { loadingSection } = this.elements;
        if (loadingSection) loadingSection.style.display = 'block';
        this.updateProgress(0);
    }

    showResults() {
        this.hideAllSections();
        const { resultsSection } = this.elements;
        if (resultsSection) resultsSection.style.display = 'block';
    }

    showError(message) {
        this.hideAllSections();
        const { errorSection, errorMessage } = this.elements;
        if (errorSection) errorSection.style.display = 'block';
        if (errorMessage) errorMessage.textContent = message;
    }

    showUpload() {
        this.hideAllSections();
        const { uploadSection } = this.elements;
        if (uploadSection) uploadSection.style.display = 'block';
    }

    hideAllSections() {
        const sections = ['uploadSection', 'loadingSection', 'resultsSection', 'errorSection'];
        sections.forEach(section => {
            const element = this.elements[section];
            if (element) element.style.display = 'none';
        });
    }

    goBackToUpload() {
        this.resetApp();
        const uploadSection = document.getElementById('uploadSection');
        if (uploadSection) {
            uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    copyToClipboard(section) {
        let textToCopy = '';
        
        if (section === 'summary' && this.currentAnalysis?.analysis?.summary) {
            textToCopy = this.currentAnalysis.analysis.summary;
        }
        
        if (!textToCopy) {
            this.showToast('No content to copy', 'warning');
            return;
        }
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                this.showToast('Copied to clipboard!', 'success');
            })
            .catch(() => {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = textToCopy;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    this.showToast('Copied to clipboard!', 'success');
                } catch (err) {
                    this.showToast('Failed to copy', 'error');
                }
                document.body.removeChild(textarea);
            });
    }

    resetApp() {
        this.currentAnalysis = null;
        this.isProcessing = false;
        this.currentFlashcardIndex = 0;
        this.flashcards = [];
        this.stopProgressSimulation();
        
        const { fileInput, fileInfo } = this.elements;
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.innerHTML = '';
        
        this.updateProgress(0);
        this.showUpload();
        this.showToast('Ready for analysis', 'info');
    }

    // Flashcard Methods
    showFlashcardControls() {
        const controls = document.getElementById('flashcardControls');
        const placeholder = document.getElementById('flashcardPlaceholder');
        
        if (controls) controls.style.display = 'flex';
        if (placeholder) placeholder.style.display = 'none';
    }

    async generateFlashcards() {
        if (!this.currentAnalysis?.analysis?.summary) {
            this.showToast('No document content available for flashcards', 'warning');
            return;
        }

        const difficultySelect = document.getElementById('flashcardDifficulty');
        const countSelect = document.getElementById('flashcardCountSelect');
        
        const difficulty = difficultySelect?.value || 'medium';
        const count = parseInt(countSelect?.value || '10');

        // Combine available text for flashcard generation
        let sourceText = this.currentAnalysis.analysis.summary || '';
        
        if (this.currentAnalysis.analysis.insights) {
            sourceText += '\n\n' + this.currentAnalysis.analysis.insights.join('\n');
        }
        
        if (this.currentAnalysis.analysis.questions_answers) {
            sourceText += '\n\n' + this.currentAnalysis.analysis.questions_answers
                .map(qa => `Q: ${qa.question}\nA: ${qa.answer}`)
                .join('\n\n');
        }

        try {
            this.showToast('Generating flashcards...', 'info');
            
            const controls = document.getElementById('flashcardControls');
            const generateBtn = controls?.querySelector('.action-btn');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            }

            const response = await window.apiService.generateFlashcards(sourceText, count, difficulty);
            
            if (response.flashcards && response.flashcards.length > 0) {
                this.flashcards = response.flashcards;
                this.currentFlashcardIndex = 0;
                this.displayFlashcards();
                this.showToast(`Generated ${response.flashcards.length} flashcards!`, 'success');
            } else {
                this.showToast('Could not generate flashcards. Try again.', 'error');
            }
        } catch (error) {
            console.error('Flashcard generation error:', error);
            this.showToast('Failed to generate flashcards', 'error');
        } finally {
            const controls = document.getElementById('flashcardControls');
            const generateBtn = controls?.querySelector('.action-btn');
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Flashcards';
            }
        }
    }

    displayFlashcards() {
        const deck = document.getElementById('flashcardDeck');
        const navigation = document.getElementById('flashcardNavigation');
        const placeholder = document.getElementById('flashcardPlaceholder');
        const countBadge = document.getElementById('flashcardCountBadge');
        const totalCards = document.getElementById('totalCards');
        
        if (placeholder) placeholder.style.display = 'none';
        if (navigation) navigation.style.display = 'flex';
        if (countBadge) countBadge.textContent = this.flashcards.length;
        if (totalCards) totalCards.textContent = this.flashcards.length;
        
        if (!deck) return;
        
        deck.innerHTML = this.flashcards.map((card, index) => `
            <div class="flashcard ${index === 0 ? 'active' : ''}" data-index="${index}">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <div class="flashcard-category">${this.escapeHtml(card.category || 'General')}</div>
                        <div class="flashcard-text">${this.escapeHtml(card.front)}</div>
                        <div class="flashcard-hint">Click to flip</div>
                    </div>
                    <div class="flashcard-back">
                        <div class="flashcard-category">Answer</div>
                        <div class="flashcard-text">${this.escapeHtml(card.back)}</div>
                        <div class="flashcard-hint">Click to flip back</div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers for flipping
        deck.querySelectorAll('.flashcard').forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('flipped');
            });
        });
        
        this.updateFlashcardNavigation();
    }

    updateFlashcardNavigation() {
        const currentIndex = document.getElementById('currentCardIndex');
        if (currentIndex) {
            currentIndex.textContent = this.currentFlashcardIndex + 1;
        }
        
        // Update active card visibility
        const cards = document.querySelectorAll('.flashcard');
        cards.forEach((card, index) => {
            card.classList.toggle('active', index === this.currentFlashcardIndex);
            card.classList.remove('flipped'); // Reset flip state when navigating
        });
    }

    prevFlashcard() {
        if (this.currentFlashcardIndex > 0) {
            this.currentFlashcardIndex--;
            this.updateFlashcardNavigation();
        }
    }

    nextFlashcard() {
        if (this.currentFlashcardIndex < this.flashcards.length - 1) {
            this.currentFlashcardIndex++;
            this.updateFlashcardNavigation();
        }
    }

    // Utility Methods
    formatText(text) {
        if (!text) return '';
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIconType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            pdf: 'pdf', docx: 'word', doc: 'word', 
            xlsx: 'excel', xls: 'excel', txt: 'alt'
        };
        return icons[ext] || 'alt';
    }

    getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const types = {
            pdf: 'PDF', docx: 'Word', doc: 'Word',
            xlsx: 'Excel', xls: 'Excel', txt: 'Text'
        };
        return types[ext] || 'Document';
    }

    countWords(text) {
        return text ? text.split(/\s+/).filter(word => word.length > 0).length : 0;
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    toggleMobileMenu(forceState = null) {
        const navLinks = document.querySelector('.nav-links');
        const navActions = document.querySelector('.nav-actions');
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const mobileNavOverlay = document.querySelector('.mobile-nav-overlay');

        const isOpen = document.body.classList.contains('menu-open');
        const shouldOpen = forceState !== null ? forceState : !isOpen;

        // Toggle body class
        document.body.classList.toggle('menu-open', shouldOpen);

        // Toggle active classes for CSS animations
        if (navLinks) navLinks.classList.toggle('active', shouldOpen);
        if (navActions) navActions.classList.toggle('active', shouldOpen);
        if (mobileNavOverlay) mobileNavOverlay.classList.toggle('active', shouldOpen);

        // Update button state
        if (mobileMenuBtn) {
            mobileMenuBtn.classList.toggle('active', shouldOpen);
            mobileMenuBtn.setAttribute('aria-expanded', shouldOpen.toString());
        }
    }
}

// Global functions
window.resetApp = () => {
    if (window.app) {
        window.app.resetApp();
    }
};

// Navigate to flashcards page with current document context
window.goToFlashcardsWithContext = () => {
    if (window.app && window.app.currentAnalysis) {
        const context = {
            filename: window.app.currentAnalysis.filename || 'document',
            summary: window.app.currentAnalysis.summary || '',
            text: window.app.currentAnalysis.text || window.app.currentAnalysis.summary || '',
            insights: window.app.currentAnalysis.key_insights || []
        };
        
        // Store in sessionStorage for the flashcards page
        sessionStorage.setItem('flashcard_document', JSON.stringify(context));
        
        // Navigate to study tools page
        window.location.href = 'frontend/study-tools.html';
    } else {
        // No document loaded, just go to study tools page
        window.location.href = 'frontend/study-tools.html';
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PDERAXApp();
});
