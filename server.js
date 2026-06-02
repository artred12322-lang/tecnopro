const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ===== БАЗА ДАННЫХ =====
const db = new sqlite3.Database('./database.sqlite');

// Создание таблиц
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

// ===== ЗАЩИТА ОТ ДУБЛЕЙ (хранилище последних заявок) =====
const lastRequestByPhone = new Map();

// ===== API: ПОЛУЧИТЬ ВСЕ ЗАЯВКИ =====
app.get('/api/requests', (req, res) => {
    db.all('SELECT * FROM requests ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ===== API: СТАТИСТИКА =====
app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as new_count FROM requests WHERE status = "new"', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ new_count: row.new_count });
    });
});

// ===== API: СОЗДАТЬ ЗАЯВКУ (С ЗАЩИТОЙ ОТ ДУБЛЕЙ) =====
app.post('/api/request', (req, res) => {
    const { type, name, phone, email, model, service, message } = req.body;
    
    // Валидация
    if (!name || !phone) {
        return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    // ЗАЩИТА ОТ ДУБЛЕЙ: один телефон не может отправить больше 1 заявки в 60 секунд
    const now = Date.now();
    const lastTime = lastRequestByPhone.get(phone);
    
    if (lastTime && (now - lastTime) < 60000) {
        // Дубль в течение 60 секунд — возвращаем успех, но не сохраняем
        console.log(`⚠️ Дубль отклонён для ${phone}, прошло ${now - lastTime}мс`);
        return res.json({ success: true, id: null, duplicate: true });
    }
    
    // Запоминаем время отправки
    lastRequestByPhone.set(phone, now);
    
    // Чистим старые записи раз в час (чтобы память не росла)
    if (lastRequestByPhone.size > 1000) {
        const hourAgo = now - 3600000;
        for (const [key, time] of lastRequestByPhone.entries()) {
            if (time < hourAgo) lastRequestByPhone.delete(key);
        }
    }
    
    db.run(
        `INSERT INTO requests (type, name, phone, email, model, service, message, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new')`,
        [type, name, phone, email || '', model || '', service || '', message || ''],
        function(err) {
            if (err) {
                console.error('Ошибка БД:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log(`✅ Заявка ${this.lastID} от ${phone}`);
            res.json({ id: this.lastID, success: true });
        }
    );
});

// ===== API: ОБНОВИТЬ СТАТУС =====
app.put('/api/request/:id', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE requests SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ===== API: УДАЛИТЬ ЗАЯВКУ =====
app.delete('/api/request/:id', (req, res) => {
    db.run('DELETE FROM requests WHERE id = ?', req.params.id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен: http://localhost:${PORT}`);
    console.log(`📍 Админ-панель: http://localhost:${PORT}/admin.html`);
    console.log(`🔑 Пароль: admin123`);
});
