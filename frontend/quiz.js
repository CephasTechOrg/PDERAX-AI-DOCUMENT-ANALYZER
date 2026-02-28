// Quiz Workspace JavaScript
// Handles document upload, processing, and quiz generation

const QuizAPI = window.apiService || null;

// State management
let quizDocument = null;
let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};  // { questionIndex: 'A' | 'B' | 'C' | 'D' }
let quizSubmitted = false;
let quizResults = null;

// DOM Elements - these are assigned after DOM is ready
let quizUploadSection = null;
let quizProcessingSection = null;
let quizSettingsSection = null;
let quizGeneratingSection = null;
let quizTakingSection = null;
let quizResultsSection = null;
let quizModal = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Assign DOM elements after DOM is ready
    quizUploadSection = document.getElementById('quizUploadSection');
    quizProcessingSection = document.getElementById('quizProcessingSection');
    quizSettingsSection = document.getElementById('quizSettingsSection');
    quizGeneratingSection = document.getElementById('quizGeneratingSection');
    quizTakingSection = document.getElementById('quizTakingSection');
    quizResultsSection = document.getElementById('quizResultsSection');
    quizModal = document.getElementById('quizModal');
    
    initializeQuizDropZone();
    
    console.log('Quiz.js initialized, quizModal:', quizModal ? 'found' : 'not found');
});

// Initialize drag and drop for quiz
function initializeQuizDropZone() {
    const dropZone = document.getElementById('quizDropZone');
    const fileInput = document.getElementById('quizFileInput');
    
    if (!dropZone || !fileInput) {
        console.log('Quiz drop zone elements not found');
        return;
    }
    
    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());
    
    // Drag events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleQuizFileUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleQuizFileUpload(e.target.files[0]);
        }
    });
    
    console.log('Quiz drop zone initialized');
}

// Handle file upload for quiz
async function handleQuizFileUpload(file) {
    // Validate file
    const validTypes = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(ext)) {
        showQuizToast('Please upload a valid document file', 'error');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showQuizToast('File size must be under 50MB', 'error');
        return;
    }
    
    // Show processing
    showQuizSection('processing');
    updateQuizProgress(0, 'Uploading document...');
    
    try {
        // Upload and analyze
        updateQuizProgress(20, 'Analyzing content...');
        
        const result = await QuizAPI.uploadAndAnalyze(file);
        
        updateQuizProgress(60, 'Extracting key concepts...');
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        updateQuizProgress(100, 'Document ready!');
        
        // Store document context
        const analysis = result.analysis || {};
        quizDocument = {
            filename: result.filename || file.name,
            summary: analysis.summary || '',
            insights: analysis.insights || [],
            questions_answers: analysis.questions_answers || []
        };
        
        // Show settings
        await new Promise(resolve => setTimeout(resolve, 500));
        showQuizSettingsSection();
        
    } catch (error) {
        console.error('Upload error:', error);
        showQuizToast('Failed to process document. Please try again.', 'error');
        showQuizSection('upload');
    }
}

// Show quiz settings section
function showQuizSettingsSection() {
    showQuizSection('settings');
    
    if (quizDocument) {
        const docInfo = document.getElementById('quizDocumentInfo');
        if (docInfo) {
            docInfo.textContent = `"${quizDocument.filename}" is ready for quiz generation`;
        }
    }
}

// Generate quiz
async function generateQuiz() {
    const countEl = document.getElementById('quizQuestionCount');
    const difficultyEl = document.getElementById('quizDifficultyLevel');
    
    const count = countEl ? parseInt(countEl.value) : 10;
    const difficulty = difficultyEl ? difficultyEl.value : 'medium';
    
    showQuizSection('generating');
    
    try {
        // Build source text from all available content
        let sourceText = quizDocument.summary || '';
        if (quizDocument.insights && quizDocument.insights.length) {
            sourceText += '\n\n' + quizDocument.insights.join('\n');
        }

        // Call API to generate quiz
        const response = await QuizAPI.generateQuiz(sourceText, count, difficulty);
        
        if (response && response.questions && response.questions.length > 0) {
            quizQuestions = response.questions;
        } else {
            throw new Error('No quiz questions generated');
        }
        
        // Reset quiz state
        currentQuestionIndex = 0;
        userAnswers = {};
        quizSubmitted = false;
        quizResults = null;
        
        // Close modal and show quiz
        closeQuizModal();
        showQuizTaking();
        
    } catch (error) {
        console.error('Generation error:', error);
        showQuizToast('Failed to generate quiz. Please try again.', 'error');
        showQuizSection('settings');
    }
}

// Show quiz taking section (full screen overlay)
function showQuizTaking() {
    if (quizTakingSection) {
        quizTakingSection.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    if (quizResultsSection) {
        quizResultsSection.style.display = 'none';
    }
    
    renderCurrentQuestion();
    updateQuizNavigation();
}

// Render current question
function renderCurrentQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    if (!question) return;
    
    // Update question counter
    const currentNum = document.getElementById('quizCurrentQuestion');
    const totalNum = document.getElementById('quizTotalQuestions');
    if (currentNum) currentNum.textContent = currentQuestionIndex + 1;
    if (totalNum) totalNum.textContent = quizQuestions.length;
    
    // Update progress bar
    const progressFill = document.getElementById('quizProgressFill');
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // Render question text
    const questionText = document.getElementById('questionText');
    if (questionText) {
        questionText.textContent = question.question;
    }
    
    // Render category
    const questionCategory = document.getElementById('questionCategory');
    if (questionCategory) {
        questionCategory.textContent = question.category || 'General';
    }
    
    // Render options
    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) {
        optionsContainer.innerHTML = '';
        
        question.options.forEach(option => {
            const optionEl = document.createElement('button');
            optionEl.className = 'quiz-option';
            optionEl.dataset.label = option.label;
            
            // Check if this option is selected
            if (userAnswers[currentQuestionIndex] === option.label) {
                optionEl.classList.add('selected');
            }
            
            optionEl.innerHTML = `
                <span class="option-label">${option.label}</span>
                <span class="option-text">${option.text}</span>
            `;
            
            optionEl.addEventListener('click', () => selectAnswer(option.label));
            optionsContainer.appendChild(optionEl);
        });
    }
}

// Select an answer
function selectAnswer(label) {
    userAnswers[currentQuestionIndex] = label;
    
    // Update UI
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.label === label) {
            opt.classList.add('selected');
        }
    });
    
    updateQuizNavigation();
}

// Navigate to next question
function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        renderCurrentQuestion();
        updateQuizNavigation();
    }
}

// Navigate to previous question
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderCurrentQuestion();
        updateQuizNavigation();
    }
}

// Update navigation buttons
function updateQuizNavigation() {
    const prevBtn = document.getElementById('quizPrevBtn');
    const nextBtn = document.getElementById('quizNextBtn');
    const submitBtn = document.getElementById('quizSubmitBtn');
    
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
    }
    
    if (nextBtn) {
        nextBtn.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'none' : 'flex';
    }
    
    if (submitBtn) {
        const answeredCount = Object.keys(userAnswers).length;
        submitBtn.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'flex' : 'none';
        submitBtn.disabled = answeredCount < quizQuestions.length;
        
        // Show how many answered
        const unanswered = quizQuestions.length - answeredCount;
        if (unanswered > 0) {
            submitBtn.title = `Answer all questions to submit (${unanswered} remaining)`;
        } else {
            submitBtn.title = 'Submit Quiz';
        }
    }
}

// Submit quiz
function submitQuiz() {
    // Calculate results
    let correctCount = 0;
    const results = [];
    
    quizQuestions.forEach((question, index) => {
        const userAnswer = userAnswers[index] || '';
        const isCorrect = userAnswer === question.correct_answer;
        
        if (isCorrect) correctCount++;
        
        results.push({
            question: question.question,
            options: question.options,
            userAnswer: userAnswer,
            correctAnswer: question.correct_answer,
            isCorrect: isCorrect,
            explanation: question.explanation,
            category: question.category
        });
    });
    
    quizResults = {
        totalQuestions: quizQuestions.length,
        correctCount: correctCount,
        incorrectCount: quizQuestions.length - correctCount,
        scorePercentage: Math.round((correctCount / quizQuestions.length) * 100),
        results: results
    };
    
    quizSubmitted = true;
    showQuizResults();
}

// Show quiz results
function showQuizResults() {
    if (quizTakingSection) {
        quizTakingSection.style.display = 'none';
    }
    if (quizResultsSection) {
        quizResultsSection.style.display = 'block';
    }
    
    // Update score display
    const scoreValue = document.getElementById('scoreValue');
    const scorePercentage = document.getElementById('scorePercentage');
    const correctCountEl = document.getElementById('correctCount');
    const incorrectCountEl = document.getElementById('incorrectCount');
    
    if (scoreValue) {
        scoreValue.textContent = `${quizResults.correctCount} / ${quizResults.totalQuestions}`;
    }
    if (scorePercentage) {
        scorePercentage.textContent = `${quizResults.scorePercentage}%`;
    }
    if (correctCountEl) {
        correctCountEl.textContent = `${quizResults.correctCount} correct`;
    }
    if (incorrectCountEl) {
        incorrectCountEl.textContent = `${quizResults.incorrectCount} incorrect`;
    }
    
    // Update score circle color based on performance
    const scoreCircle = document.getElementById('scoreCircle');
    if (scoreCircle) {
        scoreCircle.classList.remove('excellent', 'good', 'average', 'poor');
        if (quizResults.scorePercentage >= 80) {
            scoreCircle.classList.add('excellent');
        } else if (quizResults.scorePercentage >= 60) {
            scoreCircle.classList.add('good');
        } else if (quizResults.scorePercentage >= 40) {
            scoreCircle.classList.add('average');
        } else {
            scoreCircle.classList.add('poor');
        }
    }
    
    // Render question review list
    const reviewList = document.getElementById('reviewList');
    if (reviewList) {
        reviewList.innerHTML = '';
        
        quizResults.results.forEach((result, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = `review-item ${result.isCorrect ? 'correct' : 'incorrect'}`;
            
            reviewItem.innerHTML = `
                <div class="review-status">
                    <i class="fas ${result.isCorrect ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                </div>
                <div class="review-content">
                    <span class="review-number">Q${index + 1}</span>
                    <span class="review-question">${result.question.substring(0, 60)}${result.question.length > 60 ? '...' : ''}</span>
                </div>
                <button class="review-btn" onclick="showQuestionReview(${index})">
                    <i class="fas fa-eye"></i>
                    Review
                </button>
            `;
            
            reviewList.appendChild(reviewItem);
        });
    }
}

// Show detailed review for a question
function showQuestionReview(index) {
    const result = quizResults.results[index];
    if (!result) return;
    
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    
    // Populate modal content
    const reviewModalTitle = document.getElementById('reviewModalTitle');
    const reviewQuestionText = document.getElementById('reviewQuestionText');
    const reviewOptionsContainer = document.getElementById('reviewOptionsContainer');
    const reviewExplanation = document.getElementById('reviewExplanation');
    
    if (reviewModalTitle) {
        reviewModalTitle.textContent = `Question ${index + 1}`;
    }
    
    if (reviewQuestionText) {
        reviewQuestionText.textContent = result.question;
    }
    
    if (reviewOptionsContainer) {
        reviewOptionsContainer.innerHTML = '';
        
        result.options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'review-option';
            
            // Determine option state
            const isUserAnswer = option.label === result.userAnswer;
            const isCorrectAnswer = option.label === result.correctAnswer;
            
            if (isCorrectAnswer) {
                optionEl.classList.add('correct-answer');
            }
            if (isUserAnswer && !isCorrectAnswer) {
                optionEl.classList.add('wrong-answer');
            }
            
            optionEl.innerHTML = `
                <span class="option-label">${option.label}</span>
                <span class="option-text">${option.text}</span>
                ${isCorrectAnswer ? '<i class="fas fa-check correct-icon"></i>' : ''}
                ${isUserAnswer && !isCorrectAnswer ? '<i class="fas fa-times wrong-icon"></i>' : ''}
            `;
            
            reviewOptionsContainer.appendChild(optionEl);
        });
    }
    
    if (reviewExplanation) {
        reviewExplanation.textContent = result.explanation || 'No explanation provided.';
    }
    
    // Show modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

// Close review modal
function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Start new quiz session
function startNewQuizSession() {
    // Reset state
    quizDocument = null;
    quizQuestions = [];
    currentQuestionIndex = 0;
    userAnswers = {};
    quizSubmitted = false;
    quizResults = null;
    
    // Hide full-screen sections
    if (quizTakingSection) {
        quizTakingSection.style.display = 'none';
    }
    if (quizResultsSection) {
        quizResultsSection.style.display = 'none';
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Open modal with upload section
    openQuizModal();
}

// Alias for HTML onclick handlers
function startNewQuiz() {
    startNewQuizSession();
}

// Confirm exit during quiz
function confirmExitQuiz() {
    if (Object.keys(userAnswers).length > 0 && !quizSubmitted) {
        if (!confirm('Are you sure you want to exit? Your progress will be lost.')) {
            return;
        }
    }
    
    // Hide quiz sections
    if (quizTakingSection) {
        quizTakingSection.style.display = 'none';
    }
    if (quizResultsSection) {
        quizResultsSection.style.display = 'none';
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Reset state
    currentQuestionIndex = 0;
    userAnswers = {};
    quizSubmitted = false;
}

// Retake same quiz
function retakeQuiz() {
    // Reset answers only
    currentQuestionIndex = 0;
    userAnswers = {};
    quizSubmitted = false;
    quizResults = null;
    
    // Show quiz taking
    showQuizTaking();
}

// Section management for quiz modal
function showQuizSection(section) {
    if (quizUploadSection) quizUploadSection.style.display = section === 'upload' ? 'block' : 'none';
    if (quizProcessingSection) quizProcessingSection.style.display = section === 'processing' ? 'block' : 'none';
    if (quizSettingsSection) quizSettingsSection.style.display = section === 'settings' ? 'block' : 'none';
    if (quizGeneratingSection) quizGeneratingSection.style.display = section === 'generating' ? 'block' : 'none';
}

// Modal controls
function openQuizModal() {
    console.log('openQuizModal called');
    
    // Re-fetch element in case it wasn't ready before
    if (!quizModal) {
        quizModal = document.getElementById('quizModal');
    }
    
    console.log('quizModal element:', quizModal);
    
    if (quizModal) {
        quizModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        showQuizSection('upload');
        console.log('Quiz modal opened successfully');
    } else {
        console.error('Quiz modal element not found!');
        alert('Error: Quiz modal not found. Please refresh the page.');
    }
}

function closeQuizModal() {
    if (quizModal) {
        quizModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// Update progress for quiz processing
function updateQuizProgress(percent, status) {
    const fill = document.getElementById('quizProcessingProgress');
    const statusEl = document.getElementById('quizProcessingStatus');
    
    if (fill) fill.style.width = `${percent}%`;
    if (statusEl && status) statusEl.textContent = status;
}

// Toast notification for quiz
function showQuizToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (!toast || !toastMessage) {
        console.log(`[Quiz Toast] ${type}: ${message}`);
        return;
    }
    
    toastMessage.textContent = message;
    toast.className = `toast-notification toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Debug: Log when script loads
console.log('Quiz.js script loaded');
