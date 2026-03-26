const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Supabase PostgreSQL Setup - Fallback to provided JX3_Guatain connection if env not set
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.unapiwajmgqqtdkixaab:NpQ-gEw8jLPL44A@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
    try {
        // Articles Table
        await pool.query(`CREATE TABLE IF NOT EXISTS JX3_Articles (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            slug TEXT UNIQUE,
            summary TEXT,
            content TEXT,
            author TEXT DEFAULT 'Admin',
            created_at TEXT,
            is_hidden INTEGER DEFAULT 0
        );`);
        
        // Comments Table
        await pool.query(`CREATE TABLE IF NOT EXISTS JX3_Comments (
            id TEXT PRIMARY KEY,
            article_id TEXT,
            author_name TEXT,
            content TEXT,
            time TEXT,
            likes INTEGER DEFAULT 0,
            isHidden INTEGER DEFAULT 0
        );`);
        
        console.log("✅ Supabase PostgreSQL Connected & (JX3 Tables) Initialized");
    } catch(e) {
        console.error("DB Init Error:", e);
    }
};
initDB();

// Utility: Format Time (UTC+8)
const getCurrentFormattedTime = () => {
    const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const p = n => n.toString().padStart(2, '0');
    return `${d.getUTCFullYear()}/${p(d.getUTCMonth()+1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};

const generateID = (prefix = '') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 5)}`;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// --- APIs ---

// 1. Get Article List
app.get('/api/articles', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT id, title, slug, summary, author, created_at FROM JX3_Articles WHERE is_hidden = 0 ORDER BY created_at DESC`);
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 2. Get Single Article
app.get('/api/articles/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM JX3_Articles WHERE (id = $1 OR slug = $1) AND is_hidden = 0`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Article not found" });
        res.json(rows[0]);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 3. Get Comments for an Article
app.get('/api/articles/:id/comments', async (req, res) => {
    try {
        const { rows } = await pool.query(`SELECT * FROM JX3_Comments WHERE article_id = $1 AND isHidden = 0 ORDER BY time ASC`, [req.params.id]);
        res.json(rows);
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// 4. Post a Comment
app.post('/api/comments', async (req, res) => {
    const { article_id, author_name, content } = req.body;
    if (!content || !article_id) return res.status(400).json({ error: "Required fields missing" });
    const id = generateID('comment');
    const time = getCurrentFormattedTime();
    try {
        await pool.query(`INSERT INTO JX3_Comments (id, article_id, author_name, content, time) VALUES ($1, $2, $3, $4, $5)`, 
            [id, article_id, author_name || '江湖俠士', content, time]);
        res.json({ success: true, id });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Admin Auth Middleware
const authAdmin = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login === (process.env.ADMIN_USER || 'admin') && password === (process.env.ADMIN_PASS || 'JX3_ADMIN_2026')) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="JX3 Blog Admin"');
    res.status(401).send('Unauthorized');
};

// 5. Admin: Create Article
app.post('/api/admin/articles', authAdmin, async (req, res) => {
    const { title, slug, summary, content } = req.body;
    const id = generateID('post');
    const time = getCurrentFormattedTime();
    try {
        await pool.query(`INSERT INTO JX3_Articles (id, title, slug, summary, content, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, 
            [id, title, slug || id, summary, content, time]);
        res.json({ success: true, id });
    } catch(e) { res.status(500).json({ error: e.message }); }
});

// Ping for Render keep-alive
app.get('/api/ping', (req, res) => res.send('pong'));
const RenderURL = process.env.RENDER_EXTERNAL_URL;
if (RenderURL) {
    setInterval(async () => {
        try { await fetch(`${RenderURL}/api/ping`); } catch (e) {}
    }, 5 * 60 * 1000);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ JX3 Blog Server listening on port ${PORT}`));
