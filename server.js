const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

// Configuration
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_jwt_tokens';

// Default configuration (sacrifice aim assist Lua table)
const DEFAULT_LUA_CONFIG = `getgenv().Perc = {
    ['Settings'] = {
        ['Watermark'] = {
            ['Enabled'] = true,
            ['Color'] = Color3.fromRGB(193, 153, 255),
            ['VersionColor'] = Color3.fromRGB(255, 255, 255)
        }
    },

    ['Checks'] = {
        ['Crew Check'] = false,
        ['Player Visible'] = false,
        ['Player Knocked'] = false,
    },

    ['Aim Assist'] = {
        ['Enabled'] = true,
        ['LegitMode'] = true, 
        ['LegitSpeed'] = 0.1,
        ['Shake'] = {
            ['Enabled'] = false,
            ['Intensity'] = 2,
            ['Speed'] = 2
        },
        ['Smoothing'] = 0.01,
        ['ActivationMode'] = 'Hold',
        ['Mode'] = 'HitPart',
        ['EasingStyle'] = 'Linear',
        ['EasingDirection'] = 'Out',
        ['Part'] = 'Head',
        ['UsePrediction'] = false,
        ['Prediction'] = { ['X'] = 0, ['Y'] = 0, ['Z'] = 0 },
        ['FOV'] = {
            ['Enabled'] = true,
            ['Visible'] = false, 
            ['Radius'] = 999999,
            ['Color'] = Color3.fromRGB(255, 255, 255)
        },
        ['Back Air'] = {
            ['Enabled'] = false,
            ['ActivationMode'] = 'Toggle'
        }
    },

    ['Silent Aim'] = {
        ['Enabled'] = true,
        ['ClientRedirection'] = {
            ['Enabled'] = false,
            ['Settings'] = {
                ['Mask Spread'] = false,
            }
        },
        ['Mode'] = 'HitPart',
        ['Part'] = 'Head',
        ['Smart'] = {
            ['Points'] = 5,
            ['PointScale'] = 0.8,
        },
        ['UsePrediction'] = false,
        ['Prediction'] = { 
            ['X'] = 0,
            ['Y'] = 0, 
            ['Z'] = 0
        },
        ['Future'] = {
            ['Enabled'] = false,
            ['Multiplier'] = 1.0,
            ['NetworkPrediction'] = true,
            ['GroundPrediction'] = true,
            ['BulletSpeed'] = 725,
            ['Default'] = { 
                ['X'] = 0.05, 
                ['Y'] = 0.02, 
                ['Z'] = 0.03
            },
            ['Guns'] = {
                ['[Double-Barrel SG]'] = { 
                    ['X'] = 0.05, 
                    ['Y'] = 0.02, 
                    ['Z'] = 0.03
                },
                ['[Revolver]'] = { 
                    ['X'] = 0.05, 
                    ['Y'] = 0.02, 
                    ['Z'] = 0.03
                },
                ['[TacticalShotgun]'] = { 
                    ['X'] = 0.05, 
                    ['Y'] = 0.02, 
                    ['Z'] = 0.03
                },
            }
        },
        ['Rage'] = {
            ['Enabled'] = false,
        },
        ['FOV'] = {
            ['Enabled'] = true,
            ['Projected'] = false, 
            ['Visible'] = false,
            ['Radius'] = 999999999999,
            ['ActiveColor'] = Color3.fromRGB(0, 255, 0),
            ['InactiveColor'] = Color3.fromRGB(255, 0, 0)
        }
    },

    ['Debug'] = {
        ['Enabled'] = false,
        ['ShowPoints'] = false,
        ['PrintTargets'] = false,
        ['PrintInputs'] = false 
    },

    ['Trigger Bot'] = {
        ['Enabled'] = true,
        ['ActivationMode'] = 'Hold',
        ['Delay'] = 0.01,
        ['Blacklisted Tools'] = { 
            '[Knife]',
        },
        ['FOV'] = {
            ['Enabled'] = true,
            ['Radius'] = 999999999,
        }
    },

    ['Gun Modifications'] = {
        ['Double Tap'] = {
            ['Enabled'] = false,
            ['Weapons'] = { 
                '[Revolver]', 
                '[Double-Barrel SG]'
            },
        },
        ['Quick Reload'] = {
            ['Enabled'] = false,
            ['Weapons'] = { 
                '[Revolver]', 
                '[Double-Barrel SG]',
                '[Tactical Shotgun]'
            },
        },
        ['Spread Modifications'] = {
            ['Enabled'] = true,
            ['Weapons'] = {
                ['[Double-Barrel SG]'] = {
                    ['Enabled'] = true,
                    ['SpreadAmount'] = 0,
                },
                ['[TacticalShotgun]'] = {
                    ['Enabled'] = true,
                    ['SpreadAmount'] = 0,
                },
            },
        },
        ['Cooldown Changer'] = {
            ['Enabled'] = true,
            ['Default'] = 0.15,
            ['Weapons'] = {
                ['[Revolver]'] = { 
                    ['Enabled'] = true, 
                    ['Delay'] = 0.15
                },
                ['[Double-Barrel SG]'] = { 
                    ['Enabled'] = false, 
                    ['Delay'] = 0.05 
                },
                ['[TacticalShotgun]'] = { 
                    ['Enabled'] = false, 
                    ['Delay'] = 0.05 
                },
            }
        },
        ['Shooting Factors'] = {
            ['Enabled'] = true,
            ['Weapons'] = {
                ['[Revolver]'] = true,
                ['[Double-Barrel SG]'] = true,
                ['[TacticalShotgun]'] = true,
            },
            ['Factors'] = {
                ['FULLY_LOADED_CHAR'] = true,
                ['FORCEFIELD'] = true,
                ['GRABBING_CONSTRAINT'] = true,
                ['Christmas_Sock'] = true,
                ['CUFFED'] = true,
                ['ATTACKING'] = true,
                ['K.O'] = false,
                ['GRABBED'] = true,
                ['RELOAD'] = true,
                ['DEAD'] = false,
                ['BLOCK'] = false,
                ['CROUCH'] = false,
                ['COOLDOWN'] = true,
                ['ALL'] = true
            }
        },
        ['Damage Overrider'] = {
            ['Enabled'] = true,
            ['Part'] = 'Head'
        },
        ['One Tap'] = {
            ['Enabled'] = false,
            ['Weapons'] = {
                '[Double-Barrel SG]',
                '[TacticalShotgun]',
            }
        },
        ['Infinite Range'] = {
            ['Enabled'] = true,
            ['Mode'] = 'Bullet TP',
            ['Bullet TP'] = {
                ['Range'] = 9999999999999,
                ['BypassPos'] = 10
            },
            ['Guns'] = {
                ['[Revolver]'] = {
                    ['Enabled'] = true,
                    ['Range'] = 9999
                },
                ['[Double-Barrel SG]'] = {
                    ['Enabled'] = true,
                    ['Range'] = 9999
                },
                ['[TacticalShotgun]'] = {
                    ['Enabled'] = true,
                    ['Range'] = 9999
                }
            }
        },
        ['Hit Offset'] = {
            ['Enabled'] = false,
            ['Default'] = {
                ['X'] = 0,
                ['Y'] = 0,
                ['Z'] = 0,
            },
            ['Weapons'] = {
                ['[Revolver]'] = { ['X'] = 0, ['Y'] = 0, ['Z'] = 0 },
                ['[TacticalShotgun]'] = { ['X'] = 1, ['Y'] = 0, ['Z'] = -1 },
            }
        },
        ['Hitbox Expander'] = {
            ['Enabled'] = true,
            ['Size'] = 10,
        },
    },

    ['Wall Bang'] = {
        ['Enabled'] = true,
        ['Weapons'] = {
            '[Revolver]',
            '[Double-Barrel SG]',
            '[TacticalShotgun]'
        },
    },

    ['Skin Changer'] = {
        ['Enabled'] = false,
        ['Weapons'] = {
            ['[Double-Barrel SG]'] = 'Galaxy',
            ['[Revolver]'] = 'Golden Age',
            ['[TacticalShotgun]'] = 'Galaxy',
            ['[Knife]'] = 'Golden Age Tanto',
        }
    },

    ['Targeting'] = {
        ['Enabled'] = true,
        ['ActivationMode'] = 'Hold',
        ['SelectionFOV'] = 99999999, 
        ['Strict'] = true
    },

    ['Visuals'] = {
        ['ESP'] = {
            ['Enabled'] = true,
            ['Boxes'] = true,
            ['Names'] = true,
            ['Color'] = Color3.fromRGB(255, 255, 255),
            ['Filled'] = false,
            ['FillColor'] = Color3.fromRGB(193, 153, 255),
            ['FillTransparency'] = 0.8,
            ['OutlineThickness'] = 2
        },
        ['TargetLine'] = {
            ['Enabled'] = true,
            ['Color'] = Color3.fromRGB(193, 153, 255)
        }
    },

    ['Movement'] = {
        ['Speed Walk'] = { 
            ['Enabled'] = true, 
            ['Value'] = 700, 
            ['ActivationMode'] = 'Toggle'
        }, 
        ['Jump Boost'] = { 
            ['Enabled'] = false, 
            ['Value'] = 55, 
            ['ActivationMode'] = 'Toggle'
        },
        ['Movement Booster'] = {
            ['Walkspeed'] = {
                ['Enabled'] = true,
                ['Amount'] = 1.1
            },
            ['Jumppower'] = {
                ['Enabled'] = false,
                ['Amount'] = 1
            }
        },
        ['No Slow'] = {
            ['Enabled'] = true,
        },
    },

    ['Morph'] = {
        ['Enabled'] = false,
        ['TargetUsername'] = 'Roblox',
        ['RagdollOnDeath'] = false,
        ['LoadBodyParts'] = false
    },

    ['Identity'] = {
        ['Enabled'] = false,
        ['Username'] = 'Roblox',
        ['DisplayName'] = 'Roblox',
        ['UserId'] = 1
    },

    ['Binds'] = {
        ['Aim Assist Bind'] = Enum.KeyCode.E,
        ['Trigger Bot Bind'] = Enum.KeyCode.E,
        ['TargetingBind'] = Enum.KeyCode.E,
        ['Silent Aim Toggle'] = Enum.KeyCode.V,
        ['Wall Bang Toggle'] = Enum.KeyCode.L,
        ['Speed Walk'] = Enum.KeyCode.X,
        ['Jump Boost'] = Enum.KeyCode.Z,
        ['Cooldown Changer'] = Enum.KeyCode.N,
        ['Back Air Toggle'] = Enum.KeyCode.B
    }
}`;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Missing SUPABASE_URL or SUPABASE_KEY in .env");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ==================== SUPABASE USER HELPERS ====================
async function getUser(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username.toLowerCase())
    .single();
  return error ? null : data;
}

async function getAllUsers() {
  const { data, error } = await supabase.from('users').select('*');
  return error ? [] : data;
}

async function saveUser(user) {
  const { error } = await supabase
    .from('users')
    .upsert(user, { onConflict: 'username' });
  if (error) throw error;
}

async function updateUser(username, updates) {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('username', username.toLowerCase());
  if (error) throw error;
}
// ================================================================

// Middleware
app.use(express.json());
app.use(cookieParser());

// Helmet security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:", supabaseUrl],
      imgSrc: ["'self'", "data:"]
    }
  }
}));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.startsWith('/api/connections'),
  message: { error: 'Too many requests from this IP, please try again later.' }
});

const connectionsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many connection status requests. Please wait a moment.' }
});

app.use('/api/connections', connectionsLimiter);
app.use('/api/', limiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Auth middleware with Supabase
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }
    
    const dbUser = await getUser(user.username);
    if (!dbUser) {
      return res.status(403).json({ error: 'User account not found.' });
    }
    if (dbUser.banned) {
      return res.status(403).json({ error: 'Your account is banned!' });
    }

    req.user = dbUser;
    next();
  });
}

// --- WebSocket Connections ---
const clientConnections = new Map();

server.on('upgrade', (request, socket, head) => {
  console.log(`\n[WS Upgrade Attempt] URL: ${request.url}`);

  let token = null;

  const cookieHeader = request.headers.cookie || '';
  const cookies = cookieHeader.split(';').reduce((acc, c) => {
    const parts = c.split('=');
    if (parts[0]) {
      acc[parts[0].trim()] = (parts[1] || '').trim();
    }
    return acc;
  }, {});
  token = cookies.token;

  if (!token && request.url) {
    const match = request.url.match(/[?&]token=([^&]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) {
    const isLocal = socket.remoteAddress === '127.0.0.1' || socket.remoteAddress === '::1' || socket.remoteAddress === '::ffff:127.0.0.1';
    
    if (isLocal) {
      getAllUsers().then(db => {
        let fallbackUsername = null;
        if (db.length === 1) {
          fallbackUsername = db[0].username;
        } else if (db.length > 1 && global.lastActiveUsername) {
          fallbackUsername = global.lastActiveUsername;
        }

        if (fallbackUsername) {
          getUser(fallbackUsername).then(localUser => {
            if (localUser && !localUser.banned) {
              console.log(`[WS Upgrade Bypass] Localhost connection accepted without token for user: ${localUser.username}`);
              wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request, localUser.username);
              });
              return;
            }
          });
        }
      });
      return;
    }

    console.warn(`[WS Upgrade Rejected] Reason: Missing token`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      console.warn(`[WS Upgrade Rejected] Reason: JWT verification failed.`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    const dbUser = await getUser(user.username);
    if (!dbUser || dbUser.banned) {
      console.warn(`[WS Upgrade Rejected] Reason: User banned or not found.`);
      socket.write('HTTP/1.1 403 Forbidden - Banned\r\n\r\n');
      socket.destroy();
      return;
    }

    console.log(`[WS Upgrade Approved] Upgrading socket for user: ${dbUser.username}`);
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, dbUser.username);
    });
  });
});

wss.on('connection', (ws, request, username) => {
  console.log(`WebSocket client connected for user: ${username}`);
  
  if (!clientConnections.has(username)) {
    clientConnections.set(username, new Set());
  }
  clientConnections.get(username).add(ws);

  ws.on('close', () => {
    console.log(`WebSocket client disconnected for user: ${username}`);
    const userConns = clientConnections.get(username);
    if (userConns) {
      userConns.delete(ws);
      if (userConns.size === 0) {
        clientConnections.delete(username);
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for ${username}:`, err);
  });
});

function broadcastConfigUpdate(username, config) {
  const userConns = clientConnections.get(username);
  let count = 0;
  if (userConns && userConns.size > 0) {
    const payload = JSON.stringify({ type: 'update', config });
    userConns.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
        count++;
      }
    });
  }
  return count;
}

// ==================== API ENDPOINTS ====================

// Registration
app.post('/api/auth/register', async (req, res) => {
  const { username, password, licenseKey } = req.body;

  if (!username || !password || !licenseKey) {
    return res.status(400).json({ error: 'Username, password, and license key are required.' });
  }

  const trimmedUsername = username.trim();
  if (trimmedUsername.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Username (min 3 chars) and password (min 6 chars) requirements not met.' });
  }

  // Check if username exists in Supabase
  const existingUser = await getUser(trimmedUsername);
  if (existingUser) {
    return res.status(400).json({ error: 'Username is already taken.' });
  }

  // Check if license is already used
  const allUsers = await getAllUsers();
  const licenseUsed = allUsers.some(u => u.license === licenseKey.trim());
  if (licenseUsed) {
    return res.status(400).json({ error: 'License key has already been used!' });
  }

  try {
    const { data: licenseData, error: fetchErr } = await supabase
      .from('licenses')
      .select('*')
      .eq('license', licenseKey.trim())
      .single();

    if (fetchErr || !licenseData) {
      return res.status(400).json({ error: 'License Invalid!' });
    }

    if (licenseData.blacklisted) {
      return res.status(400).json({ error: 'License Invalid! Key is blacklisted.' });
    }

    if (!licenseData.discordid) {
      return res.status(400).json({ error: "Your key hasn't been claimed yet!" });
    }

    if (licenseData.cloudclaimed === true) {
      return res.status(400).json({ error: 'This key has already been used!' });
    }

    const { error: updateErr } = await supabase
      .from('licenses')
      .update({ cloudclaimed: true })
      .eq('license', licenseKey.trim());

    if (updateErr) {
      console.error("Supabase update error:", updateErr);
      return res.status(500).json({ error: 'Failed to update license claim status.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    await saveUser({
      username: trimmedUsername,
      password: hashedPassword,
      license: licenseKey.trim(),
      config: DEFAULT_LUA_CONFIG,
      banned: false,
      created_at: new Date().toISOString()
    });

    return res.json({ success: true, message: 'Account registered successfully!' });

  } catch (err) {
    console.error("Register Error:", err);
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = await getUser(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  if (user.banned) {
    return res.status(403).json({ error: 'Your account is banned!' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  try {
    const { data: licenseData } = await supabase
      .from('licenses')
      .select('*')
      .eq('license', user.license)
      .single();

    if (licenseData && licenseData.blacklisted) {
      await updateUser(user.username, { banned: true });
      return res.status(403).json({ error: 'Your account has been banned due to license blacklisting!' });
    }
  } catch (err) {
    console.warn("Failed to check blacklist:", err);
  }

  const token = jwt.sign(
    { username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  global.lastActiveUsername = user.username;

  return res.json({
    success: true,
    user: { username: user.username, token: token }
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully!' });
});

// Check Session
app.get('/api/auth/session', authenticateToken, (req, res) => {
  const token = req.cookies.token;
  global.lastActiveUsername = req.user.username;
  return res.json({
    authenticated: true,
    username: req.user.username,
    token: token
  });
});

// Get Configuration
app.get('/api/config', authenticateToken, (req, res) => {
  return res.json({ config: req.user.config });
});

// Save Configuration
app.post('/api/config/save', authenticateToken, async (req, res) => {
  const { config } = req.body;
  if (config === undefined) {
    return res.status(400).json({ error: 'Configuration string is required.' });
  }

  const trimmed = config.trim();
  const match = trimmed.match(/^getgenv\(\)\.Perc\s*=\s*\{[\s\S]*\}$/);
  if (!match) {
    return res.status(400).json({ error: 'Must be a Perc config' });
  }

  try {
    await updateUser(req.user.username, { config: config });
    return res.json({ success: true, message: 'Configuration saved successfully!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save configuration.' });
  }
});

// Activate Configuration
app.post('/api/config/activate', authenticateToken, async (req, res) => {
  try {
    const user = await getUser(req.user.username);
    if (!user) {
      return res.status(500).json({ error: 'User profile not found.' });
    }

    const activeConnectionsCount = broadcastConfigUpdate(user.username, user.config);
    
    return res.json({
      success: true,
      message: `Configuration activated and transmitted!`,
      connectedClients: activeConnectionsCount
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to activate configuration.' });
  }
});

// Connection count
app.get('/api/connections', authenticateToken, (req, res) => {
  const userConns = clientConnections.get(req.user.username);
  return res.json({ count: userConns ? userConns.size : 0 });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server is running securely on port ${PORT}`);
});