document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const authContainer = document.getElementById('auth-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  
  // Form toggles
  const toSignup = document.getElementById('to-signup');
  const toLogin = document.getElementById('to-login');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  // Display variables
  const userDisplay = document.getElementById('user-display');
  const configEditor = document.getElementById('config-editor');
  const saveStatus = document.getElementById('save-status');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');

  // Interactive buttons
  const btnLogout = document.getElementById('btn-logout');
  const btnLoad = document.getElementById('btn-load');
  const btnSave = document.getElementById('btn-save');
  const btnActivate = document.getElementById('btn-activate');
  const phraseDisplay = document.getElementById('phrase-display');

  // Settings modal elements
  const btnSettings = document.getElementById('btn-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const settingLogoUrl = document.getElementById('setting-logo-url');
  const logoImg = document.getElementById('logo-img');
  const navLogoImg = document.getElementById('nav-logo-img');

  let activeSessionToken = null;
  let connectionCheckInterval = null;

  // Create settings button if it doesn't exist
  if (!btnSettings && document.querySelector('.session-info')) {
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'btn-settings';
    settingsBtn.textContent = '⚙️';
    settingsBtn.className = 'btn btn-secondary btn-small';
    settingsBtn.style.marginLeft = '8px';
    document.querySelector('.session-info').appendChild(settingsBtn);
  }

  // --- Branding Logo Management ---
  function applyBrandingLogo() {
    const savedLogo = localStorage.getItem('perc_logo_url');
    if (savedLogo) {
      if (logoImg) {
        logoImg.src = savedLogo;
        logoImg.style.display = 'inline-block';
        const fallbackText = logoImg.nextElementSibling;
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'none';
        }
      }
      if (navLogoImg) {
        navLogoImg.src = savedLogo;
        navLogoImg.style.display = 'inline-block';
        const fallbackText = navLogoImg.nextElementSibling;
        if (fallbackText && fallbackText.classList.contains('logo-fallback-text')) {
          fallbackText.style.display = 'none';
        }
      }
      if (settingLogoUrl) {
        settingLogoUrl.value = savedLogo;
      }
    } else {
      if (logoImg) {
        logoImg.src = 'logo.png';
        logoImg.style.display = 'inline-block';
      }
      if (navLogoImg) {
        navLogoImg.src = 'logo.png';
        navLogoImg.style.display = 'inline-block';
      }
    }
  }

  applyBrandingLogo();

  // Settings modal listeners
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const savedLogo = localStorage.getItem('perc_logo_url') || '';
      if (settingLogoUrl) settingLogoUrl.value = savedLogo;
      if (settingsModal) settingsModal.classList.remove('hidden');
    });
  }

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.add('hidden');
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
      }
    });
  }

  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      const url = settingLogoUrl ? settingLogoUrl.value.trim() : '';
      if (url) {
        localStorage.setItem('perc_logo_url', url);
        showToast('Branding logo custom image applied!', 'success');
      } else {
        localStorage.removeItem('perc_logo_url');
        showToast('Logo reset to default.', 'info');
      }
      applyBrandingLogo();
      if (settingsModal) settingsModal.classList.add('hidden');
    });
  }

  // --- Auth screen toggles ---
  if (toSignup) {
    toSignup.addEventListener('click', (e) => {
      e.preventDefault();
      if (loginForm) loginForm.classList.add('hidden');
      if (signupForm) signupForm.classList.remove('hidden');
      hideAuthToast();
    });
  }

  if (toLogin) {
    toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      if (signupForm) signupForm.classList.add('hidden');
      if (loginForm) loginForm.classList.remove('hidden');
      hideAuthToast();
    });
  }

  // --- Notification System ---
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      // Create toast container if it doesn't exist
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-area';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function showAuthToast(message) {
    const authToast = document.getElementById('auth-toast');
    if (authToast) {
      authToast.textContent = message;
      authToast.classList.remove('hidden');
    } else {
      showToast(message, 'error');
    }
  }

  function hideAuthToast() {
    const authToast = document.getElementById('auth-toast');
    if (authToast) {
      authToast.classList.add('hidden');
    }
  }

  // --- Phrase loader ---
  async function loadRandomPhrase(username) {
    if (!phraseDisplay) return;
    try {
      const res = await fetch('/phrases.txt');
      if (!res.ok) throw new Error('Failed to load phrases');
      const text = await res.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        phraseDisplay.textContent = '"precision is key"';
        return;
      }
      const choice = lines[Math.floor(Math.random() * lines.length)];
      const replaced = choice.replace(/\{user\}/g, username || 'Guest');
      phraseDisplay.textContent = replaced;
    } catch (err) {
      phraseDisplay.textContent = '"precision is key"';
    }
  }

  // --- API Handlers ---
  
  // Submit Login
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthToast();
      
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (!response.ok) {
          showAuthToast(result.error || 'Authentication failed');
          return;
        }

        showToast('Logged in successfully', 'success');
        activeSessionToken = result.user.token;
        initializeDashboard(result.user.username);
      } catch (err) {
        showAuthToast('Failed to connect to the authentication server');
      }
    });
  }

  // Submit Sign Up
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthToast();

      const username = document.getElementById('reg-username').value;
      const password = document.getElementById('reg-password').value;
      const licenseKey = document.getElementById('reg-license').value;

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, licenseKey })
        });

        const result = await response.json();

        if (!response.ok) {
          showAuthToast(result.error || 'Sign up failed');
          return;
        }

        showToast(result.message || 'Account registered!', 'success');
        if (signupForm) signupForm.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
        const loginUsername = document.getElementById('login-username');
        if (loginUsername) loginUsername.value = username;
      } catch (err) {
        showAuthToast('Server connection failure during sign up');
      }
    });
  }

  // Load configuration
  async function loadConfig() {
    try {
      const response = await fetch('/api/config');
      const result = await response.json();
      if (response.ok && configEditor) {
        configEditor.value = result.config;
        if (saveStatus) saveStatus.textContent = 'Last saved version loaded';
        showToast('Configuration loaded successfully', 'success');
      } else {
        showToast(result.error || 'Failed to load configuration', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to server configuration endpoint', 'error');
    }
  }

  // Save configuration
  async function saveConfig() {
    if (!configEditor) return;
    const configData = configEditor.value;

    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });

      const result = await response.json();
      if (response.ok) {
        if (saveStatus) saveStatus.textContent = 'All changes saved to cloud';
        showToast('Configuration saved successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to save configuration', 'error');
      }
    } catch (err) {
      showToast('Connection error during configuration save', 'error');
    }
  }

  // Activate config
  async function activateConfig() {
    if (!configEditor) return;
    const configData = configEditor.value;

    try {
      await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData })
      });

      const response = await fetch('/api/config/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();

      if (response.ok) {
        showToast(`Activated! ${result.connectedClients || 0} executors connected`, 'success');
        updateConnectionStatus();
      } else {
        showToast(result.error || 'Failed to activate config.', 'error');
      }
    } catch (err) {
      showToast('Error communicating activation command', 'error');
    }
  }

  // Poll active connection count
  async function updateConnectionStatus() {
    try {
      const response = await fetch('/api/connections');
      const result = await response.json();
      
      if (response.ok && statusDot && statusText) {
        const count = result.count;
        if (count > 0) {
          statusDot.className = 'status-pulse green';
          statusText.textContent = `${count} Executor Connection${count > 1 ? 's' : ''} Active`;
        } else {
          statusDot.className = 'status-pulse orange';
          statusText.textContent = 'No Executors Connected';
        }
      }
    } catch (err) {
      console.warn("Connection counter request failed");
    }
  }

  // --- Dashboard Setup ---
  function initializeDashboard(username) {
    if (authContainer) authContainer.classList.add('hidden');
    if (dashboardContainer) dashboardContainer.classList.remove('hidden');

    if (userDisplay) userDisplay.textContent = `User: ${username}`;

    loadConfig();
    updateConnectionStatus();
    
    if (connectionCheckInterval) clearInterval(connectionCheckInterval);
    connectionCheckInterval = setInterval(updateConnectionStatus, 5000);
    loadRandomPhrase(username);
  }

  // --- Session Restoration ---
  async function checkSession() {
    try {
      const response = await fetch('/api/auth/session');
      const result = await response.json();

      if (response.ok && result.authenticated) {
        activeSessionToken = result.token;
        initializeDashboard(result.username);
      }
    } catch (err) {
      // No valid session, stay on login page
    }
  }

  // Check session on load
  checkSession();

  // Button listeners
  if (btnLoad) btnLoad.addEventListener('click', loadConfig);
  if (btnSave) btnSave.addEventListener('click', saveConfig);
  if (btnActivate) btnActivate.addEventListener('click', activateConfig);

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        showToast('Logged out successfully', 'success');
        
        activeSessionToken = null;
        if (connectionCheckInterval) {
          clearInterval(connectionCheckInterval);
        }
        
        if (dashboardContainer) dashboardContainer.classList.add('hidden');
        if (authContainer) authContainer.classList.remove('hidden');
        
        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
      } catch (err) {
        showToast('Logout connection error', 'error');
      }
    });
  }

  // Tab completion for textarea
  if (configEditor) {
    const luauCompletions = [
      'false', 'true', 'nil', 'function', 'end', 'local', 'return', 'if', 'then', 
      'elseif', 'else', 'for', 'in', 'while', 'do', 'break', 'repeat', 'until', 
      'and', 'or', 'not', 'table', 'math', 'string', 'pairs', 'ipairs'
    ];

    configEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = configEditor;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);

        const m = before.match(/([A-Za-z_][A-Za-z0-9_]*)$/);
        if (m) {
          const prefix = m[1];
          const candidate = luauCompletions.find(c => c !== prefix && c.startsWith(prefix));
          if (candidate) {
            const newBefore = before.slice(0, -prefix.length) + candidate;
            el.value = newBefore + after;
            const caret = newBefore.length;
            el.setSelectionRange(caret, caret);
            return;
          }
        }

        const newBefore = before + '  ';
        el.value = newBefore + after;
        const caret = newBefore.length;
        el.setSelectionRange(caret, caret);
      }
    });
  }
});
