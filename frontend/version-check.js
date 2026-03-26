(function () {
    'use strict';

    var POLL_INTERVAL_MS = 60000; // 60 seconds
    var INIT_RETRY_MS = 10000;    // retry baseline fetch every 10s until it succeeds
    var currentVersion = null;

    function injectStyles() {
        var style = document.createElement('style');
        style.textContent = [
            '#vc-banner {',
            '  position: fixed;',
            '  bottom: 24px;',
            '  left: 50%;',
            '  transform: translateX(-50%);',
            '  background: #1a1a2e;',
            '  color: #fff;',
            '  border: 1px solid rgba(255,255,255,0.12);',
            '  border-radius: 12px;',
            '  padding: 12px 20px;',
            '  display: flex;',
            '  align-items: center;',
            '  gap: 16px;',
            '  box-shadow: 0 8px 32px rgba(0,0,0,0.4);',
            '  z-index: 99999;',
            '  font-family: system-ui, sans-serif;',
            '  font-size: 14px;',
            '  white-space: nowrap;',
            '  animation: vc-slide-up 0.3s ease;',
            '}',
            '@keyframes vc-slide-up {',
            '  from { opacity: 0; transform: translateX(-50%) translateY(16px); }',
            '  to   { opacity: 1; transform: translateX(-50%) translateY(0); }',
            '}',
            '#vc-banner-text { flex: 1; }',
            '#vc-reload-btn {',
            '  background: #6366f1;',
            '  color: #fff;',
            '  border: none;',
            '  border-radius: 8px;',
            '  padding: 6px 14px;',
            '  font-size: 13px;',
            '  font-weight: 600;',
            '  cursor: pointer;',
            '  transition: background 0.2s;',
            '}',
            '#vc-reload-btn:hover { background: #4f46e5; }',
            '#vc-dismiss-btn {',
            '  background: none;',
            '  border: none;',
            '  color: rgba(255,255,255,0.5);',
            '  font-size: 18px;',
            '  cursor: pointer;',
            '  line-height: 1;',
            '  padding: 0 2px;',
            '  transition: color 0.2s;',
            '}',
            '#vc-dismiss-btn:hover { color: #fff; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    function showBanner() {
        if (document.getElementById('vc-banner')) return;

        var banner = document.createElement('div');
        banner.id = 'vc-banner';
        banner.innerHTML = [
            '<span id="vc-banner-text">Eine neue Version ist verfügbar.</span>',
            '<button id="vc-reload-btn">Jetzt neu laden</button>',
            '<button id="vc-dismiss-btn" title="Schließen">&#x2715;</button>',
        ].join('');

        document.body.appendChild(banner);

        document.getElementById('vc-reload-btn').addEventListener('click', function () {
            window.location.reload();
        });

        document.getElementById('vc-dismiss-btn').addEventListener('click', function () {
            banner.remove();
        });
    }

    function pollVersion() {
        fetch('/version', { cache: 'no-store' })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.version && data.version !== currentVersion) {
                    showBanner();
                }
            })
            .catch(function () {
                // Silently ignore — don't disrupt the user
            });
    }

    // Fetch baseline version first. Only start polling after baseline is captured.
    // Retries every INIT_RETRY_MS until the server responds.
    function initBaseline() {
        fetch('/version', { cache: 'no-store' })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data.version) throw new Error('no version');
                currentVersion = data.version;
                setInterval(pollVersion, POLL_INTERVAL_MS);
            })
            .catch(function () {
                // Server not ready yet — retry
                setTimeout(initBaseline, INIT_RETRY_MS);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            injectStyles();
            initBaseline();
        });
    } else {
        injectStyles();
        initBaseline();
    }
}());
