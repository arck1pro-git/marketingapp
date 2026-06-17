-- Schema das tabelas usadas pelas rotas de carrossel / contexto.
-- Rode uma vez no seu banco Neon (SQL Editor do console ou psql).

CREATE TABLE IF NOT EXISTS context (
  id           SERIAL PRIMARY KEY,
  context_text TEXT NOT NULL DEFAULT '',
  tipo         TEXT UNIQUE  -- 'ari' | 'fabricio'
);

CREATE TABLE IF NOT EXISTS carousel (
  id         SERIAL PRIMARY KEY,
  context_id INTEGER REFERENCES context(id) ON DELETE SET NULL,
  title      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slide (
  id          SERIAL PRIMARY KEY,
  carousel_id INTEGER NOT NULL REFERENCES carousel(id) ON DELETE CASCADE,
  slide_order INTEGER NOT NULL,
  body        TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT ''
);

-- Prompts de auditoria por tipo de roteiro.
CREATE TABLE IF NOT EXISTS auditoria (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  prompt     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roteiros gerados a partir das pautas. tipo = formato ('carrossel' | 'video').
CREATE TABLE IF NOT EXISTS roteiro (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  texto      TEXT NOT NULL,
  tipo       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calendário editorial: um por mês/tipo, com itens por dia.
CREATE TABLE IF NOT EXISTS calendario (
  id             SERIAL PRIMARY KEY,
  nome           TEXT NOT NULL,
  mes            TEXT NOT NULL,        -- 'YYYY-MM'
  posicionamento TEXT,
  tipo           TEXT NOT NULL,        -- 'dados' | 'opinativo' | 'produto'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendario_item (
  id            SERIAL PRIMARY KEY,
  calendario_id INTEGER NOT NULL REFERENCES calendario(id) ON DELETE CASCADE,
  data              DATE NOT NULL,
  conteudo          TEXT NOT NULL,
  tipo              TEXT,  -- 'dados' | 'opinativo' | 'produto' (sorteado por item)
  roteiro_carrossel TEXT,
  roteiro_video     TEXT
);
