-- ============================================================
-- TacoManagment - Esquema de Base de Datos
-- ============================================================

-- Configuración general del servidor
CREATE TABLE IF NOT EXISTS guild_config (
    guild_id        TEXT PRIMARY KEY,
    staff_role_id   TEXT,
    admin_role_id   TEXT,
    log_channel_id  TEXT,
    transcript_channel_id TEXT,
    ticket_category_id TEXT,
    ticket_counter  INTEGER DEFAULT 0,
    max_tickets_per_user INTEGER DEFAULT 1,
    panel_channel_id TEXT,
    panel_message_id TEXT,
    -- Configuración de moderación (roles mínimos)
    mod_min_role_id TEXT, -- Para warn, timeout, kick
    admin_min_role_id TEXT, -- Para ban, remove-sanction
    suggestions_channel_id TEXT, -- Para el sistema de sugerencias
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Mensajes y textos personalizables
CREATE TABLE IF NOT EXISTS ticket_messages (
    key         TEXT NOT NULL,
    guild_id    TEXT NOT NULL,
    title       TEXT,
    description TEXT,
    color       TEXT DEFAULT '#5865F2',
    footer      TEXT,
    PRIMARY KEY (key, guild_id)
);

-- Departamentos para el Select Menu
CREATE TABLE IF NOT EXISTS departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    emoji       TEXT DEFAULT '📩',
    description TEXT DEFAULT 'Sin descripción',
    form_json   TEXT,
    ticket_count INTEGER DEFAULT 0,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now'))
);

-- Tabla de Sugerencias para historial y estados
CREATE TABLE IF NOT EXISTS suggestions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT NOT NULL,
    channel_id      TEXT NOT NULL,
    message_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    content         TEXT NOT NULL,
    status          TEXT DEFAULT 'pending', -- pending, accepted, denied, indev, implemented
    staff_id        TEXT,
    staff_reason    TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT NOT NULL,
    channel_id      TEXT UNIQUE,
    user_id         TEXT NOT NULL,
    department_id   INTEGER,
    claimed_by      TEXT,
    status          TEXT DEFAULT 'open' CHECK(status IN ('open', 'claimed', 'closed')),
    subject         TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    closed_at       TEXT,
    closed_by       TEXT,
    transcript_url  TEXT,
    rating          INTEGER,
    rating_comment  TEXT,
    close_audit_log_id TEXT,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id    TEXT NOT NULL,
    action      TEXT NOT NULL,
    executor_id TEXT NOT NULL,
    target_id   TEXT,
    details     TEXT,
    timestamp   TEXT DEFAULT (datetime('now'))
);

-- Historial de sanciones (Moderación)
CREATE TABLE IF NOT EXISTS sanctions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    moderator_id    TEXT NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('warn', 'timeout', 'kick', 'ban')),
    reason          TEXT DEFAULT 'Sin razón proporcionada',
    duration        TEXT, -- Para timeouts (ej: 1h, 1d)
    timestamp       TEXT DEFAULT (datetime('now'))
);

-- Baneos Temporales (Tempbans)
CREATE TABLE IF NOT EXISTS temp_bans (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id        TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    unban_at        TEXT NOT NULL, -- ISO Timestamp
    created_at      TEXT DEFAULT (datetime('now'))
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_tickets_guild      ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user       ON tickets(user_id, guild_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_channel    ON tickets(channel_id);
CREATE INDEX IF NOT EXISTS idx_audit_guild        ON audit_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_departments_guild  ON departments(guild_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_user     ON sanctions(user_id, guild_id);
CREATE INDEX IF NOT EXISTS idx_sanctions_guild    ON sanctions(guild_id);


-- ============================================================
-- Modulo de Auditoria (Logs)
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_config (
    guild_id TEXT PRIMARY KEY,
    log_channel_id TEXT,
    -- Mensajes
    log_message_delete INTEGER DEFAULT 0,
    log_message_edit INTEGER DEFAULT 0,
    -- Miembros
    log_member_role_update INTEGER DEFAULT 0,
    log_member_update INTEGER DEFAULT 0,
    -- Canales
    log_channel_create INTEGER DEFAULT 0,
    log_channel_delete INTEGER DEFAULT 0,
    log_channel_update INTEGER DEFAULT 0,
    -- Roles
    log_role_create INTEGER DEFAULT 0,
    log_role_delete INTEGER DEFAULT 0,
    log_role_update INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
