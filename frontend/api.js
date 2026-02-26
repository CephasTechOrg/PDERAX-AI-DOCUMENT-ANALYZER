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

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeader()
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
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
}

// Create global API instance
window.apiService = new APIService();
