// API Layer - Pure backend communication
// Supports both local dev and Render deployment

const LOCAL_API_BASE_URL = 'http://localhost:8000/api/v1';
const RENDER_API_BASE_URL = 'https://ai-pdf-analyzer-backend.onrender.com/api/v1';

function resolveBaseURL() {
    // Explicit override via query param (?api=local|render)
    const params = new URLSearchParams(window.location.search);
    const apiTarget = params.get('api');
    if (apiTarget === 'local') return LOCAL_API_BASE_URL;
    if (apiTarget === 'render') return RENDER_API_BASE_URL;

    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // If opened directly (file://) or host is empty, default to local backend
    if (!host || protocol === 'file:') {
        return LOCAL_API_BASE_URL;
    }

    // Default: use local in dev, Render in production/hosted
    const isLocal =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host.endsWith('.local') ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('172.16.');

    return isLocal ? LOCAL_API_BASE_URL : RENDER_API_BASE_URL;
}

class APIService {
    constructor() {
        this.baseURL = resolveBaseURL();
    }

    getAuthHeader() {
        const token = localStorage.getItem('pderax_access_token');
        if (!token) return {};
        return { Authorization: `Bearer ${token}` };
    }

    /**
     * Upload and analyze a file
     * @param {File} file - The file to analyze
     * @returns {Promise<Object>} Analysis results
     */
    async uploadAndAnalyze(file) {
        const formData = new FormData();
        formData.append('file', file);

        console.log('[API] Uploading file:', file.name, 'to:', `${this.baseURL}/upload`);
        console.log('[API] Auth token present:', !!localStorage.getItem('pderax_access_token'));

        try {
            const response = await fetch(`${this.baseURL}/upload`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeader()
                },
                body: formData
            });

            console.log('[API] Response status:', response.status);

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorMessage;
                    console.error('[API] Error response:', errorData);
                } catch (e) {
                    console.error('[API] Could not parse error response');
                }
                
                // Handle specific auth errors
                if (response.status === 401) {
                    console.error('[API] Authentication failed - token may be invalid or expired');
                    localStorage.removeItem('pderax_access_token');
                    throw new Error('Session expired. Please log in again.');
                }
                if (response.status === 403) {
                    throw new Error('Access denied. Please verify your email or check permissions.');
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('[API] Success response:', data);
            return data;
        } catch (error) {
            console.error('[API] Upload error:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Cannot connect to server. Make sure the backend is running on ' + this.baseURL);
            }
            throw error;
        }
    }

    /**
     * Download an analysis file
     * @param {string} filename - The filename to download
     * @returns {Promise<Blob>} File blob
     */
    async downloadFile(filename) {
        const response = await fetch(`${this.baseURL}/download/${filename}`, {
            headers: {
                ...this.getAuthHeader()
            }
        });
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
        }

        return await response.blob();
    }

    /**
     * Health check for backend
     * @returns {Promise<boolean>} True if backend is healthy
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get API status
     * @returns {Promise<Object>} API status information
     */
    async getStatus() {
        try {
            const response = await fetch(this.baseURL);
            if (!response.ok) throw new Error('API not responding');
            return await response.json();
        } catch (error) {
            throw new Error('Backend connection failed');
        }
    }

    /**
     * Fetch the user's analysis history
     * @returns {Promise<Array>} List of saved analyses
     */
    async getAnalysisHistory() {
        const response = await fetch(`${this.baseURL}/history/analyses`, {
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Failed to load history: ${response.status}`);
        return await response.json();
    }

    /**
     * Delete a saved analysis by ID
     * @param {string} id - Analysis UUID
     */
    async deleteAnalysis(id) {
        const response = await fetch(`${this.baseURL}/history/analyses/${id}`, {
            method: 'DELETE',
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
        return await response.json();
    }

    /**
     * Fetch the user's flashcard set history
     * @returns {Promise<Array>} List of saved flashcard sets
     */
    async getFlashcardHistory() {
        const response = await fetch(`${this.baseURL}/history/flashcard-sets`, {
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Failed to load flashcard history: ${response.status}`);
        return await response.json();
    }

    /**
     * Delete a saved flashcard set by ID
     * @param {string} id - FlashcardSet UUID
     */
    async deleteFlashcardSet(id) {
        const response = await fetch(`${this.baseURL}/history/flashcard-sets/${id}`, {
            method: 'DELETE',
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
        return await response.json();
    }

    /**
     * Generate flashcards from text
     * @param {string} text - Source text for flashcard generation
     * @param {number} count - Number of flashcards to generate
     * @param {string} difficulty - Difficulty level (easy, medium, hard)
     * @returns {Promise<Object>} Generated flashcards
     */
    async generateFlashcards(text, count = 10, difficulty = 'medium') {
        const response = await fetch(`${this.baseURL}/flashcards/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader()
            },
            body: JSON.stringify({
                text: text,
                count: count,
                difficulty: difficulty
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Flashcard generation failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Generate quiz questions from text
     * @param {string} text - Source text for quiz generation
     * @param {number} count - Number of questions to generate
     * @param {string} difficulty - Difficulty level (easy, medium, hard)
     * @returns {Promise<Object>} Generated quiz questions
     */
    async generateQuiz(text, count = 10, difficulty = 'medium') {
        const response = await fetch(`${this.baseURL}/quiz/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeader()
            },
            body: JSON.stringify({
                text: text,
                count: count,
                difficulty: difficulty
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Quiz generation failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Fetch the user's quiz set history
     * @returns {Promise<Array>} List of saved quiz sets
     */
    async getQuizHistory() {
        const response = await fetch(`${this.baseURL}/history/quiz-sets`, {
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Failed to load quiz history: ${response.status}`);
        return await response.json();
    }

    /**
     * Delete a saved quiz set by ID
     * @param {string} id - QuizSet UUID
     */
    async deleteQuizSet(id) {
        const response = await fetch(`${this.baseURL}/history/quiz-sets/${id}`, {
            method: 'DELETE',
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
        return await response.json();
    }

    // ── Chat Assistant ────────────────────────────────────────────────────────

    /**
     * Create a new chat session
     * @param {string} mode - "teacher" or "helper"
     * @returns {Promise<Object>} New session object
     */
    async createChatSession(mode = 'teacher') {
        const response = await fetch(`${this.baseURL}/chat/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
            body: JSON.stringify({ mode })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Failed to create session: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * List all chat sessions for current user
     * @returns {Promise<Array>}
     */
    async listChatSessions() {
        const response = await fetch(`${this.baseURL}/chat/sessions`, {
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Failed to load sessions: ${response.status}`);
        return await response.json();
    }

    /**
     * Get a chat session with full message history
     * @param {string} sessionId
     * @returns {Promise<Object>}
     */
    async getChatSession(sessionId) {
        const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}`, {
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Session not found: ${response.status}`);
        return await response.json();
    }

    /**
     * Update a chat session (mode or title)
     * @param {string} sessionId
     * @param {Object} updates - { mode?, title? }
     */
    async updateChatSession(sessionId, updates) {
        const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
            body: JSON.stringify(updates)
        });
        if (!response.ok) throw new Error(`Update failed: ${response.status}`);
        return await response.json();
    }

    /**
     * Delete a chat session
     * @param {string} sessionId
     */
    async deleteChatSession(sessionId) {
        const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { ...this.getAuthHeader() }
        });
        if (!response.ok) throw new Error(`Delete failed: ${response.status}`);
        return await response.json();
    }

    /**
     * Upload a document into a chat session
     * @param {string} sessionId
     * @param {File} file
     * @returns {Promise<Object>}
     */
    async uploadDocumentToSession(sessionId, file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}/upload`, {
            method: 'POST',
            headers: { ...this.getAuthHeader() },
            body: formData
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Upload failed: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Send a message in a chat session
     * @param {string} sessionId
     * @param {string} content
     * @returns {Promise<Object>} { message, session_id }
     */
    async sendChatMessage(sessionId, content) {
        const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
            body: JSON.stringify({ content })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Send failed: ${response.status}`);
        }
        return await response.json();
    }
}

// Create global API instance
window.apiService = new APIService();
