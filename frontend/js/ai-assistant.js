/**
 * PDERAX — AI Chat Assistant
 * Manages sessions, message rendering, document upload, and mode switching.
 */
(function () {
    'use strict';

    /* ── State ───────────────────────────────────────────────── */
    let _currentSessionId = null;
    let _currentMode      = 'teacher';
    let _sending          = false;

    /* ── DOM helpers ─────────────────────────────────────────── */
    const $  = id => document.getElementById(id);
    const esc = s => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const _toastIcons = {
        success: 'fa-check-circle',
        error:   'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info:    'fa-info-circle',
    };

    function showToast(msg, type = 'info') {
        const toast = $('toast');
        const span  = $('toastMessage');
        if (!toast || !span) return;
        span.textContent = msg;
        toast.className = 'toast-notification show toast-' + type;
        const icon = toast.querySelector('i');
        if (icon) {
            icon.className = 'fas ' + (_toastIcons[type] || _toastIcons.info);
        }
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    /* ── Session list ────────────────────────────────────────── */
    async function loadSessions() {
        const list = $('sessionList');
        if (!list) return;
        try {
            const sessions = await window.apiService.listChatSessions();
            renderSessionList(sessions);
        } catch (e) {
            list.innerHTML = '<div class="sessions-empty">Could not load conversations.</div>';
        }
    }

    function renderSessionList(sessions) {
        const list = $('sessionList');
        if (!list) return;
        if (!sessions.length) {
            list.innerHTML = '<div class="sessions-empty">No conversations yet. Start one!</div>';
            return;
        }

        list.innerHTML = sessions.map(s => {
            const active  = s.id === _currentSessionId ? ' active' : '';
            const dotMode = esc(s.mode);
            const title   = esc(s.title || (s.mode === 'teacher' ? 'Teacher Mode' : 'Helper Mode'));
            const msgs    = s.message_count;
            const date    = new Date(s.updated_at).toLocaleDateString();
            return `
            <div class="session-item${active}" data-id="${esc(s.id)}" onclick="AiAssistant.openSession('${esc(s.id)}')">
                <span class="session-mode-dot ${dotMode}"></span>
                <div class="session-info">
                    <span class="session-title">${title}</span>
                    <div class="session-meta">
                        <span>${msgs} msg${msgs !== 1 ? 's' : ''}</span>
                        <span>${date}</span>
                    </div>
                </div>
                <button class="session-delete-btn"
                        title="Delete"
                        onclick="AiAssistant.deleteSession(event, '${esc(s.id)}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        }).join('');
    }

    function highlightSession(id) {
        document.querySelectorAll('.session-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === id);
        });
    }

    /* ── Open / create session ───────────────────────────────── */
    async function startSession(mode = 'teacher') {
        try {
            const session = await window.apiService.createChatSession(mode);
            _currentSessionId = session.id;
            _currentMode      = session.mode;
            await loadSessions();
            showActiveChat(session);
        } catch (e) {
            showToast('Could not start conversation: ' + e.message, 'error');
        }
    }

    async function openSession(id) {
        if (id === _currentSessionId) return;
        try {
            const session = await window.apiService.getChatSession(id);
            _currentSessionId = session.id;
            _currentMode      = session.mode;
            highlightSession(id);
            showActiveChat(session, session.messages);
        } catch (e) {
            showToast('Could not load conversation.', 'error');
        }
    }

    function showActiveChat(session, messages = []) {
        $('chatWelcome').style.display = 'none';
        $('chatActive').style.display  = 'flex';

        // Header
        $('chatTitle').textContent = session.title || 'New Conversation';
        $('chatDoc').textContent   = session.document_filename
            ? `📎 ${session.document_filename}`
            : '';

        // Document banner
        if (session.document_filename) {
            $('docBannerName').textContent = session.document_filename;
            $('docBanner').style.display = 'flex';
        } else {
            $('docBanner').style.display = 'none';
        }

        // Mode toggle
        updateModeToggle(session.mode);

        // Render messages
        const container = $('chatMessages');
        container.innerHTML = '';
        if (!messages.length) {
            appendSystemMessage(session.mode === 'teacher'
                ? '👋 Hi! I\'m your AI tutor. Ask me about your homework, upload a document, or just ask a question — I\'ll guide you to the answer!'
                : '👋 Hi! I\'m your study helper. Ask me anything and I\'ll explain it clearly!'
            );
        } else {
            messages.forEach(m => appendMessage(m.role, m.content, new Date(m.created_at)));
        }
        scrollToBottom();
    }

    function updateModeToggle(mode) {
        _currentMode = mode;
        const tBtn = $('modeTeacherBtn');
        const hBtn = $('modeHelperBtn');
        if (!tBtn || !hBtn) return;
        tBtn.classList.remove('active', 'teacher-active', 'helper-active');
        hBtn.classList.remove('active', 'teacher-active', 'helper-active');
        if (mode === 'teacher') {
            tBtn.classList.add('active', 'teacher-active');
        } else {
            hBtn.classList.add('active', 'helper-active');
        }
    }

    /* ── Mode switching ──────────────────────────────────────── */
    async function setMode(mode) {
        if (!_currentSessionId || mode === _currentMode) return;
        try {
            await window.apiService.updateChatSession(_currentSessionId, { mode });
            _currentMode = mode;
            updateModeToggle(mode);
            appendSystemMessage(
                mode === 'teacher'
                    ? '🎓 Switched to Teacher Mode — I\'ll guide you with questions and hints.'
                    : '💡 Switched to Helper Mode — I\'ll give you direct explanations.'
            );
            await loadSessions();
        } catch (e) {
            showToast('Could not switch mode.', 'error');
        }
    }

    /* ── Delete ──────────────────────────────────────────────── */
    async function deleteSession(event, id) {
        event.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        try {
            await window.apiService.deleteChatSession(id);
            if (id === _currentSessionId) {
                _currentSessionId = null;
                $('chatWelcome').style.display = '';
                $('chatActive').style.display  = 'none';
            }
            await loadSessions();
            showToast('Conversation deleted.', 'success');
        } catch (e) {
            showToast('Could not delete.', 'error');
        }
    }

    async function deleteCurrentSession() {
        if (!_currentSessionId) return;
        const fakeEvent = { stopPropagation: () => {} };
        await deleteSession(fakeEvent, _currentSessionId);
    }

    /* ── Document upload ─────────────────────────────────────── */
    function triggerDocUpload() {
        if (!_currentSessionId) {
            showToast('Start a conversation first.', 'info');
            return;
        }
        $('docFileInput').click();
    }

    async function handleDocUpload(input) {
        const file = input.files[0];
        if (!file || !_currentSessionId) return;
        input.value = '';

        const banner = document.createElement('div');
        banner.className = 'upload-progress-banner';
        banner.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading ${esc(file.name)}...`;
        $('chatActive').insertBefore(banner, $('chatMessages'));

        try {
            const result = await window.apiService.uploadDocumentToSession(_currentSessionId, file);
            banner.remove();

            // Update doc banner
            $('docBannerName').textContent = result.filename || file.name;
            $('docBanner').style.display   = 'flex';
            $('chatDoc').textContent        = `📎 ${result.filename || file.name}`;
            $('chatTitle'); // refresh

            appendSystemMessage(`📎 Document uploaded: **${esc(file.name)}** — I can now answer questions about it.`);
            showToast('Document loaded!', 'success');
        } catch (e) {
            banner.remove();
            showToast('Upload failed: ' + e.message, 'error');
        }
    }

    /* ── Send message ────────────────────────────────────────── */
    async function sendMessage() {
        if (_sending) return;
        const input = $('messageInput');
        const text  = (input.value || '').trim();
        if (!text) return;

        if (!_currentSessionId) {
            await startSession(_currentMode);
            if (!_currentSessionId) return;
        }

        input.value = '';
        autoResize(input);

        appendMessage('user', text);
        scrollToBottom();
        hideSuggestedChips();
        setTyping(true);
        setSendDisabled(true);
        _sending = true;

        try {
            const resp = await window.apiService.sendChatMessage(_currentSessionId, text);
            setTyping(false);
            appendMessage('assistant', resp.message.content, new Date(resp.message.created_at));
            scrollToBottom();
            // Update title in sidebar
            await loadSessions();
        } catch (e) {
            setTyping(false);
            appendMessage('assistant', '⚠️ ' + e.message);
            scrollToBottom();
        } finally {
            _sending = false;
            setSendDisabled(false);
            input.focus();
        }
    }

    function handleKey(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function useChip(el) {
        const input = $('messageInput');
        if (!input) return;
        input.value = el.textContent.trim();
        autoResize(input);
        input.focus();
    }

    /* ── Markdown sanitization pipeline ─────────────────────── */

    /**
     * Normalize raw AI markdown before parsing:
     * - Collapse 3+ consecutive blank lines to max one blank line
     * - Strip trailing whitespace per line
     * - Ensure clean leading/trailing whitespace
     */
    function normalizeMarkdown(text) {
        return String(text)
            .replace(/[ \t]+$/gm, '')      // trailing spaces per line
            .replace(/\n{3,}/g, '\n\n')    // max one blank line between blocks
            .trim();
    }

    /**
     * Render markdown → safe HTML.
     * Runs marked.parse then DOMPurify.sanitize to prevent XSS.
     */
    function renderMarkdown(text) {
        if (typeof marked === 'undefined') return esc(text);
        const raw = marked.parse(normalizeMarkdown(text));
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(raw, {
                ALLOWED_TAGS: [
                    'p','br','strong','em','b','i','u','s',
                    'h1','h2','h3','h4','h5','h6',
                    'ul','ol','li','blockquote','pre','code',
                    'table','thead','tbody','tr','th','td',
                    'a','hr','span',
                ],
                ALLOWED_ATTR: ['href', 'class', 'target', 'rel'],
                FORCE_BODY: false,
                ADD_ATTR: ['target'],
            });
        }
        return raw;
    }

    /**
     * Render inline markdown (no block elements) — used for system messages.
     */
    function renderInline(text) {
        if (typeof marked === 'undefined') return esc(text);
        const raw = marked.parseInline(String(text));
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(raw);
        }
        return raw;
    }

    /* ── Message rendering ───────────────────────────────────── */
    function appendMessage(role, content, date) {
        const container = $('chatMessages');
        if (!container) return;

        const wrapper = document.createElement('div');
        wrapper.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user'
            ? '<i class="fas fa-user"></i>'
            : '<i class="fas fa-robot"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        if (role === 'assistant') {
            bubble.innerHTML = renderMarkdown(content);
            // Open all links in new tab safely
            bubble.querySelectorAll('a').forEach(a => {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            });
            // Render math expressions (KaTeX auto-render runs after DOMPurify)
            if (typeof renderMathInElement !== 'undefined') {
                renderMathInElement(bubble, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true  },
                        { left: '$',  right: '$',  display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true  },
                    ],
                    throwOnError: false,
                });
            }
        } else {
            bubble.textContent = content;
        }

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = (date || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        wrapper.appendChild(time);
        container.appendChild(wrapper);
    }

    function appendSystemMessage(text) {
        const container = $('chatMessages');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'message-system';
        el.innerHTML = renderInline(text);
        container.appendChild(el);
    }

    /* ── Helpers ─────────────────────────────────────────────── */
    function scrollToBottom() {
        const c = $('chatMessages');
        if (c) c.scrollTop = c.scrollHeight;
    }

    function setTyping(visible) {
        const el = $('typingIndicator');
        if (el) el.style.display = visible ? 'flex' : 'none';
    }

    function setSendDisabled(disabled) {
        const btn = $('sendBtn');
        if (btn) btn.disabled = disabled;
    }

    function hideSuggestedChips() {
        const el = $('suggestedChips');
        if (el) el.style.display = 'none';
    }

    function autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }

    /* ── Sidebar toggle ──────────────────────────────────────── */
    function initSidebarToggle() {
        const btn     = $('sidebarToggleBtn');
        const sidebar = $('chatSidebar');
        if (!btn || !sidebar) return;

        btn.addEventListener('click', () => {
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                sidebar.classList.toggle('mobile-open');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    /* ── New chat button ─────────────────────────────────────── */
    function initNewChatBtn() {
        const btn = $('newChatBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            _currentSessionId = null;
            $('chatWelcome').style.display = '';
            $('chatActive').style.display  = 'none';
            highlightSession(null);
        });
    }

    /* ── Public API ──────────────────────────────────────────── */
    window.AiAssistant = {
        startSession,
        openSession,
        setMode,
        deleteSession,
        deleteCurrentSession,
        triggerDocUpload,
        handleDocUpload,
        sendMessage,
        handleKey,
        useChip,
        autoResize,
    };

    /* ── Init ────────────────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        loadSessions();
        initSidebarToggle();
        initNewChatBtn();

        // Configure marked
        if (typeof marked !== 'undefined') {
            marked.setOptions({ breaks: true, gfm: true });
            // Custom renderer: open external links safely
            const renderer = new marked.Renderer();
            renderer.link = ({ href, title, text }) => {
                const safe = href ? href.replace(/javascript:/gi, '') : '#';
                const t = title ? ` title="${esc(title)}"` : '';
                return `<a href="${esc(safe)}"${t} target="_blank" rel="noopener noreferrer">${text}</a>`;
            };
            marked.use({ renderer });
        }
    });
})();
