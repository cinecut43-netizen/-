// db/index.js — подключение к PostgreSQL
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shabashka',
  user: process.env.DB_USER || 'shabashka_user',
  password: process.env.DB_PASS || '',
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', function(err) {
  console.error('PostgreSQL pool error:', err.message);
});

// Инициализация схемы при первом запуске
async function initSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('schema.sql не найден, пропускаем');
      return;
    }
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Схема БД инициализирована');
  } catch (err) {
    console.error('❌ Ошибка инициализации схемы:', err.message);
  }
}

// Проверка подключения
async function testConnection() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL подключён:', res.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ PostgreSQL не доступен:', err.message);
    return false;
  }
}

module.exports = { pool, initSchema, testConnection };
