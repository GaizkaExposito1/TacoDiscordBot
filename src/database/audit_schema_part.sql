
-- Configuración de Auditoría (Logs)
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
