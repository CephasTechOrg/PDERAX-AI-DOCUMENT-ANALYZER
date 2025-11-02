// API Layer - Pure backend communication
// DO NOT MODIFY THIS FILE UNLESS BACKEND API CHANGES

const API_BASE_URL = 'http://localhost:8000/api/v1';

class APIService {
    constructor() {
        this.baseURL = API_BASE_URL;
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
        const response = await fetch(`${this.baseURL}/download/${filename}`);
        
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