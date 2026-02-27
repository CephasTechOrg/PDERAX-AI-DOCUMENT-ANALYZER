// Flashcard Workspace JavaScript
// Handles document upload, processing, and flashcard generation

const API = window.APIService ? new window.APIService() : null;

// State management
let currentDocument = null;
let flashcards = [];
let currentIndex = 0;
let viewedCards = new Set();
let flippedCards = new Set();

// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const processingSection = document.getElementById('processingSection');
const settingsSection = document.getElementById('settingsSection');
const generatingSection = document.getElementById('generatingSection');
const resultsSection = document.getElementById('resultsSection');
const flashcardModal = document.getElementById('flashcardModal');

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeDropZone();
    initializeMobileNav();
    checkForDocumentContext();
    updateAuthUI();
});

// Check if document context was passed from main page
function checkForDocumentContext() {
    const urlParams = new URLSearchParams(window.location.search);
    const docContext = urlParams.get('context');
    
    if (docContext) {
        try {
            const context = JSON.parse(decodeURIComponent(docContext));
            currentDocument = context;
            openFlashcardModal();
            showSettingsSection();
        } catch (e) {
            console.log('No valid document context');
        }
    }
    
    // Also check sessionStorage for document data
    const storedDoc = sessionStorage.getItem('flashcard_document');
    if (storedDoc) {
        try {
            currentDocument = JSON.parse(storedDoc);
            openFlashcardModal();
            showSettingsSection();
        } catch (e) {
            console.log('No stored document');
        }
    }
}

// Initialize drag and drop
function initializeDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    if (!dropZone || !fileInput) return;
    
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
            handleFileUpload(files[0]);
        }
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

// Handle file upload
async function handleFileUpload(file) {
    // Validate file
    const validTypes = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.xlsx', '.xls'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(ext)) {
        showToast('Please upload a valid document file', 'error');
        return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be under 50MB', 'error');
        return;
    }
    
    // Show processing
    showSection('processing');
    updateProgress(0, 'Uploading document...');
    
    try {
        // Upload and analyze
        updateProgress(20, 'Analyzing content...');
        
        const result = await API.uploadAndAnalyze(file);
        
        updateProgress(60, 'Extracting key concepts...');
        
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 800));
        
        updateProgress(100, 'Document ready!');
        
        // Store document context
        currentDocument = {
            filename: file.name,
            summary: result.summary || '',
            text: result.text || result.summary || '',
            insights: result.key_insights || []
        };
        
        // Store in session for persistence
        sessionStorage.setItem('flashcard_document', JSON.stringify(currentDocument));
        
        // Show settings
        await new Promise(resolve => setTimeout(resolve, 500));
        showSettingsSection();
        
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Failed to process document. Please try again.', 'error');
        showSection('upload');
    }
}

// Show settings section
function showSettingsSection() {
    showSection('settings');
    
    if (currentDocument) {
        document.getElementById('documentInfo').textContent = 
            `"${currentDocument.filename}" is ready for flashcard generation`;
    }
}

// Generate flashcards
async function generateFlashcards() {
    const count = parseInt(document.getElementById('flashcardCount').value);
    const difficulty = document.getElementById('difficultyLevel').value;
    
    showSection('generating');
    
    try {
        // Call API to generate flashcards
        const response = await API.generateFlashcards(
            currentDocument.text || currentDocument.summary,
            count
        );
        
        if (response && response.flashcards) {
            flashcards = response.flashcards;
        } else {
            // Fallback: Generate from insights if available
            flashcards = generateFallbackFlashcards(currentDocument, count);
        }
        
        if (flashcards.length === 0) {
            throw new Error('No flashcards generated');
        }
        
        // Show results
        showResults();
        
    } catch (error) {
        console.error('Generation error:', error);
        
        // Try fallback generation
        flashcards = generateFallbackFlashcards(currentDocument, count);
        
        if (flashcards.length > 0) {
            showResults();
        } else {
            showToast('Failed to generate flashcards. Please try again.', 'error');
            showSection('settings');
        }
    }
}

// Fallback flashcard generation
function generateFallbackFlashcards(doc, count) {
    const cards = [];
    
    // Generate from insights
    if (doc.insights && doc.insights.length > 0) {
        doc.insights.slice(0, count).forEach((insight, i) => {
            cards.push({
                front: `Key Insight #${i + 1}`,
                back: insight,
                category: 'Insight'
            });
        });
    }
    
    // Generate from summary
    if (doc.summary && cards.length < count) {
        const sentences = doc.summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
        sentences.slice(0, count - cards.length).forEach((sentence, i) => {
            cards.push({
                front: `What does the document say about topic ${i + 1}?`,
                back: sentence.trim(),
                category: 'Summary'
            });
        });
    }
    
    return cards;
}

// Show results section
function showResults() {
    showSection('results');
    closeFlashcardModal();
    
    currentIndex = 0;
    viewedCards = new Set([0]);
    flippedCards = new Set();
    
    // Update counts
    document.getElementById('cardCount').textContent = `${flashcards.length} cards`;
    document.getElementById('totalCards').textContent = flashcards.length;
    
    renderFlashcards();
    updateProgress();
    updateNavButtons();
}

// Render flashcards
function renderFlashcards() {
    const deck = document.getElementById('flashcardDeck');
    deck.innerHTML = '';
    
    flashcards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = `flashcard ${index === currentIndex ? 'active' : ''}`;
        cardEl.dataset.index = index;
        
        cardEl.innerHTML = `
            <div class="flashcard-inner" onclick="flipCard(${index})">
                <div class="flashcard-front">
                    <div class="flashcard-category">${card.category || 'Question'}</div>
                    <div class="flashcard-text">${card.front}</div>
                    <div class="flashcard-hint">Click to reveal answer</div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-category">Answer</div>
                    <div class="flashcard-text">${card.back}</div>
                    <div class="flashcard-hint">Click to see question</div>
                </div>
            </div>
        `;
        
        deck.appendChild(cardEl);
    });
    
    document.getElementById('currentCard').textContent = currentIndex + 1;
}

// Flip card
function flipCard(index) {
    const card = document.querySelector(`.flashcard[data-index="${index}"]`);
    if (card) {
        card.classList.toggle('flipped');
        if (card.classList.contains('flipped')) {
            flippedCards.add(index);
            updateStudyProgress();
        }
    }
}

// Navigate cards
function nextCard() {
    if (currentIndex < flashcards.length - 1) {
        currentIndex++;
        viewedCards.add(currentIndex);
        updateCardDisplay();
    }
}

function prevCard() {
    if (currentIndex > 0) {
        currentIndex--;
        updateCardDisplay();
    }
}

function updateCardDisplay() {
    // Update active card
    document.querySelectorAll('.flashcard').forEach((card, index) => {
        card.classList.toggle('active', index === currentIndex);
        card.classList.remove('flipped'); // Reset flip state
    });
    
    document.getElementById('currentCard').textContent = currentIndex + 1;
    updateNavButtons();
    updateStudyProgress();
}

function updateNavButtons() {
    document.getElementById('prevBtn').disabled = currentIndex === 0;
    document.getElementById('nextBtn').disabled = currentIndex === flashcards.length - 1;
}

function updateStudyProgress() {
    document.getElementById('viewedCount').textContent = viewedCards.size;
    document.getElementById('flippedCount').textContent = flippedCards.size;
    document.getElementById('remainingCount').textContent = flashcards.length - viewedCards.size;
}

// Shuffle cards
function shuffleCards() {
    for (let i = flashcards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [flashcards[i], flashcards[j]] = [flashcards[j], flashcards[i]];
    }
    
    currentIndex = 0;
    viewedCards = new Set([0]);
    flippedCards = new Set();
    
    renderFlashcards();
    updateStudyProgress();
    showToast('Cards shuffled!', 'success');
}

// Reset cards
function resetCards() {
    currentIndex = 0;
    viewedCards = new Set([0]);
    flippedCards = new Set();
    
    document.querySelectorAll('.flashcard').forEach(card => {
        card.classList.remove('flipped');
    });
    
    updateCardDisplay();
    showToast('Progress reset!', 'info');
}

// Start new session
function startNewSession() {
    currentDocument = null;
    flashcards = [];
    currentIndex = 0;
    viewedCards = new Set();
    flippedCards = new Set();
    
    sessionStorage.removeItem('flashcard_document');
    
    // Clear URL params
    window.history.replaceState({}, '', 'flashcards.html');
    
    openFlashcardModal();
    showSection('upload');
}

// Section management
function showSection(section) {
    if (uploadSection) uploadSection.style.display = section === 'upload' ? 'block' : 'none';
    if (processingSection) processingSection.style.display = section === 'processing' ? 'block' : 'none';
    if (settingsSection) settingsSection.style.display = section === 'settings' ? 'block' : 'none';
    if (generatingSection) generatingSection.style.display = section === 'generating' ? 'block' : 'none';
    if (resultsSection) resultsSection.style.display = section === 'results' ? 'block' : 'none';
}

// Modal controls
function openFlashcardModal() {
    if (flashcardModal) {
        flashcardModal.style.display = 'flex';
        document.body.classList.add('menu-open');
    }
}

function closeFlashcardModal() {
    if (flashcardModal) {
        flashcardModal.style.display = 'none';
        document.body.classList.remove('menu-open');
    }
}

// Update progress
function updateProgress(percent, status) {
    const fill = document.getElementById('processingProgress');
    const statusEl = document.getElementById('processingStatus');
    
    if (fill) fill.style.width = `${percent}%`;
    if (statusEl && status) statusEl.textContent = status;
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMessage');
    
    if (!toast || !toastMsg) return;
    
    toast.className = `toast-notification toast-${type} show`;
    toastMsg.textContent = message;
    
    // Update icon
    const icon = toast.querySelector('i');
    if (icon) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        icon.className = `fas ${icons[type] || icons.success}`;
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Mobile navigation
function initializeMobileNav() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            navLinks?.classList.toggle('active');
            navActions?.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
    }
}

// Auth UI update
function updateAuthUI() {
    const token = localStorage.getItem('pderax_access_token');
    const navActions = document.getElementById('navActions');
    
    if (token && navActions) {
        // User is logged in
        const userData = JSON.parse(localStorage.getItem('pderax_user') || '{}');
        navActions.innerHTML = `
            <div class="user-menu">
                <button class="user-menu-btn" onclick="toggleUserMenu()">
                    <span class="user-name">${userData.full_name || 'User'}</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="user-dropdown" id="userDropdown">
                    <a href="../index.html" class="dropdown-item">
                        <i class="fas fa-file-alt"></i> Analyzer
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" class="dropdown-item logout" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Sign Out
                    </a>
                </div>
            </div>
        `;
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function logout() {
    localStorage.removeItem('pderax_access_token');
    localStorage.removeItem('pderax_user');
    window.location.href = 'login.html';
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (resultsSection.style.display !== 'none') {
        if (e.key === 'ArrowLeft') {
            prevCard();
        } else if (e.key === 'ArrowRight') {
            nextCard();
        } else if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            flipCard(currentIndex);
        }
    }
});
