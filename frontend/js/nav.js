/**
 * PDERAX — Shared Navigation Component
 * Injects the site header into any page.
 * Detects auth state immediately (no flash), handles mobile toggle.
 * Load this script BEFORE api.js and auth.js.
 */
(function () {
    'use strict';

    /* ── Path resolution ────────────────────────────────────────── */
    const pathname    = window.location.pathname;
    const inHtmlPages = pathname.includes('/frontend/html/');
    const root        = inHtmlPages ? '' : 'frontend/html/';
    const fe          = root;
    const currentFile = pathname.split('/').pop() || 'analyzer.html';

    /* ── Immediate auth detection (avoids Sign-In flash) ────────── */
    function getStoredUser() {
        try { return JSON.parse(localStorage.getItem('pderax_user')); } catch { return null; }
    }
    function isTokenValid() {
        const token = localStorage.getItem('pderax_access_token');
        if (!token) return false;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return Date.now() < payload.exp * 1000;
        } catch { return false; }
    }

    /* ── Nav links ──────────────────────────────────────────────── */
    const NAV_LINKS = [
        { label: 'Analyzer',     href: `${root}analyzer.html`,     file: 'analyzer.html'     },
        { label: 'AI Assistant', href: `${root}ai-assistant.html`, file: 'ai-assistant.html' },
        { label: 'Study Tools',  href: `${root}study-tools.html`,  file: 'study-tools.html'  },
        { label: 'History',      href: `${root}history.html`,      file: 'history.html'      },
    ];

    const linksHtml = NAV_LINKS.map(({ label, href, file }) => {
        const active = currentFile === file;
        return `<a href="${href}" class="nav-link${active ? ' active' : ''}" data-text="${label}">${label}</a>`;
    }).join('\n                        ');

    /* ── Auth actions HTML ──────────────────────────────────────── */
    function buildActionsHtml(user) {
        if (!user || !isTokenValid()) {
            return `<a class="nav-btn" href="${fe}login.html">
                        <i class="fas fa-user"></i> Sign In
                    </a>`;
        }
        const displayName = user.full_name || user.email.split('@')[0];
        const avatarUrl   = user.avatar_url ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&size=64`;
        return `
            <div class="user-menu">
                <button class="user-menu-btn" onclick="AuthService && AuthService.toggleUserMenu()">
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
            </div>`;
    }

    /* ── Build full header HTML ─────────────────────────────────── */
    const user        = getStoredUser();
    const actionsHtml = buildActionsHtml(user);

    const html = `
        <header class="header" id="site-header">
            <div class="nav-container">
                <a href="${root}analyzer.html" class="logo">
                    <div class="logo-icon">
                        <svg class="logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" rx="8" fill="url(#nav-logo-gradient)"/>
                            <path d="M12 10h10c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-10v-6z" fill="white" opacity="0.9"/>
                            <path d="M12 18h8c1.1 0 2 .9 2 2s-.9 2-2 2h-8v-4z" fill="white" opacity="0.7"/>
                            <path d="M12 24h6v6h-6z" fill="white" opacity="0.5"/>
                            <circle cx="28" cy="26" r="6" stroke="white" stroke-width="2" fill="none"/>
                            <path d="M32 30l4 4" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            <defs>
                                <linearGradient id="nav-logo-gradient" x1="0" y1="0" x2="40" y2="40">
                                    <stop offset="0%" stop-color="#6366f1"/>
                                    <stop offset="100%" stop-color="#8b5cf6"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="logo-text">
                        <span class="logo-primary">PDERAX</span>
                        <span class="logo-subtitle">AI Document Intelligence</span>
                    </div>
                </a>

                <div class="nav-panel" id="nav-panel">
                    <nav class="nav-links" id="primary-navigation" aria-label="Main navigation">
                        ${linksHtml}
                    </nav>
                    <div class="nav-actions" id="navActions">
                        ${actionsHtml}
                    </div>
                </div>

                <button class="mobile-menu-btn" id="mobileMenuBtn" type="button"
                        aria-label="Toggle navigation" aria-expanded="false">
                    <i class="fas fa-bars icon-open" aria-hidden="true"></i>
                    <i class="fas fa-times icon-close" aria-hidden="true"></i>
                </button>
            </div>
            <div class="mobile-nav-overlay" id="mobileOverlay" aria-hidden="true"></div>
        </header>`;

    /* ── Injection ──────────────────────────────────────────────── */
    function inject() {
        const placeholder = document.getElementById('nav-root');
        if (placeholder) {
            placeholder.outerHTML = html;
        } else {
            const container = document.querySelector('.container');
            if (container) container.insertAdjacentHTML('afterbegin', html);
        }
        attachMobileToggle();
        attachDropdownClose();
    }

    /* ── Mobile hamburger toggle ────────────────────────────────── */
    function attachMobileToggle() {
        const btn     = document.getElementById('mobileMenuBtn');
        const panel   = document.getElementById('nav-panel');
        const overlay = document.getElementById('mobileOverlay');
        if (!btn || !panel) return;

        btn.addEventListener('click', () => {
            const open = btn.classList.toggle('active');
            panel.classList.toggle('active', open);
            overlay.classList.toggle('active', open);
            btn.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('menu-open', open);
        });

        overlay.addEventListener('click', closeMobileMenu);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMobileMenu();
        });

        // Close when a nav link is clicked
        document.querySelectorAll('#primary-navigation .nav-link').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        function closeMobileMenu() {
            btn.classList.remove('active');
            panel.classList.remove('active');
            overlay.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('menu-open');
        }
    }

    /* ── Desktop user-dropdown click-outside close ──────────────── */
    function attachDropdownClose() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('userDropdown');
            if (!dropdown) return;
            const menuBtn = dropdown.previousElementSibling;
            if (menuBtn && !menuBtn.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }

    /* ── Dynamic copyright year ─────────────────────────────────── */
    function setFooterYear() {
        document.querySelectorAll('#footer-year').forEach(el => {
            el.textContent = new Date().getFullYear();
        });
    }

    /* ── Run immediately or wait for DOM ────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { inject(); setFooterYear(); });
    } else {
        inject();
        setFooterYear();
    }
})();
