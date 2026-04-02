// SEEN POINT Frontend Configuration
// For production: replace with your Render.com backend URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://your-render-backend.onrender.com/api';
const WS_URL = API_BASE.replace('https://', 'wss://').replace('http://', 'ws://').replace('/api', '');

// ─── API CLIENT ──────────────────────────────────────────────────────────────

const api = {
    /**
     * Generic fetch wrapper with auth headers + error handling
     */
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('cv_token');
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
            ...options,
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, config);
            const data = await res.json().catch(() => ({
                success: false,
                message: 'Server returned invalid response'
            }));

            if (!res.ok) {
                const err = new Error(data.message || `HTTP ${res.status}`);
                err.status = res.status;
                throw err;
            }

            return data;
        } catch (err) {
            // Network error — backend not running or unreachable
            if (err.name === 'TypeError' && err.message && err.message.includes('fetch')) {
                const netErr = new Error('Cannot reach the SEEN POINT server. Make sure the backend is running on port 5000.');
                netErr.status = 0;
                netErr.isNetworkError = true;
                throw netErr;
            }
            throw err;
        }
    },

    get:    (url, opts)  => api.request(url, { method: 'GET', ...opts }),
    post:   (url, body)  => api.request(url, { method: 'POST', body }),
    put:    (url, body)  => api.request(url, { method: 'PUT', body }),
    delete: (url)        => api.request(url, { method: 'DELETE' }),
};

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

const auth = {
    getToken:   ()     => localStorage.getItem('cv_token'),
    getUser:    ()     => { try { return JSON.parse(localStorage.getItem('cv_user')); } catch { return null; } },
    getProfile: ()     => { try { return JSON.parse(localStorage.getItem('cv_profile')); } catch { return null; } },
    isLoggedIn: ()     => !!localStorage.getItem('cv_token'),
    isAdmin:    ()     => auth.getUser()?.isAdmin === true,

    save(token, user) {
        localStorage.setItem('cv_token', token);
        localStorage.setItem('cv_user', JSON.stringify(user));
    },

    saveProfile(profile) {
        localStorage.setItem('cv_profile', JSON.stringify(profile));
    },

    logout() {
        localStorage.removeItem('cv_token');
        localStorage.removeItem('cv_user');
        localStorage.removeItem('cv_profile');
        window.location.href = '/pages/login.html';
    }
};

// ─── WEBSOCKET CLIENT ─────────────────────────────────────────────────────────

let wsClient = null;
let wsReconnectTimer = null;

function connectWebSocket(onMessage) {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) return;

    wsClient = new WebSocket(WS_URL);

    wsClient.onopen = () => {
        console.log('🔌 WebSocket connected');
        clearTimeout(wsReconnectTimer);
        // Ping every 30s to keep connection alive
        setInterval(() => {
            if (wsClient.readyState === WebSocket.OPEN) {
                wsClient.send(JSON.stringify({ type: 'ping' }));
            }
        }, 30000);
    };

    wsClient.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (onMessage) onMessage(msg);
        } catch { /* ignore */ }
    };

    wsClient.onclose = () => {
        // Auto-reconnect after 5 seconds
        wsReconnectTimer = setTimeout(() => connectWebSocket(onMessage), 5000);
    };

    wsClient.onerror = () => wsClient.close();
}

// ─── UTILITY FUNCTIONS ────────────────────────────────────────────────────────

const utils = {
    /** Format runtime in minutes to "2h 28m" */
    formatRuntime(minutes) {
        if (!minutes) return '';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },

    /** Format large numbers: 125000 → "125K" */
    formatNumber(n) {
        if (!n && n !== 0) return '0';
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
        return n.toString();
    },

    /** Format ISO date to "Jan 2, 2026" */
    formatDate(str) {
        if (!str) return '';
        return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    /** Convert rating (1-10) to star display */
    ratingStars(score, max = 10) {
        const pct = (score / max) * 100;
        return `<span class="rating-stars" style="--pct:${pct}%">★★★★★</span>`;
    },

    /** Debounce a function (for search) */
    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    /** Get genre badge HTML */
    genreBadges(genres = []) {
        return genres.slice(0, 3).map(g =>
            `<span class="genre-badge">${g.name}</span>`
        ).join('');
    },

    /** Progress bar percentage */
    progressPct(progress, total) {
        if (!total) return 0;
        return Math.min(100, Math.round((progress / total) * 100));
    },

    /** Show a toast notification */
    toast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        // Remove after 3.5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    },

    /** Skeleton loader HTML */
    skeletonCard() {
        return `
            <div class="content-card skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        `;
    },

    /** Check if image URL is valid */
    async checkImage(url, fallback = '/assets/images/poster-fallback.jpg') {
        return new Promise(resolve => {
            const img = new Image();
            img.onload  = () => resolve(url);
            img.onerror = () => resolve(fallback);
            img.src = url;
        });
    }
};

// ─── CONTENT CARD BUILDER ─────────────────────────────────────────────────────

function buildContentCard(item, opts = {}) {
    const progress = opts.progress ? `
        <div class="card-progress-bar">
            <div class="card-progress-fill" style="width:${opts.progress}%"></div>
        </div>
    ` : '';

    const inWatchlist = opts.inWatchlist ? 'watchlist-active' : '';

    return `
        <div class="content-card" data-id="${item.id}" data-type="${item.content_type || item.contentType}">
            <div class="card-poster-wrap">
                <img class="card-poster" 
                     src="${item.poster_url || '/assets/images/poster-fallback.jpg'}" 
                     alt="${item.title}"
                     loading="lazy"
                     onerror="this.src='/assets/images/poster-fallback.jpg'">
                <div class="card-overlay">
                    <button class="card-play-btn" onclick="playContent('${item.id}', '${item.content_type || item.contentType}')">
                        <svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
                    </button>
                    <div class="card-actions">
                        <button class="card-action-btn watchlist-btn ${inWatchlist}" 
                                onclick="toggleWatchlist(event,'${item.id}')" 
                                title="Add to Watchlist">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                        </button>
                        <button class="card-action-btn" onclick="openDetail('${item.id}')" title="More Info">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                        </button>
                    </div>
                    <div class="card-hover-info">
                        ${item.avg_rating ? `<span class="rating-badge">★ ${parseFloat(item.avg_rating).toFixed(1)}</span>` : ''}
                        ${item.maturity_rating ? `<span class="maturity-badge">${item.maturity_rating}</span>` : ''}
                    </div>
                </div>
                ${progress}
            </div>
            <div class="card-info">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-meta">
                    ${item.release_year || ''}
                    ${item.duration_min ? ' • ' + utils.formatRuntime(item.duration_min) : ''}
                    ${item.content_type === 'series' || item.contentType === 'series' ? ' • Series' : ''}
                </p>
            </div>
        </div>
    `;
}

// Global helper to open detail page
function openDetail(id) {
    window.location.href = `/pages/detail.html?id=${id}`;
}

// Global helper for play button — opens the full video player
function playContent(id, type) {
    window.location.href = `/pages/player.html?id=${id}&autoplay=true`;
}

// Global watchlist toggle (requires profile)
async function toggleWatchlist(event, contentId) {
    event.stopPropagation();
    if (!auth.isLoggedIn()) {
        utils.toast('Please login to use the watchlist', 'error');
        return;
    }

    const profile = auth.getProfile();
    if (!profile) {
        utils.toast('Please select a profile first', 'error');
        return;
    }

    const btn = event.currentTarget;
    const isActive = btn.classList.contains('watchlist-active');

    try {
        if (isActive) {
            await api.delete(`/user/watchlist/${contentId}?profileId=${profile.id}`);
            btn.classList.remove('watchlist-active');
            utils.toast('Removed from watchlist');
        } else {
            await api.post('/user/watchlist', { profileId: profile.id, contentId });
            btn.classList.add('watchlist-active');
            utils.toast('Added to watchlist ✨', 'success');
        }
    } catch (err) {
        utils.toast(err.message || 'Failed', 'error');
    }
}
