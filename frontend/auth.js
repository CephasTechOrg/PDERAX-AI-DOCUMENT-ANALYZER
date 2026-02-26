(() => {
    const apiBase = window.apiService ? window.apiService.baseURL : 'http://localhost:8000/api/v1';
    const authBase = `${apiBase}/auth`;

    const tabs = document.querySelectorAll('.auth-tab');
    const panels = {
        login: document.getElementById('loginPanel'),
        signup: document.getElementById('signupPanel'),
        verify: document.getElementById('verifyPanel')
    };

    const authMessage = document.getElementById('authMessage');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const verifyForm = document.getElementById('verifyForm');
    const resendBtn = document.getElementById('resendCode');
    const googleLogin = document.getElementById('googleLogin');

    function setMessage(message, type = 'info') {
        if (!authMessage) return;
        authMessage.textContent = message;
        authMessage.className = `auth-message ${type}`;
    }

    function switchTab(tabName) {
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        Object.entries(panels).forEach(([key, panel]) => {
            if (!panel) return;
            panel.hidden = key !== tabName;
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
            setMessage('');
        });
    });

    const frontendOrigin = window.location.origin === 'null' ? 'http://localhost:5500' : window.location.origin;
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    const defaultRedirect = `${frontendOrigin}/index.html`;
    const redirectTarget = redirectParam && redirectParam.startsWith(frontendOrigin) ? redirectParam : defaultRedirect;

    if (googleLogin) {
        const redirectUrl = encodeURIComponent(redirectTarget);
        googleLogin.href = `${authBase}/google/login?redirect=${redirectUrl}`;
    }

    function saveTokens(tokens) {
        if (!tokens?.access_token) return;
        localStorage.setItem('pderax_access_token', tokens.access_token);
        if (tokens.refresh_token) {
            localStorage.setItem('pderax_refresh_token', tokens.refresh_token);
        }
    }

    function handleTokenRedirect() {
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken) {
            saveTokens({ access_token: accessToken, refresh_token: refreshToken });
            setMessage('Google login successful. You can continue to the analyzer.', 'success');
            switchTab('login');
            params.delete('access_token');
            params.delete('refresh_token');
            const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
            window.history.replaceState({}, document.title, newUrl);
            window.location.href = redirectTarget;
        }
    }

    async function postJson(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data.detail || 'Request failed';
            throw new Error(message);
        }
        return data;
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setMessage('Creating account...', 'info');

            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;

            try {
                await postJson(`${authBase}/register`, { email, password });
                setMessage('Account created. Verification code sent to your email.', 'success');
                document.getElementById('verifyEmail').value = email;
                switchTab('verify');
            } catch (error) {
                setMessage(error.message, 'error');
            }
        });
    }

    if (verifyForm) {
        verifyForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setMessage('Verifying...', 'info');

            const email = document.getElementById('verifyEmail').value.trim();
            const code = document.getElementById('verifyCode').value.trim();

            try {
                await postJson(`${authBase}/verify`, { email, code });
                setMessage('Email verified. You can sign in now.', 'success');
                document.getElementById('loginEmail').value = email;
                switchTab('login');
            } catch (error) {
                setMessage(error.message, 'error');
            }
        });
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            const email = document.getElementById('verifyEmail').value.trim();
            if (!email) {
                setMessage('Enter your email to resend a code.', 'error');
                return;
            }

            setMessage('Resending code...', 'info');
            try {
                await postJson(`${authBase}/resend-code`, { email });
                setMessage('Verification code sent.', 'success');
            } catch (error) {
                setMessage(error.message, 'error');
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            setMessage('Signing in...', 'info');

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            try {
                const data = await postJson(`${authBase}/login`, { email, password });
                saveTokens(data);
                setMessage('Login successful. Continue to the analyzer.', 'success');
            } catch (error) {
                setMessage(error.message, 'error');
            }
        });
    }

    handleTokenRedirect();
})();
