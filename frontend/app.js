// // PDERAX - AI Document Analysis Platform
// // Clean, Stable & Optimized Version

// class PDERAXApp {
//     constructor() {
//         this.currentAnalysis = null;
//         this.isProcessing = false;
//         this.analysisChart = null;
//         this.progressInterval = null;

//         // DOM Elements with safe fallbacks
//         this.elements = this.initializeElements();
//         this.init();
//     }

//     initializeElements() {
//         const elements = {};
//         const elementIds = [
//             'uploadSection', 'loadingSection', 'resultsSection', 'errorSection',
//             'fileInput', 'uploadArea', 'fileInfo', 'downloadButtons',
//             'summaryContent', 'insightsContent', 'qaContent', 'errorMessage',
//             'overviewStats', 'visualizationContent', 'progressFill',
//             'progressPercent', 'progressTime', 'insightsCount', 'qaCount',
//             'sentimentScore', 'confidenceScore'
//         ];

//         elementIds.forEach(id => {
//             elements[id] = document.getElementById(id);
//         });

//         return elements;
//     }

//     init() {
//         this.initializeDragAndDrop();
//         this.initializeFileInput();
//         this.initializeEventListeners();
//         this.checkBackendStatus();

//         console.log('PDERAX Initialized');
//     }

//     initializeDragAndDrop() {
//         const { uploadArea, fileInput } = this.elements;
//         if (!uploadArea || !fileInput) return;

//         uploadArea.addEventListener('dragover', (e) => {
//             e.preventDefault();
//             uploadArea.classList.add('dragover');
//         });

//         uploadArea.addEventListener('dragleave', () => {
//             uploadArea.classList.remove('dragover');
//         });

//         uploadArea.addEventListener('drop', (e) => {
//             e.preventDefault();
//             uploadArea.classList.remove('dragover');
//             const files = e.dataTransfer.files;
//             if (files.length > 0) {
//                 this.handleFileSelection(files[0]);
//             }
//         });

//         uploadArea.addEventListener('click', () => {
//             fileInput.click();
//         });
//     }

//     initializeFileInput() {
//         const { fileInput } = this.elements;
//         if (!fileInput) return;

//         fileInput.addEventListener('change', (e) => {
//             if (e.target.files.length > 0) {
//                 this.handleFileSelection(e.target.files[0]);
//             }
//         });
//     }

//     initializeEventListeners() {
//         // Keyboard shortcuts
//         document.addEventListener('keydown', (e) => {
//             if (e.key === 'Escape' && this.currentAnalysis) {
//                 this.resetApp();
//             }
//         });

//         // Mobile menu
//         const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
//         if (mobileMenuBtn) {
//             mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
//         }
//     }

//     async checkBackendStatus() {
//         try {
//             if (!window.apiService) {
//                 console.error('API service not available');
//                 return;
//             }
//             const isHealthy = await window.apiService.healthCheck();
//             this.updateStatusIndicator(isHealthy);
//         } catch (error) {
//             console.error('Backend status check failed:', error);
//             this.updateStatusIndicator(false);
//         }
//     }

//     updateStatusIndicator(isHealthy) {
//         const statusIndicator = document.querySelector('.status-indicator');
//         if (statusIndicator) {
//             statusIndicator.className = `status-indicator ${isHealthy ? 'online' : 'offline'}`;
//             statusIndicator.textContent = isHealthy ? 'Backend Connected' : 'Backend Offline';
//         }
//     }

//     handleFileSelection(file) {
//         if (this.isProcessing) {
//             this.showToast('Please wait for current analysis to complete', 'warning');
//             return;
//         }

//         // File validation
//         if (!this.validateFile(file)) {
//             return;
//         }

//         this.displayFileInfo(file);
//         this.processFile(file);
//     }

//     validateFile(file) {
//         const allowedTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
//         const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

//         if (!allowedTypes.includes(fileExtension)) {
//             this.showError(`Unsupported file type: ${fileExtension}. Supported: PDF, DOCX, XLSX, TXT`);
//             return false;
//         }

//         const maxSize = 50 * 1024 * 1024; // 50MB
//         if (file.size > maxSize) {
//             this.showError(`File too large (${this.formatFileSize(file.size)}). Max: 50MB`);
//             return false;
//         }

//         if (file.size === 0) {
//             this.showError('File is empty');
//             return false;
//         }

//         return true;
//     }

//     displayFileInfo(file) {
//         const { fileInfo } = this.elements;
//         if (!fileInfo) return;

//         fileInfo.innerHTML = `
//             <div class="file-info-display">
//                 <div class="file-icon">
//                     <i class="fas fa-file-${this.getFileIconType(file.name)}"></i>
//                 </div>
//                 <div class="file-details">
//                     <div class="file-name">${this.escapeHtml(file.name)}</div>
//                     <div class="file-meta">
//                         <span class="file-size">
//                             <i class="fas fa-weight-hanging"></i>
//                             ${this.formatFileSize(file.size)}
//                         </span>
//                         <span class="file-type">
//                             <i class="fas fa-tag"></i>
//                             ${this.getFileType(file.name)}
//                         </span>
//                     </div>
//                 </div>
//             </div>
//         `;
//     }

//     async processFile(file) {
//         this.isProcessing = true;
//         this.showLoading();

//         try {
//             console.log('Processing file:', file.name);

//             // Start progress simulation
//             this.startProgressSimulation();

//             // Make API call with timeout
//             const data = await this.makeApiCall(file);

//             // Stop progress and handle response
//             this.stopProgressSimulation();
//             this.handleApiResponse(data);

//         } catch (error) {
//             this.stopProgressSimulation();
//             this.handleProcessingError(error);
//         } finally {
//             this.isProcessing = false;
//         }
//     }

//     startProgressSimulation() {
//         let progress = 0;
//         const targetProgress = 90; // Stop at 90% until API completes
//         const duration = 8000; // 8 seconds total

//         this.stopProgressSimulation(); // Clear any existing interval

//         this.progressInterval = setInterval(() => {
//             if (!this.isProcessing) {
//                 this.stopProgressSimulation();
//                 return;
//             }

//             // Smooth progress simulation
//             progress += (targetProgress - progress) * 0.1;

//             if (progress >= targetProgress - 1) {
//                 progress = targetProgress;
//             }

//             this.updateProgress(progress);

//         }, 100);
//     }

//     stopProgressSimulation() {
//         if (this.progressInterval) {
//             clearInterval(this.progressInterval);
//             this.progressInterval = null;
//         }
//     }

//     async makeApiCall(file) {
//         if (!window.apiService) {
//             throw new Error('API service not available');
//         }

//         // Add timeout to API call
//         const timeoutPromise = new Promise((_, reject) => {
//             setTimeout(() => reject(new Error('Request timeout')), 40000); // 40 second timeout
//         });

//         const apiPromise = window.apiService.uploadAndAnalyze(file);

//         return Promise.race([apiPromise, timeoutPromise]);
//     }

//     handleApiResponse(data) {
//         console.log('API Response:', data);

//         if (!data || data.status !== 'success') {
//             throw new Error(data?.error || 'Analysis failed');
//         }

//         if (!data.analysis) {
//             throw new Error('No analysis data received');
//         }

//         // Validate we have some content
//         const { analysis } = data;
//         const hasContent = analysis.summary ||
//             (analysis.insights && analysis.insights.length > 0) ||
//             (analysis.questions_answers && analysis.questions_answers.length > 0);

//         if (!hasContent) {
//             throw new Error('Document processed but no analysis content generated');
//         }

//         this.currentAnalysis = data;
//         this.updateProgress(100);
//         this.displayResults(data);
//     }

//     handleProcessingError(error) {
//         console.error('Processing error:', error);

//         let userMessage = 'Analysis failed. Please try again.';

//         if (error.message.includes('timeout')) {
//             userMessage = 'Request timeout. Please try again with a smaller file.';
//         } else if (error.message.includes('network') || error.message.includes('fetch')) {
//             userMessage = 'Network error. Please check your connection.';
//         } else if (error.message.includes('No analysis data')) {
//             userMessage = 'Server returned no analysis data. Please try again.';
//         }

//         this.showError(userMessage);
//     }

//     updateProgress(progress) {
//         const { progressFill, progressPercent } = this.elements;
//         if (progressFill) progressFill.style.width = `${progress}%`;
//         if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
//     }

//     displayResults(data) {
//         this.showResults();

//         try {
//             this.displayOverview(data);
//             this.displaySummary(data.analysis);
//             this.displayInsights(data.analysis);
//             this.displayQnA(data.analysis);
//             this.displayDownloadButtons(data.export_files);
//         } catch (error) {
//             console.error('Error displaying results:', error);
//             this.showError('Error displaying analysis results');
//         }
//     }

//     displayOverview(data) {
//         const { overviewStats } = this.elements;
//         if (!overviewStats) return;

//         const analysis = data.analysis || {};
//         const wordCount = analysis.summary ? this.countWords(analysis.summary) : 0;
//         const insightsCount = analysis.insights ? analysis.insights.length : 0;
//         const qaCount = analysis.questions_answers ? analysis.questions_answers.length : 0;

//         overviewStats.innerHTML = `
//             <div class="stat-card">
//                 <div class="stat-icon">
//                     <i class="fas fa-file-alt"></i>
//                 </div>
//                 <div class="stat-info">
//                     <div class="stat-value">${this.escapeHtml(data.filename || 'Unknown')}</div>
//                     <div class="stat-label">Document</div>
//                 </div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-icon">
//                     <i class="fas fa-font"></i>
//                 </div>
//                 <div class="stat-info">
//                     <div class="stat-value">${wordCount}</div>
//                     <div class="stat-label">Words</div>
//                 </div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-icon">
//                     <i class="fas fa-lightbulb"></i>
//                 </div>
//                 <div class="stat-info">
//                     <div class="stat-value">${insightsCount}</div>
//                     <div class="stat-label">Insights</div>
//                 </div>
//             </div>
//             <div class="stat-card">
//                 <div class="stat-icon">
//                     <i class="fas fa-question-circle"></i>
//                 </div>
//                 <div class="stat-info">
//                     <div class="stat-value">${qaCount}</div>
//                     <div class="stat-label">Q&A</div>
//                 </div>
//             </div>
//         `;
//     }

//     displaySummary(analysis) {
//         const { summaryContent } = this.elements;
//         if (!summaryContent) return;

//         if (analysis?.summary?.trim()) {
//             summaryContent.innerHTML = `
//                 <div class="summary-content">
//                     <div class="summary-text">${this.formatText(analysis.summary)}</div>
//                 </div>
//             `;
//         } else {
//             summaryContent.innerHTML = `
//                 <div class="no-data">
//                     <i class="fas fa-file-alt"></i>
//                     <p>No summary available</p>
//                 </div>
//             `;
//         }
//     }

//     displayInsights(analysis) {
//         const { insightsContent, insightsCount } = this.elements;
//         if (!insightsContent) return;

//         const insights = analysis?.insights || [];

//         if (insightsCount) {
//             insightsCount.textContent = insights.length;
//         }

//         if (insights.length > 0) {
//             insightsContent.innerHTML = insights
//                 .map((insight, index) => `
//                     <div class="insight-item">
//                         <div class="insight-marker">${index + 1}</div>
//                         <div class="insight-text">${this.formatText(insight)}</div>
//                     </div>
//                 `)
//                 .join('');
//         } else {
//             insightsContent.innerHTML = `
//                 <div class="no-data">
//                     <i class="fas fa-lightbulb"></i>
//                     <p>No insights generated</p>
//                 </div>
//             `;
//         }
//     }

//     displayQnA(analysis) {
//         const { qaContent, qaCount } = this.elements;
//         if (!qaContent) return;

//         const qaPairs = analysis?.questions_answers || [];

//         if (qaCount) {
//             qaCount.textContent = qaPairs.length;
//         }

//         if (qaPairs.length > 0) {
//             qaContent.innerHTML = qaPairs
//                 .map((qa, index) => `
//                     <div class="qa-item">
//                         <div class="qa-question">
//                             <strong>Q${index + 1}:</strong> ${this.formatText(qa.question)}
//                         </div>
//                         <div class="qa-answer">
//                             <strong>A:</strong> ${this.formatText(qa.answer)}
//                         </div>
//                     </div>
//                 `)
//                 .join('');
//         } else {
//             qaContent.innerHTML = `
//                 <div class="no-data">
//                     <i class="fas fa-question-circle"></i>
//                     <p>No Q&A generated</p>
//                 </div>
//             `;
//         }
//     }

//     displayDownloadButtons(exportFiles) {
//         const { downloadButtons } = this.elements;
//         if (!downloadButtons) return;

//         if (exportFiles && typeof exportFiles === 'object') {
//             downloadButtons.innerHTML = `
//                 <div class="download-options">
//                     <button class="action-btn primary" onclick="app.downloadFile('txt')">
//                         <i class="fas fa-file-alt"></i>
//                         TXT
//                     </button>
//                     <button class="action-btn primary" onclick="app.downloadFile('docx')">
//                         <i class="fas fa-file-word"></i>
//                         DOCX
//                     </button>
//                     <button class="action-btn primary" onclick="app.downloadFile('pdf')">
//                         <i class="fas fa-file-pdf"></i>
//                         PDF
//                     </button>
//                 </div>
//             `;
//         } else {
//             downloadButtons.innerHTML = `
//                 <div class="no-data">
//                     <i class="fas fa-download"></i>
//                     <p>Export unavailable</p>
//                 </div>
//             `;
//         }
//     }

//     async downloadFile(format) {
//         if (!this.currentAnalysis?.export_files?.[format]) {
//             this.showError('Download not available');
//             return;
//         }

//         try {
//             this.showToast('Preparing download...', 'info');

//             const filename = this.currentAnalysis.export_files[format];
//             const blob = await window.apiService.downloadFile(filename);

//             const url = window.URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = `analysis_${Date.now()}.${format}`;
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//             window.URL.revokeObjectURL(url);

//             this.showToast('Download completed!', 'success');
//         } catch (error) {
//             console.error('Download error:', error);
//             this.showError('Download failed');
//         }
//     }

//     // UI State Management
//     showLoading() {
//         this.hideAllSections();
//         const { loadingSection } = this.elements;
//         if (loadingSection) loadingSection.style.display = 'block';
//         this.updateProgress(0);
//     }

//     showResults() {
//         this.hideAllSections();
//         const { resultsSection } = this.elements;
//         if (resultsSection) resultsSection.style.display = 'block';
//     }

//     showError(message) {
//         this.hideAllSections();
//         const { errorSection, errorMessage } = this.elements;
//         if (errorSection) errorSection.style.display = 'block';
//         if (errorMessage) errorMessage.textContent = message;
//     }

//     showUpload() {
//         this.hideAllSections();
//         const { uploadSection } = this.elements;
//         if (uploadSection) uploadSection.style.display = 'block';
//     }

//     hideAllSections() {
//         const sections = ['uploadSection', 'loadingSection', 'resultsSection', 'errorSection'];
//         sections.forEach(section => {
//             const element = this.elements[section];
//             if (element) element.style.display = 'none';
//         });
//     }

//     resetApp() {
//         this.currentAnalysis = null;
//         this.isProcessing = false;
//         this.stopProgressSimulation();

//         const { fileInput, fileInfo } = this.elements;
//         if (fileInput) fileInput.value = '';
//         if (fileInfo) fileInfo.innerHTML = '';

//         this.updateProgress(0);
//         this.showUpload();
//         this.showToast('Ready for analysis', 'info');
//     }

//     // Utility Methods
//     formatText(text) {
//         if (!text) return '';
//         return this.escapeHtml(text).replace(/\n/g, '<br>');
//     }

//     escapeHtml(text) {
//         const div = document.createElement('div');
//         div.textContent = text;
//         return div.innerHTML;
//     }

//     formatFileSize(bytes) {
//         if (bytes === 0) return '0 Bytes';
//         const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//         const i = Math.floor(Math.log(bytes) / Math.log(1024));
//         return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
//     }

//     getFileIconType(filename) {
//         const ext = filename.split('.').pop().toLowerCase();
//         const icons = {
//             pdf: 'pdf', docx: 'word', doc: 'word',
//             xlsx: 'excel', xls: 'excel', txt: 'alt'
//         };
//         return icons[ext] || 'alt';
//     }

//     getFileType(filename) {
//         const ext = filename.split('.').pop().toLowerCase();
//         const types = {
//             pdf: 'PDF', docx: 'Word', doc: 'Word',
//             xlsx: 'Excel', xls: 'Excel', txt: 'Text'
//         };
//         return types[ext] || 'Document';
//     }

//     countWords(text) {
//         return text ? text.split(/\s+/).filter(word => word.length > 0).length : 0;
//     }

//     showToast(message, type = 'info') {
//         // Simple toast implementation
//         console.log(`${type.toUpperCase()}: ${message}`);
//     }

//     toggleMobileMenu() {
//         const navLinks = document.querySelector('.nav-links');
//         const navActions = document.querySelector('.nav-actions');

//         [navLinks, navActions].forEach(el => {
//             if (el) {
//                 el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
//             }
//         });
//     }
// }

// // Global functions
// window.resetApp = () => {
//     if (window.app) {
//         window.app.resetApp();
//     }
// };

// // Initialize app
// document.addEventListener('DOMContentLoaded', () => {
//     window.app = new PDERAXApp();
// }); 2




// PDERAX - AI Document Analysis Platform
// Clean, Stable & Optimized Version with Progress Visualization

class PDERAXApp {
    constructor() {
        this.currentAnalysis = null;
        this.isProcessing = false;
        this.analysisChart = null;
        this.progressInterval = null;
        this.currentStage = 0;
        
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
        this.initializeDragAndDrop();
        this.initializeFileInput();
        this.initializeEventListeners();
        this.checkBackendStatus();
        
        console.log('PDERAX Initialized');
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
            if (e.key === 'Escape' && this.currentAnalysis) {
                this.resetApp();
            }
        });

        // Mobile menu
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    async checkBackendStatus() {
        try {
            if (!window.apiService) {
                console.error('API service not available');
                return;
            }
            const isHealthy = await window.apiService.healthCheck();
            this.updateStatusIndicator(isHealthy);
        } catch (error) {
            console.error('Backend status check failed:', error);
            this.updateStatusIndicator(false);
        }
    }

    updateStatusIndicator(isHealthy) {
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isHealthy ? 'online' : 'offline'}`;
            statusIndicator.textContent = isHealthy ? 'Backend Connected' : 'Backend Offline';
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
            setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
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
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = 'Network error. Please check your connection.';
        } else if (error.message.includes('No analysis data')) {
            userMessage = 'Server returned no analysis data. Please try again.';
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

    resetApp() {
        this.currentAnalysis = null;
        this.isProcessing = false;
        this.stopProgressSimulation();
        
        const { fileInput, fileInfo } = this.elements;
        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.innerHTML = '';
        
        this.updateProgress(0);
        this.showUpload();
        this.showToast('Ready for analysis', 'info');
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
        // Simple toast implementation
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const navActions = document.querySelector('.nav-actions');
        
        [navLinks, navActions].forEach(el => {
            if (el) {
                el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
            }
        });
    }
}

// Global functions
window.resetApp = () => {
    if (window.app) {
        window.app.resetApp();
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PDERAXApp();
});