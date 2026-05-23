-- ════════════════════════════════════════════════════
--  BuchSammler · Supabase Setup SQL
--  supabase.com → SQL Editor → New Query → Run
-- ════════════════════════════════════════════════════

CREATE TABLE stations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  location    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE books (
  id          BIGSERIAL PRIMARY KEY,
  isbn        TEXT NOT NULL,
  title       TEXT, author TEXT, cover TEXT, year TEXT,
  station_id  TEXT REFERENCES stations(id) ON DELETE CASCADE,
  condition   TEXT DEFAULT 'Gut',
  available   BOOLEAN DEFAULT true,
  added_by    TEXT, user_id TEXT,
  removed_by  TEXT, removed_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(isbn, station_id)
);

CREATE TABLE reservations (
  id          BIGSERIAL PRIMARY KEY,
  isbn        TEXT, title TEXT,
  station_id  TEXT REFERENCES stations(id) ON DELETE CASCADE,
  user_id     TEXT, nick TEXT, note TEXT,
  status      TEXT DEFAULT 'aktiv',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  nick        TEXT, xp INT DEFAULT 0,
  badges      TEXT[] DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feed (
  id           BIGSERIAL PRIMARY KEY,
  type         TEXT, isbn TEXT, title TEXT,
  station_id   TEXT, station_name TEXT,
  nick         TEXT, user_id TEXT, xp INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (öffentlich für App-Nutzer)
ALTER TABLE stations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON stations     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON books        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON users        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON feed         FOR ALL USING (true) WITH CHECK (true);

-- Performance-Indizes
CREATE INDEX idx_books_station ON books(station_id, available);
CREATE INDEX idx_feed_station  ON feed(station_id, created_at DESC);
CREATE INDEX idx_feed_user     ON feed(user_id);
CREATE INDEX idx_users_xp      ON users(xp DESC);
