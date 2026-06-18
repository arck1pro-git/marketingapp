ESSE DOCUMENTO CONSTA A ESTRUTURA DO BANCO DE DADOS POSTGRESQL NA PLATAFORMA NEON DATABASE SERVERLESS:

CREATE TABLE context (
    id SERIAL PRIMARY KEY,
    
    context_text TEXT NOT NULL,
    
    tipo TEXT UNIQUE
);


CREATE TABLE carousel (
    id SERIAL PRIMARY KEY,
    
    context_id INTEGER REFERENCES context(id),
    
    title TEXT NOT NULL,
    
    status BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE slide (
    id SERIAL PRIMARY KEY,
    
    carousel_id INTEGER REFERENCES carousel(id) ON DELETE CASCADE,
    
    slide_order INTEGER NOT NULL,
    
    body TEXT NOT NULL,
    
    image_url TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    
    nome TEXT NOT NULL,
    
    prompt TEXT NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE roteiro (
    id SERIAL PRIMARY KEY,
    
    nome TEXT NOT NULL,
    
    texto TEXT NOT NULL,
    
    tipo TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE calendario (
    id SERIAL PRIMARY KEY,
    
    nome TEXT NOT NULL,
    
    mes TEXT NOT NULL,                -- 'YYYY-MM'
    
    posicionamento TEXT,
    
    tipo TEXT NOT NULL,              -- 'dados' | 'opinativo' | 'produto'
    
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE calendario_item (
    id SERIAL PRIMARY KEY,
    
    calendario_id INTEGER REFERENCES calendario(id) ON DELETE CASCADE,
    
    data DATE NOT NULL,
    
    conteudo TEXT NOT NULL,
    
    tipo TEXT,                      -- 'dados' | 'opinativo' | 'produto' (sorteado)
    
    roteiro_carrossel TEXT,
    
    roteiro_video TEXT,
    
    fonte_titulo TEXT,              -- título da matéria usada como base
    
    fonte_url TEXT                  -- link da matéria (Google News → veículo)
);