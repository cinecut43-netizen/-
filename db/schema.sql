-- Шабашка — схема базы данных
-- Выполнить один раз при первом запуске

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'worker', -- worker | employer
  company VARCHAR(200),
  avatar_url TEXT,
  rating DECIMAL(3,2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  jobs_done INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  passport_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Заказы
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- move | build | clean | event | other
  emoji VARCHAR(10) DEFAULT '📦',
  pay INTEGER NOT NULL,
  pay_label VARCHAR(50) DEFAULT 'за день',
  people INTEGER DEFAULT 1,
  location VARCHAR(200),
  address VARCHAR(300),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  date VARCHAR(100),
  urgent BOOLEAN DEFAULT false,
  allow_bargain BOOLEAN DEFAULT false,
  status VARCHAR(30) DEFAULT 'new', -- new | has_responses | selected | on_the_way | in_progress | done | cancelled
  selected_worker_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Отклики
CREATE TABLE IF NOT EXISTS responses (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES users(id),
  proposed_pay INTEGER,
  message TEXT,
  status VARCHAR(30) DEFAULT 'pending', -- pending | accepted | rejected
  created_at TIMESTAMP DEFAULT NOW()
);

-- Сообщения чата
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id),
  sender_id INTEGER REFERENCES users(id),
  receiver_id INTEGER REFERENCES users(id),
  text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Отзывы
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id),
  reviewer_id INTEGER REFERENCES users(id),
  target_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  text TEXT,
  type VARCHAR(20), -- worker | employer
  created_at TIMESTAMP DEFAULT NOW()
);

-- Избранное
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  job_id INTEGER REFERENCES jobs(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Отзывы и обращения пользователей
CREATE TABLE IF NOT EXISTS feedbacks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  type VARCHAR(50),
  rating INTEGER,
  text TEXT,
  page VARCHAR(200),
  answer TEXT,
  answered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SMS коды верификации
CREATE TABLE IF NOT EXISTS sms_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id);
CREATE INDEX IF NOT EXISTS idx_responses_job ON responses(job_id);
CREATE INDEX IF NOT EXISTS idx_responses_worker ON responses(worker_id);
CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Тестовые данные (удали перед продакшном)
INSERT INTO users (phone, name, role, company, rating, jobs_done, verified) VALUES
  ('+79001234567', 'Тест Работодатель', 'employer', 'Семья Петровых', 4.8, 5, true),
  ('+79009876543', 'Дмитрий Козлов', 'worker', null, 4.9, 12, true)
ON CONFLICT (phone) DO NOTHING;
