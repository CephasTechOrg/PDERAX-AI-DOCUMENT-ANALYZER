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
     * Show profile modal with current user data and edit capability
     */
    function showProfile() {
        const user = getUser();
        if (!user) return;

        const existing = document.getElementById('pderax-profile-modal');
        if (existing) existing.remove();

        const displayName  = user.full_name || '';
        const email        = user.email || '';
        const createdVia   = user.created_via || 'email';
        const university   = user.university || '';
        const fieldOfStudy = user.field_of_study || '';
        const academicLevel = user.academic_level || '';
        const avatarUrl   = user.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=4f46e5&color=fff&size=80`;

        // Check if mobile
        const isMobile = window.innerWidth <= 640;

        const modal = document.createElement('div');
        modal.id = 'pderax-profile-modal';
        modal.style.cssText = [
            'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999',
            'display:flex;align-items:flex-start;justify-content:center',
            'padding:2rem 1rem;overflow-y:auto'
        ].join(';');

        modal.innerHTML = `
            <div style="
                background:#1e293b;border:1px solid #334155;border-radius:1rem;
                padding:${isMobile ? '1.5rem 1rem' : '2rem'};width:100%;max-width:440px;
                box-shadow:0 25px 50px rgba(0,0,0,0.6);position:relative;
                margin:auto 0;
            ">
                <button id="pm-close" style="
                    position:absolute;top:1rem;right:1rem;
                    background:none;border:none;color:#94a3b8;
                    font-size:1.5rem;cursor:pointer;padding:0.5rem;
                    line-height:1;
                " aria-label="Close">&times;</button>

                <div style="text-align:center;margin-bottom:1.5rem;">
                    <img src="${avatarUrl}" alt="${displayName}"
                        style="width:72px;height:72px;border-radius:50%;margin-bottom:0.75rem;display:block;margin-left:auto;margin-right:auto;">
                    <p style="color:#94a3b8;font-size:0.8125rem;">
                        ${createdVia === 'google' ? '<i class="fab fa-google" style="margin-right:4px;"></i>Google account' : 'Email account'}
                    </p>
                </div>

                <form id="pm-form" style="display:flex;flex-direction:column;gap:1rem;">
                    <div style="display:flex;flex-direction:column;gap:0.375rem;">
                        <label style="font-size:0.875rem;font-weight:500;color:#f8fafc;">Full Name</label>
                        <input id="pm-name" type="text" value="${displayName}"
                            placeholder="Your full name"
                            style="
                                padding:0.75rem 1rem;background:#0f172a;
                                border:1px solid #334155;border-radius:0.5rem;
                                color:#f8fafc;font-size:0.9375rem;width:100%;
                                box-sizing:border-box;
                            ">
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.375rem;">
                        <label style="font-size:0.875rem;font-weight:500;color:#94a3b8;">Email</label>
                        <input type="email" value="${email}" disabled
                            style="
                                padding:0.75rem 1rem;background:#0f172a;
                                border:1px solid #334155;border-radius:0.5rem;
                                color:#6b7280;font-size:0.9375rem;width:100%;
                                cursor:not-allowed;box-sizing:border-box;
                            ">
                        <p style="font-size:0.75rem;color:#6b7280;">Email cannot be changed</p>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.375rem;">
                        <label style="font-size:0.875rem;font-weight:500;color:#f8fafc;">University / Institution</label>
                        <input id="pm-university" type="text" value="${university}"
                            placeholder="e.g. MIT, Oxford…"
                            style="
                                padding:0.75rem 1rem;background:#0f172a;
                                border:1px solid #334155;border-radius:0.5rem;
                                color:#f8fafc;font-size:0.9375rem;width:100%;
                                box-sizing:border-box;
                            ">
                    </div>
                    <div style="display:flex;gap:0.75rem;flex-direction:${isMobile ? 'column' : 'row'};">
                        <div style="display:flex;flex-direction:column;gap:0.375rem;flex:1;">
                            <label style="font-size:0.875rem;font-weight:500;color:#f8fafc;">Field of Study</label>
                            <input id="pm-field" type="text" value="${fieldOfStudy}"
                                placeholder="e.g. Computer Science"
                                style="
                                    padding:0.75rem 1rem;background:#0f172a;
                                    border:1px solid #334155;border-radius:0.5rem;
                                    color:#f8fafc;font-size:0.9375rem;width:100%;
                                    box-sizing:border-box;
                                ">
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.375rem;flex:1;">
                            <label style="font-size:0.875rem;font-weight:500;color:#f8fafc;">Academic Level</label>
                            <select id="pm-level" style="
                                padding:0.75rem 1rem;background:#0f172a;
                                border:1px solid #334155;border-radius:0.5rem;
                                color:#f8fafc;font-size:0.9375rem;width:100%;
                                box-sizing:border-box;
                            ">
                                <option value="">— select —</option>
                                <option value="high_school" ${academicLevel === 'high_school' ? 'selected' : ''}>High School</option>
                                <option value="undergraduate" ${academicLevel === 'undergraduate' ? 'selected' : ''}>Undergraduate</option>
                                <option value="graduate" ${academicLevel === 'graduate' ? 'selected' : ''}>Graduate</option>
                                <option value="phd" ${academicLevel === 'phd' ? 'selected' : ''}>PhD</option>
                                <option value="professional" ${academicLevel === 'professional' ? 'selected' : ''}>Professional</option>
                            </select>
                        </div>
                    </div>

                    <div id="pm-msg" style="display:none;padding:0.625rem 0.875rem;border-radius:0.5rem;font-size:0.875rem;"></div>

                    <div style="display:flex;gap:0.75rem;margin-top:0.5rem;flex-direction:${isMobile ? 'column-reverse' : 'row'};">
                        <button type="button" id="pm-cancel" style="
                            flex:1;padding:0.75rem;border-radius:0.5rem;
                            border:1px solid #334155;background:transparent;
                            color:#94a3b8;font-size:0.9375rem;font-weight:500;
                            cursor:pointer;
                        ">Cancel</button>
                        <button type="submit" id="pm-save" style="
                            flex:1;padding:0.75rem;border-radius:0.5rem;
                            border:none;background:#4f46e5;
                            color:white;font-size:0.9375rem;font-weight:600;
                            cursor:pointer;
                        ">Save Changes</button>
                    </div>
                </form>

                <div style="text-align:center;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid #334155;">
                    <button id="pm-logout" style="
                        background:none;border:none;color:#ef4444;
                        font-size:0.875rem;cursor:pointer;
                    "><i class="fas fa-sign-out-alt" style="margin-right:6px;"></i>Sign Out</button>
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
