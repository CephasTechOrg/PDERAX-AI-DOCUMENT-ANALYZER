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
            ? `login.html?redirect=${encodeURIComponent(redirectUrl)}`
            : 'login.html';
        window.location.href = loginUrl;
    }

    /**
     * Require authentication - redirects to login if not authenticated
     * @param {string} redirectAfterLogin - URL to redirect to after successful login
     */
    function requireAuth(redirectAfterLogin = null) {
        if (!isAuthenticated()) {
            // Handle file:// protocol edge case
            let currentUrl = redirectAfterLogin || window.location.href;
            if (window.location.protocol === 'file:') {
                currentUrl = window.location.pathname.split('/').pop() || 'analyzer.html';
            }
            const loginUrl = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
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
     * Show profile modal with current user data and edit capability
     */
    function showProfile() {
        const user = getUser();
        if (!user) return;

        const existing = document.getElementById('pderax-profile-modal');
        if (existing) existing.remove();
        
        // Remove existing style tag if present
        const existingStyle = document.getElementById('pderax-profile-styles');
        if (existingStyle) existingStyle.remove();

        const displayName  = user.full_name || '';
        const email        = user.email || '';
        const createdVia   = user.created_via || 'email';
        const university   = user.university || '';
        const fieldOfStudy = user.field_of_study || '';
        const academicLevel = user.academic_level || '';
        const avatarUrl   = user.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=4f46e5&color=fff&size=80`;

        // Inject responsive CSS
        const styleTag = document.createElement('style');
        styleTag.id = 'pderax-profile-styles';
        styleTag.textContent = `
            #pderax-profile-modal {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0,0,0,0.7) !important;
                z-index: 99999 !important;
                display: block !important;
                overflow-y: auto !important;
                overflow-x: hidden !important;
                padding: 40px 20px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
            #pderax-profile-modal .pm-content {
                background: #1e293b !important;
                border: 1px solid #334155 !important;
                border-radius: 16px !important;
                padding: 32px !important;
                width: 100% !important;
                max-width: 440px !important;
                box-shadow: 0 25px 50px rgba(0,0,0,0.6) !important;
                position: relative !important;
                box-sizing: border-box !important;
                margin: 0 auto !important;
            }
            #pderax-profile-modal .pm-close {
                position: absolute !important;
                top: 16px !important;
                right: 16px !important;
                background: none !important;
                border: none !important;
                color: #94a3b8 !important;
                font-size: 24px !important;
                cursor: pointer !important;
                padding: 8px !important;
                line-height: 1 !important;
                z-index: 10 !important;
            }
            #pderax-profile-modal .pm-close:hover {
                color: #f8fafc !important;
            }
            #pderax-profile-modal .pm-avatar-section {
                text-align: center !important;
                margin-bottom: 24px !important;
            }
            #pderax-profile-modal .pm-avatar {
                width: 72px !important;
                height: 72px !important;
                border-radius: 50% !important;
                margin: 0 auto 12px auto !important;
                display: block !important;
            }
            #pderax-profile-modal .pm-account-type {
                color: #94a3b8 !important;
                font-size: 13px !important;
                margin: 0 !important;
            }
            #pderax-profile-modal .pm-form {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
            }
            #pderax-profile-modal .pm-field {
                display: flex !important;
                flex-direction: column !important;
                gap: 6px !important;
            }
            #pderax-profile-modal .pm-label {
                font-size: 14px !important;
                font-weight: 500 !important;
                color: #f8fafc !important;
                margin: 0 !important;
            }
            #pderax-profile-modal .pm-label-disabled {
                color: #94a3b8 !important;
            }
            #pderax-profile-modal .pm-input {
                padding: 12px 16px !important;
                background: #0f172a !important;
                border: 1px solid #334155 !important;
                border-radius: 8px !important;
                color: #f8fafc !important;
                font-size: 15px !important;
                width: 100% !important;
                box-sizing: border-box !important;
                margin: 0 !important;
            }
            #pderax-profile-modal .pm-input:focus {
                outline: none !important;
                border-color: #4f46e5 !important;
            }
            #pderax-profile-modal .pm-input:disabled {
                color: #6b7280 !important;
                cursor: not-allowed !important;
            }
            #pderax-profile-modal .pm-hint {
                font-size: 12px !important;
                color: #6b7280 !important;
                margin: 0 !important;
            }
            #pderax-profile-modal .pm-row {
                display: flex !important;
                gap: 12px !important;
                flex-direction: row !important;
            }
            #pderax-profile-modal .pm-row > div {
                flex: 1 !important;
                min-width: 0 !important;
            }
            #pderax-profile-modal .pm-msg {
                display: none;
                padding: 10px 14px !important;
                border-radius: 8px !important;
                font-size: 14px !important;
            }
            #pderax-profile-modal .pm-buttons {
                display: flex !important;
                gap: 12px !important;
                margin-top: 8px !important;
                flex-direction: row !important;
            }
            #pderax-profile-modal .pm-btn {
                flex: 1 !important;
                padding: 12px !important;
                border-radius: 8px !important;
                font-size: 15px !important;
                font-weight: 500 !important;
                cursor: pointer !important;
            }
            #pderax-profile-modal .pm-btn-cancel {
                border: 1px solid #334155 !important;
                background: transparent !important;
                color: #94a3b8 !important;
            }
            #pderax-profile-modal .pm-btn-cancel:hover {
                background: #334155 !important;
            }
            #pderax-profile-modal .pm-btn-save {
                border: none !important;
                background: #4f46e5 !important;
                color: white !important;
                font-weight: 600 !important;
            }
            #pderax-profile-modal .pm-btn-save:hover {
                background: #4338ca !important;
            }
            #pderax-profile-modal .pm-footer {
                text-align: center !important;
                margin-top: 20px !important;
                padding-top: 20px !important;
                border-top: 1px solid #334155 !important;
            }
            #pderax-profile-modal .pm-logout {
                background: none !important;
                border: none !important;
                color: #ef4444 !important;
                font-size: 14px !important;
                cursor: pointer !important;
            }
            #pderax-profile-modal .pm-logout:hover {
                color: #dc2626 !important;
            }
            
            /* Mobile Responsive */
            @media (max-width: 640px) {
                #pderax-profile-modal {
                    padding: 20px 10px !important;
                }
                #pderax-profile-modal .pm-content {
                    padding: 20px 16px !important;
                }
                #pderax-profile-modal .pm-row {
                    flex-direction: column !important;
                }
                #pderax-profile-modal .pm-buttons {
                    flex-direction: column-reverse !important;
                }
                #pderax-profile-modal .pm-avatar {
                    width: 60px !important;
                    height: 60px !important;
                }
            }
        `;
        document.head.appendChild(styleTag);

        const modal = document.createElement('div');
        modal.id = 'pderax-profile-modal';

        modal.innerHTML = `
            <div class="pm-content">
                <button class="pm-close" id="pm-close" aria-label="Close">&times;</button>

                <div class="pm-avatar-section">
                    <img src="${avatarUrl}" alt="${displayName}" class="pm-avatar">
                    <p class="pm-account-type">
                        ${createdVia === 'google' ? '<i class="fab fa-google" style="margin-right:4px;"></i>Google account' : 'Email account'}
                    </p>
                </div>

                <form id="pm-form" class="pm-form">
                    <div class="pm-field">
                        <label class="pm-label">Full Name</label>
                        <input id="pm-name" type="text" value="${displayName}" placeholder="Your full name" class="pm-input">
                    </div>
                    <div class="pm-field">
                        <label class="pm-label pm-label-disabled">Email</label>
                        <input type="email" value="${email}" disabled class="pm-input">
                        <p class="pm-hint">Email cannot be changed</p>
                    </div>
                    <div class="pm-field">
                        <label class="pm-label">University / Institution</label>
                        <input id="pm-university" type="text" value="${university}" placeholder="e.g. MIT, Oxford…" class="pm-input">
                    </div>
                    <div class="pm-row">
                        <div class="pm-field">
                            <label class="pm-label">Field of Study</label>
                            <input id="pm-field" type="text" value="${fieldOfStudy}" placeholder="e.g. Computer Science" class="pm-input">
                        </div>
                        <div class="pm-field">
                            <label class="pm-label">Academic Level</label>
                            <select id="pm-level" class="pm-input">
                                <option value="">— select —</option>
                                <option value="high_school" ${academicLevel === 'high_school' ? 'selected' : ''}>High School</option>
                                <option value="undergraduate" ${academicLevel === 'undergraduate' ? 'selected' : ''}>Undergraduate</option>
                                <option value="graduate" ${academicLevel === 'graduate' ? 'selected' : ''}>Graduate</option>
                                <option value="phd" ${academicLevel === 'phd' ? 'selected' : ''}>PhD</option>
                                <option value="professional" ${academicLevel === 'professional' ? 'selected' : ''}>Professional</option>
                            </select>
                        </div>
                    </div>

                    <div id="pm-msg" class="pm-msg"></div>

                    <div class="pm-buttons">
                        <button type="button" id="pm-cancel" class="pm-btn pm-btn-cancel">Cancel</button>
                        <button type="submit" id="pm-save" class="pm-btn pm-btn-save">Save Changes</button>
                    </div>
                </form>

                <div class="pm-footer">
                    <button id="pm-logout" class="pm-logout">
                        <i class="fas fa-sign-out-alt" style="margin-right:6px;"></i>Sign Out
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Wire up events
        document.getElementById('pm-close').onclick  = () => modal.remove();
        document.getElementById('pm-cancel').onclick = () => modal.remove();
        document.getElementById('pm-logout').onclick = () => { modal.remove(); handleLogout(); };

        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        document.getElementById('pm-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('pm-save');
            const msgEl   = document.getElementById('pm-msg');
            const newName = document.getElementById('pm-name').value.trim();

            if (!newName) {
                showModalMsg(msgEl, 'Full name cannot be empty', 'error');
                return;
            }

            saveBtn.disabled    = true;
            saveBtn.textContent = 'Saving…';

            try {
                const payload = {
                    full_name:      newName,
                    university:     document.getElementById('pm-university').value.trim() || null,
                    field_of_study: document.getElementById('pm-field').value.trim() || null,
                    academic_level: document.getElementById('pm-level').value || null,
                };
                await updateProfile(payload);
                showModalMsg(msgEl, 'Profile updated successfully!', 'success');
                updateNavForAuthenticatedUser();
                setTimeout(() => modal.remove(), 1200);
            } catch (err) {
                showModalMsg(msgEl, err.message || 'Update failed', 'error');
                saveBtn.disabled    = false;
                saveBtn.textContent = 'Save Changes';
            }
        });

        function showModalMsg(el, text, type) {
            el.style.display = 'block';
            el.textContent   = text;
            el.style.background = type === 'success'
                ? 'rgba(16,185,129,0.1)'  : 'rgba(239,68,68,0.1)';
            el.style.border = type === 'success'
                ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)';
            el.style.color = type === 'success' ? '#10b981' : '#ef4444';
        }
    }

    /**
     * Show settings (placeholder — Settings page coming in Phase 3)
     */
    function showSettings() {
        showProfile();
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
