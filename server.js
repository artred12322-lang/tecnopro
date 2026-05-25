const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const csrfTokens = new Map();
const rateLimitStore = new Map();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 1000;
const CSRF_TOKEN_TTL = 60 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of csrfTokens.entries()) {
        if (expiresAt < now) csrfTokens.delete(token);
    }
    for (const [ip, data] of rateLimitStore.entries()) {
        if (now - data.firstRequestTime > RATE_LIMIT_WINDOW) {
            rateLimitStore.delete(ip);
        }
    }
}, 10 * 60 * 1000);

function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, { count: 1, firstRequestTime: now });
        return next();
    }
    
    const data = rateLimitStore.get(ip);
    
    if (now - data.firstRequestTime > RATE_LIMIT_WINDOW) {
        rateLimitStore.set(ip, { count: 1, firstRequestTime: now });
        return next();
    }
    
    if (data.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({ 
            error: 'Слишком много запросов. Подождите минуту.',
            retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - data.firstRequestTime)) / 1000)
        });
    }
    
    data.count++;
    rateLimitStore.set(ip, data);
    next();
}

function generateCsrfToken() {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, Date.now() + CSRF_TOKEN_TTL);
    return token;
}

function verifyCsrfToken(token, res) {
    if (!token) {
        res.status(403).json({ error: 'CSRF токен отсутствует' });
        return false;
    }
    if (!csrfTokens.has(token)) {
        res.status(403).json({ error: 'Неверный или истёкший CSRF токен' });
        return false;
    }
    return true;
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./database.sqlite');

// Добавляем колонку email если её нет
db.run(`ALTER TABLE requests ADD COLUMN email TEXT`, (err) => {});

db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    model TEXT,
    service TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: generateCsrfToken() });
});

app.get('/api/requests', (req, res) => {
    db.all('SELECT * FROM requests ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/request', rateLimit, (req, res) => {
    const { type, name, phone, email, model, service, message, csrfToken } = req.body;
    
    if (!verifyCsrfToken(csrfToken, res)) return;
    csrfTokens.delete(csrfToken);
    
    if (!name || !phone) {
        return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    const phoneRegex = /^[\d\s\+\(\)\-]{10,20}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: 'Неверный формат телефона' });
    }
    
    db.run(
        `INSERT INTO requests (type, name, phone, email, model, service, message, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
        [type, name, phone, email || '', model || '', service || '', message || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

app.put('/api/request/:id', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE requests SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/request/:id', (req, res) => {
    db.run('DELETE FROM requests WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
    console.log(`Админ-панель: http://localhost:${PORT}/admin.html`);
    console.log(`Пароль для входа: TecnoPro2026Secure!`);
});