/**
 * PDERAX Authentication Utilities
 * Provides auth state management and route protection for all pages
 */

const AuthService = (() => {
    const TOKEN_KEY = 'pderax_access_token';
    const REFRESH_KEY = 'pderax_refresh_token';
    const USER_KEY = 'pderax_user';
    
    const apiBase = window.apiService ? window.apiService.baseURL : 'http://localhost:8000/api/v1';
    const authBase = `${apiBase}/auth`;

    /**
     * Get the current access token
     */
    function getAccessToken() {
        return localStorage.getItem(TOKEN_KEY);
    }

    /**
     * Get the current refresh token
     */
    function getRefreshToken() {
        return localStorage.getItem(REFRESH_KEY);
    }

    /**
     * Get the stored user object
     */
    function getUser() {
        const userJson = localStorage.getItem(USER_KEY);
        if (!userJson) return null;
        try {
            return JSON.parse(userJson);
        } catch {
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    function isAuthenticated() {
        const token = getAccessToken();
        if (!token) return false;
        
        // Basic JWT expiration check
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            return Date.now() < exp;
        } catch {
            return false;
        }
    }

    /**
     * Save tokens to local storage
     */
    function saveTokens(tokens) {
        if (!tokens?.access_token) return;
        localStorage.setItem(TOKEN_KEY, tokens.access_token);
        if (tokens.refresh_token) {
            localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
        }
        if (tokens.user) {
            localStorage.setItem(USER_KEY, JSON.stringify(tokens.user));
        }
    }

    /**
     * Clear all auth data (logout)
     */
    function clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
    }

    /**
     * Logout and redirect to login page
     */
    function logout(redirectUrl = null) {
        clearAuth();
        const loginUrl = redirectUrl 
            ? `frontend/login.html?redirect=${encodeURIComponent(redirectUrl)}`
            : 'frontend/login.html';
        window.location.href = loginUrl;
    }

    /**
     * Require authentication - redirects to login if not authenticated
     * @param {string} redirectAfterLogin - URL to redirect to after successful login
     */
    function requireAuth(redirectAfterLogin = null) {
        if (!isAuthenticated()) {
            const currentUrl = redirectAfterLogin || window.location.href;
            const loginUrl = `frontend/login.html?redirect=${encodeURIComponent(currentUrl)}`;
            window.location.href = loginUrl;
            return false;
        }
        return true;
    }

    /**
     * Refresh the access token using refresh token
     */
    async function refreshAccessToken() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
            clearAuth();
            return null;
        }

        try {
            const response = await fetch(`${authBase}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (!response.ok) {
                clearAuth();
                return null;
            }

            const data = await response.json();
            saveTokens(data);
            return data.access_token;
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearAuth();
            return null;
        }
    }

    /**
     * Fetch the current user profile from the server
     */
    async function fetchCurrentUser() {
        const token = getAccessToken();
        if (!token) return null;

        try {
            const response = await fetch(`${authBase}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Try to refresh token
                    const newToken = await refreshAccessToken();
                    if (newToken) {
                        return fetchCurrentUser();
                    }
                }
                return null;
            }

            const user = await response.json();
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            return user;
        } catch (error) {
            console.error('Failed to fetch user:', error);
            return null;
        }
    }

    /**
     * Make an authenticated API request
     */
    async function authFetch(url, options = {}) {
        let token = getAccessToken();
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        let response = await fetch(url, { ...options, headers });

        // If unauthorized, try to refresh token and retry
        if (response.status === 401) {
            token = await refreshAccessToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                response = await fetch(url, { ...options, headers });
            } else {
                throw new Error('Session expired. Please login again.');
            }
        }

        return response;
    }

    /**
     * Update user profile
     */
    async function updateProfile(profileData) {
        const response = await authFetch(`${authBase}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || 'Failed to update profile');
        }

        const updatedUser = await response.json();
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        return updatedUser;
    }

    /**
     * Initialize auth state on page load
     * Call this on protected pages to check auth status
     */
    function init(options = {}) {
        const { requireLogin = false, redirectUrl = null } = options;
        
        if (requireLogin) {
            return requireAuth(redirectUrl);
        }
        
        return isAuthenticated();
    }

    /**
     * Update navigation UI for authenticated user
     * Call this after page loads to show user menu
     */
    function updateNavForAuthenticatedUser() {
        const user = getUser();
        const navActions = document.querySelector('.nav-actions');
        
        if (navActions && user) {
            const displayName = user.full_name || user.email.split('@')[0];
            const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`;
            
            navActions.innerHTML = `
                <div class="user-menu">
                    <button class="user-menu-btn" onclick="AuthService.toggleUserMenu()">
                        <img src="${avatarUrl}" alt="${displayName}" class="user-avatar">
                        <span class="user-name">${displayName}</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        <a href="#" class="dropdown-item" onclick="AuthService.showProfile(); return false;">
                            <i class="fas fa-user"></i> Profile
                        </a>
                        <a href="#" class="dropdown-item" onclick="AuthService.showSettings(); return false;">
                            <i class="fas fa-cog"></i> Settings
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="#" class="dropdown-item logout" onclick="AuthService.handleLogout(); return false;">
                            <i class="fas fa-sign-out-alt"></i> Sign Out
                        </a>
                    </div>
                </div>
            `;
            
            // Setup click-outside listener to close dropdown
            setupDropdownListener();
        }
    }

    /**
     * Toggle user dropdown menu
     */
    function toggleUserMenu() {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    /**
     * Handle logout click
     */
    function handleLogout() {
        logout();
    }

    /**
     * Show profile settings
     */
    function showProfile() {
        alert('Profile settings coming soon!');
    }

    /**
     * Show general settings
     */
    function showSettings() {
        alert('Settings coming soon!');
    }

    /**
     * Setup click-outside listener for dropdown
     */
    function setupDropdownListener() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('userDropdown');
            const userMenuBtn = document.querySelector('.user-menu-btn');
            if (dropdown && userMenuBtn && !userMenuBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    // Public API
    return {
        getAccessToken,
        getRefreshToken,
        getUser,
        isAuthenticated,
        saveTokens,
        clearAuth,
        logout,
        requireAuth,
        refreshAccessToken,
        fetchCurrentUser,
        authFetch,
        updateProfile,
        init,
        updateNavForAuthenticatedUser,
        toggleUserMenu,
        handleLogout,
        showProfile,
        showSettings
    };
})();

// Make it globally available
window.AuthService = AuthService;
