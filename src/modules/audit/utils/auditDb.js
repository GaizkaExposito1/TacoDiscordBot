const { getDatabase } = require('../../../database/database');

/**
 * Obtiene la configuración de auditoría para un servidor.
 * @param {string} guildId 
 */
function getAuditConfig(guildId) {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM audit_config WHERE guild_id = ?');
    return stmt.get(guildId);
}

/**
 * Crea o actualiza la configuración de un canal de logs.
 * @param {string} guildId 
 * @param {string} channelId 
 */
function setLogChannel(guildId, channelId) {
    const db = getDatabase();
    const existing = getAuditConfig(guildId);
    if (existing) {
        const stmt = db.prepare("UPDATE audit_config SET log_channel_id = ?, updated_at = datetime('now') WHERE guild_id = ?");
        stmt.run(channelId, guildId);
    } else {
        const stmt = db.prepare('INSERT INTO audit_config (guild_id, log_channel_id) VALUES (?, ?)');
        stmt.run(guildId, channelId);
    }
}

/**
 * Activa o desactiva un evento de auditoría.
 * @param {string} guildId 
 * @param {string} eventKey Clave de la columna en la DB (ej: log_message_delete)
 * @param {boolean} enabled 
 */
function toggleAuditEvent(guildId, eventKey, enabled) {
    const db = getDatabase();
    // Validar que la columna existe (seguridad básica)
    const validColumns = [
        'log_message_delete', 'log_message_edit',
        'log_member_role_update', 'log_member_update', 
        'log_channel_create', 'log_channel_delete', 'log_channel_update',
        'log_role_create', 'log_role_delete', 'log_role_update'
    ];

    if (!validColumns.includes(eventKey)) {
        throw new Error(`Columna de auditoría inválida: ${eventKey}`);
    }

    const existing = getAuditConfig(guildId);
    const val = enabled ? 1 : 0;

    if (existing) {
        const stmt = db.prepare(`UPDATE audit_config SET ${eventKey} = ?, updated_at = datetime('now') WHERE guild_id = ?`);
        stmt.run(val, guildId);
    } else {
        // Crear row con ese valor activado
        const stmt = db.prepare(`INSERT INTO audit_config (guild_id, ${eventKey}) VALUES (?, ?)`);
        stmt.run(guildId, val);
    }
}

/**
 * Activa o desactiva TODOS los eventos.
 * @param {string} guildId 
 * @param {boolean} enabled 
 */
function toggleAllAuditEvents(guildId, enabled) {
    const db = getDatabase();
    const val = enabled ? 1 : 0;
    const existing = getAuditConfig(guildId);
    
    if (existing) {
        const stmt = db.prepare(`
            UPDATE audit_config SET 
                log_message_delete = ?, log_message_edit = ?,
                log_member_role_update = ?, log_member_update = ?,
                log_channel_create = ?, log_channel_delete = ?, log_channel_update = ?,
                log_role_create = ?, log_role_delete = ?, log_role_update = ?,
                updated_at = datetime('now') 
            WHERE guild_id = ?
        `);
        stmt.run(val, val, val, val, val, val, val, val, val, val, guildId);
    } else {
        const stmt = db.prepare(`
            INSERT INTO audit_config (
                guild_id, 
                log_message_delete, log_message_edit,
                log_member_role_update, log_member_update,
                log_channel_create, log_channel_delete, log_channel_update,
                log_role_create, log_role_delete, log_role_update
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(guildId, val, val, val, val, val, val, val, val, val, val);
    }
}

module.exports = {
    getAuditConfig,
    setLogChannel,
    toggleAuditEvent,
    toggleAllAuditEvents
};
