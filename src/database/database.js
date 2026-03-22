const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger'); // Importamos el logger

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'taco.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
const configCache = new Map(); // Cache en memoria para configuraciones

/**
 * Inicializa la base de datos (se llama una vez al arrancar).
 */
function initDatabase() {
    if (db) return db;

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        logger.info(`[DB] Directorio de datos creado: ${DATA_DIR}`);
    }

    // Inicializar conexión Better-SQLite3
    try {
        db = new Database(DB_PATH, { verbose: (msg) => logger.debug(`[SQL] ${msg}`) });
        
        // OPTIMIZACIÓN: Activar modo WAL (Write-Ahead Logging)
        // Permite escritura concurrente y evita bloqueos (database locked).
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        // Aplicar esquema si corresponde
        if (fs.existsSync(SCHEMA_PATH)) {
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
            db.exec(schema);
        }

        // Migración manual para columnas nuevas (rating)
        const columns = db.pragma('table_info(tickets)');
        if (!columns.some(c => c.name === 'rating')) {
            logger.info('[DB] Agregando columnas de rating a tabla tickets...');
            try {
                db.prepare('ALTER TABLE tickets ADD COLUMN rating INTEGER').run();
                db.prepare('ALTER TABLE tickets ADD COLUMN rating_comment TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columnas de rating:', e);
            }
        }

        if (!columns.some(c => c.name === 'close_audit_log_id')) {
            logger.info('[DB] Agregando columna close_audit_log_id a tabla tickets...');
            try {
                db.prepare('ALTER TABLE tickets ADD COLUMN close_audit_log_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna close_audit_log_id:', e);
            }
        }

        const configColumns = db.pragma('table_info(guild_config)');
        if (!configColumns.some(c => c.name === 'suggestions_channel_id')) {
            logger.info('[DB] Agregando columna suggestions_channel_id a tabla guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN suggestions_channel_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna suggestions_channel_id:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'suggestions_accepted_id')) {
            logger.info('[DB] Agregando columna suggestions_accepted_id a tabla guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN suggestions_accepted_id TEXT').run();
                db.prepare('ALTER TABLE guild_config ADD COLUMN suggestions_denied_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columnas de log de sugerencias:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'updates_channel_id')) {
            logger.info('[DB] Agregando columna updates_channel_id a tabla guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN updates_channel_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna updates_channel_id:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'welcome_channel_id')) {
            logger.info('[DB] Agregando columnas de bienvenida/despedida a guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN welcome_channel_id TEXT').run();
                db.prepare('ALTER TABLE guild_config ADD COLUMN welcome_message TEXT').run();
                db.prepare('ALTER TABLE guild_config ADD COLUMN goodbye_message TEXT').run();
                db.prepare('ALTER TABLE guild_config ADD COLUMN welcome_enabled INTEGER DEFAULT 1').run();
                db.prepare('ALTER TABLE guild_config ADD COLUMN goodbye_enabled INTEGER DEFAULT 1').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columnas de bienvenida:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'mod_min_role_id')) {
            logger.info('[DB] Agregando columnas mod_min_role_id y admin_min_role_id a guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN mod_min_role_id TEXT').run();
                db.prepare('ALTER TABLE guild_config ADD COLUMN admin_min_role_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columnas de roles de moderación:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'op_min_role_id')) {
            logger.info('[DB] Agregando columna op_min_role_id a guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN op_min_role_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna op_min_role_id:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'ticket_counter_mode')) {
            logger.info('[DB] Agregando columna ticket_counter_mode a guild_config...');
            try {
                db.prepare("ALTER TABLE guild_config ADD COLUMN ticket_counter_mode TEXT DEFAULT 'category'").run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna ticket_counter_mode:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'silenciado_role_id')) {
            logger.info('[DB] Agregando columna silenciado_role_id a guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN silenciado_role_id TEXT').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna silenciado_role_id:', e);
            }
        }

        if (!configColumns.some(c => c.name === 'max_tickets_per_user')) {
            logger.info('[DB] Agregando columna max_tickets_per_user a guild_config...');
            try {
                db.prepare('ALTER TABLE guild_config ADD COLUMN max_tickets_per_user INTEGER DEFAULT 1').run();
            } catch (e) {
                logger.error('[DB] Error al agregar columna max_tickets_per_user:', e);
            }
        }
        try {
            db.exec(`
                CREATE TABLE IF NOT EXISTS welcome_roles (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    role_id  TEXT NOT NULL,
                    UNIQUE(guild_id, role_id)
                );
            `);
        } catch (e) {
            logger.error('[DB] Error al crear tabla welcome_roles:', e);
        }

        // Crear tabla de sanciones (Moderación)
        try {
            db.exec(`
                CREATE TABLE IF NOT EXISTS suggestions (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id        TEXT NOT NULL,
                    channel_id      TEXT NOT NULL,
                    message_id      TEXT NOT NULL,
                    user_id         TEXT NOT NULL,
                    content         TEXT NOT NULL,
                    status          TEXT DEFAULT 'pending',
                    staff_id        TEXT,
                    staff_reason    TEXT,
                    created_at      TEXT DEFAULT (datetime('now')),
                    updated_at      TEXT DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS sanctions (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id        TEXT NOT NULL,
                    user_id         TEXT NOT NULL,
                    moderator_id    TEXT NOT NULL,
                    type            TEXT NOT NULL CHECK(type IN ('warn', 'timeout', 'kick', 'ban')),
                    reason          TEXT DEFAULT 'Sin razón proporcionada',
                    duration        TEXT,
                    status          TEXT DEFAULT 'active', -- active, revoked, expired
                    timestamp       TEXT DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS temp_bans (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id        TEXT NOT NULL,
                    user_id         TEXT NOT NULL,
                    unban_at        TEXT NOT NULL,
                    created_at      TEXT DEFAULT (datetime('now'))
                );
                CREATE TABLE IF NOT EXISTS perm_timeouts (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id     TEXT NOT NULL,
                    user_id      TEXT NOT NULL,
                    reason       TEXT,
                    last_applied TEXT DEFAULT (datetime('now')),
                    UNIQUE(guild_id, user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_sanctions_user ON sanctions(user_id, guild_id);
                CREATE INDEX IF NOT EXISTS idx_sanctions_guild ON sanctions(guild_id);
            `);

            // Migración manual para sanciones existentes
            const sanctionCols = db.pragma('table_info(sanctions)');
            if (!sanctionCols.some(c => c.name === 'status')) {
                logger.info('[DB] Agregando columna status a tabla sanctions...');
                db.prepare("ALTER TABLE sanctions ADD COLUMN status TEXT DEFAULT 'active'").run();
            }
        } catch (e) {
            logger.error('[DB] Error al crear tabla de sanciones:', e);
        }

        logger.info('[DB] Base de datos inicializada correctamente (better-sqlite3).');

        // ── Backups automáticos (solo cuando el bot realmente arranca) ──
        backupDatabase();
        setInterval(() => {
            backupDatabase();
        }, BACKUP_INTERVAL_MS);

    } catch (err) {
        logger.error('[DB] Error fatal al inicializar la base de datos:', err);
        process.exit(1);
    }
    
    return db;
}

/**
 * Retorna la instancia de la DB.
 */
function getDatabase() {
    if (!db) initDatabase();
    return db;
}

/** 
 * Compatibilidad con código anterior: No hace falta guardar manualmente en better-sqlite3 
 * ya que escribe en disco sincrónicamente.
 */
function saveDatabaseSync() {
    // No-op
}

// ─── Helpers SQL ───

function queryOne(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        return stmt.get(params);
    } catch (error) {
        logger.error(`[DB Error] queryOne: ${sql}`, error);
        throw error;
    }
}

function queryAll(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        return stmt.all(params);
    } catch (error) {
        logger.error(`[DB Error] queryAll: ${sql}`, error);
        throw error;
    }
}

function run(sql, params = []) {
    try {
        const stmt = db.prepare(sql);
        return stmt.run(params);
    } catch (error) {
        logger.error(`[DB Error] run: ${sql}`, error);
        throw error;
    }
}


// ============================================================
// GUILD CONFIG
// ============================================================

/**
 * Obtiene la configuración de un servidor (con caché).
 */
function getGuildConfig(guildId) {
    // 1. Revisar caché
    if (configCache.has(guildId)) {
        return configCache.get(guildId);
    }

    // 2. Si no, consultar DB
    let config = queryOne('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    if (!config) {
        run('INSERT INTO guild_config (guild_id) VALUES (?)', [guildId]);
        config = queryOne('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    }

    // 3. Guardar en caché
    configCache.set(guildId, config);
    return config;
}

function updateGuildConfig(guildId, field, value) {
    const allowed = [
        'staff_role_id', 'admin_role_id', 'log_channel_id', 'ticket_category_id', 
        'max_tickets_per_user', 'panel_channel_id', 'panel_message_id', 
        'transcript_channel_id', 'mod_min_role_id', 'admin_min_role_id', 'op_min_role_id',
        'suggestions_channel_id', 'suggestions_accepted_id', 'suggestions_denied_id',
        'updates_channel_id',
        'welcome_channel_id', 'welcome_message', 'goodbye_message',
        'welcome_enabled', 'goodbye_enabled',
        'ticket_counter_mode', 'silenciado_role_id',
    ];
    if (!allowed.includes(field)) throw new Error(`Campo no permitido: ${field}`);
    
    run(`UPDATE guild_config SET ${field} = ?, updated_at = datetime('now') WHERE guild_id = ?`, [value, guildId]);
    
    // Invalidar caché (o actualizarlo)
    const freshConfig = queryOne('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    configCache.set(guildId, freshConfig);
    
    return freshConfig;
}

function setPanelReference(guildId, channelId, messageId) {
    run(`UPDATE guild_config SET panel_channel_id = ?, panel_message_id = ?, updated_at = datetime('now') WHERE guild_id = ?`, [channelId, messageId, guildId]);
    
    // Actualizar caché
    const freshConfig = queryOne('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    configCache.set(guildId, freshConfig);
}

function getPanelReference(guildId) {
    const config = getGuildConfig(guildId); // Usa caché
    if (!config.panel_channel_id || !config.panel_message_id) return null;
    return { channelId: config.panel_channel_id, messageId: config.panel_message_id };
}

function incrementTicketCounter(guildId) {
    run(`UPDATE guild_config SET ticket_counter = ticket_counter + 1, updated_at = datetime('now') WHERE guild_id = ?`, [guildId]);
    
    // Actualizar caché para que el siguiente ticket tenga el contador correcto si se lee del config
    const freshConfig = queryOne('SELECT * FROM guild_config WHERE guild_id = ?', [guildId]);
    configCache.set(guildId, freshConfig);
    
    return freshConfig.ticket_counter;
}

function getStaffStats(guildId, staffId, days = null) {
    let claimedQuery = "SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND claimed_by = ?";
    let closedQuery = "SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND closed_by = ?";
    let ratingQuery = "SELECT AVG(rating) as avg, COUNT(rating) as count FROM tickets WHERE guild_id = ? AND (claimed_by = ? OR closed_by = ?) AND rating IS NOT NULL";

    let timeParams = [];

    if (days) {
        const timeFilter = ` AND created_at >= datetime('now', '-${days} days')`;
        claimedQuery += timeFilter;
        closedQuery = "SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND closed_by = ?" + ` AND closed_at >= datetime('now', '-${days} days')`;
        ratingQuery = "SELECT AVG(rating) as avg, COUNT(rating) as count FROM tickets WHERE guild_id = ? AND (claimed_by = ? OR closed_by = ?) AND rating IS NOT NULL" + ` AND closed_at >= datetime('now', '-${days} days')`;
    }

    const claimed = queryOne(claimedQuery, [guildId, staffId]).count;
    const closed = queryOne(closedQuery, [guildId, staffId]).count;
    const ratingData = queryOne(ratingQuery, [guildId, staffId, staffId]);

    return {
        claimed,
        closed,
        ratingAvg: ratingData?.avg || 0,
        ratingCount: ratingData?.count || 0
    };
}


function incrementDepartmentTicketCount(id, guildId) {
    run(`UPDATE departments SET ticket_count = ticket_count + 1 WHERE id = ? AND guild_id = ?`, [id, guildId]);
    return queryOne('SELECT ticket_count FROM departments WHERE id = ? AND guild_id = ?', [id, guildId]);
}

function decrementDepartmentTicketCount(id, guildId) {
    run(`UPDATE departments SET ticket_count = ticket_count - 1 WHERE id = ? AND guild_id = ?`, [id, guildId]);
    return queryOne('SELECT ticket_count FROM departments WHERE id = ? AND guild_id = ?', [id, guildId]);
}


// ============================================================
// TICKET MESSAGES
// ============================================================

function getTicketMessage(guildId, key) {
    return queryOne('SELECT * FROM ticket_messages WHERE guild_id = ? AND key = ?', [guildId, key]);
}

function setTicketMessage(guildId, key, { title, description, color, footer }) {
    const existing = getTicketMessage(guildId, key);
    if (existing) {
        run(`UPDATE ticket_messages SET title = ?, description = ?, color = ?, footer = ? WHERE guild_id = ? AND key = ?`,
            [title ?? existing.title, description ?? existing.description, color ?? existing.color, footer ?? existing.footer, guildId, key]);
    } else {
        run(`INSERT INTO ticket_messages (key, guild_id, title, description, color, footer) VALUES (?, ?, ?, ?, ?, ?)`,
            [key, guildId, title ?? '', description ?? '', color ?? '#5865F2', footer ?? '']);
    }
    return getTicketMessage(guildId, key);
}


// ============================================================
// DEPARTMENTS
// ============================================================

function getDepartments(guildId) {
    return queryAll('SELECT * FROM departments WHERE guild_id = ? AND is_active = 1', [guildId]);
}

function addDepartment(guildId, name, emoji, description) {
    run('INSERT INTO departments (guild_id, name, emoji, description) VALUES (?, ?, ?, ?)', [guildId, name, emoji, description]);
    return queryOne('SELECT * FROM departments WHERE guild_id = ? ORDER BY id DESC LIMIT 1', [guildId]);
}

function updateDepartmentForm(id, guildId, formJson) {
    run('UPDATE departments SET form_json = ? WHERE id = ? AND guild_id = ?', [formJson, id, guildId]);
}

function removeDepartment(id, guildId) {
    run('UPDATE departments SET is_active = 0 WHERE id = ? AND guild_id = ?', [id, guildId]);
}


// ============================================================
// TICKETS
// ============================================================

function createTicket(guildId, channelId, userId, departmentId, subject, preAssignedNumber = null) {
    const ticketNumber = preAssignedNumber !== null ? preAssignedNumber : incrementTicketCounter(guildId);
    run(`INSERT INTO tickets (guild_id, channel_id, user_id, department_id, subject) VALUES (?, ?, ?, ?, ?)`,
        [guildId, channelId, userId, departmentId, subject]);
    const ticket = queryOne('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
    return { ...ticket, number: ticketNumber };
}

function getTicketById(id) {
    return queryOne('SELECT * FROM tickets WHERE id = ?', [id]);
}

function getTicketByChannel(channelId) {
    return queryOne('SELECT * FROM tickets WHERE channel_id = ?', [channelId]);
}

function getOpenTicketsByUser(guildId, userId) {
    return queryAll("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status != 'closed'", [guildId, userId]);
}

function claimTicket(channelId, staffId) {
    run("UPDATE tickets SET claimed_by = ?, status = 'claimed' WHERE channel_id = ?", [staffId, channelId]);
    return getTicketByChannel(channelId);
}

function unclaimTicket(channelId) {
    run("UPDATE tickets SET claimed_by = NULL, status = 'open' WHERE channel_id = ?", [channelId]);
    return getTicketByChannel(channelId);
}

function closeTicket(channelId, closedBy) {
    run("UPDATE tickets SET status = 'closed', closed_by = ?, closed_at = datetime('now') WHERE channel_id = ?", [closedBy, channelId]);
    return getTicketByChannel(channelId);
}

function setTranscriptUrl(channelId, url) {
    run('UPDATE tickets SET transcript_url = ? WHERE channel_id = ?', [url, channelId]);
}

function setCloseAuditLogId(channelId, messageId) {
    run('UPDATE tickets SET close_audit_log_id = ? WHERE channel_id = ?', [messageId, channelId]);
}

function updateTicketRating(ticketId, rating, comment = null) {
    if (comment !== null && rating !== null) {
        run('UPDATE tickets SET rating = ?, rating_comment = ? WHERE id = ?', [rating, comment, ticketId]);
    } else if (rating !== null) {
        run('UPDATE tickets SET rating = ? WHERE id = ?', [rating, ticketId]);
    } else if (comment !== null) {
        run('UPDATE tickets SET rating_comment = ? WHERE id = ?', [comment, ticketId]);
    }
}

// ============================================================
// AUDIT LOGS
// ============================================================

function addAuditLog(guildId, action, executorId, targetId, details) {
    run(`INSERT INTO audit_logs (guild_id, action, executor_id, target_id, details) VALUES (?, ?, ?, ?, ?)`,
        [guildId, action, executorId, targetId, details]);
}

function getAuditLogs(guildId, limit = 25) {
    return queryAll('SELECT * FROM audit_logs WHERE guild_id = ? ORDER BY id DESC LIMIT ?', [guildId, limit]);
}

/**
 * Obtiene estadísticas de tickets para un servidor.
 */
function getTicketStats(guildId) {
    const config = getGuildConfig(guildId);
    const totalCreated = config ? config.ticket_counter : 0;

    const currentOpen = queryOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status IN ('open', 'claimed')", [guildId]).count;
    const closed = queryOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'closed'", [guildId]).count;

    // Detailed stats
    const historicClaimed = queryOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND claimed_by IS NOT NULL", [guildId]).count;
    const historicUnclaimed = queryOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND claimed_by IS NULL", [guildId]).count;
    
    const currentClaimed = queryOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'claimed'", [guildId]).count;
    const currentUnclaimed = queryOne("SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND status = 'open'", [guildId]).count;

    return {
        total: totalCreated,
        currentOpen,
        closed,
        historicClaimed,
        historicUnclaimed,
        currentClaimed,
        currentUnclaimed
    };
}

/**
 * Obtiene estadísticas de un miembro del staff.
 * @param {string} guildId - ID del servidor.
 * @param {string} staffId - ID del usuario.
 * @param {string|null} days - Número de días para filtrar (null para histórico completo).
 */
function getStaffStats(guildId, staffId, days = null) {
    let claimedQuery = "SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND claimed_by = ?";
    let closedQuery = "SELECT COUNT(*) as count FROM tickets WHERE guild_id = ? AND closed_by = ?";
    let ratingQuery = "SELECT AVG(rating) as avg, COUNT(rating) as count FROM tickets WHERE guild_id = ? AND (claimed_by = ? OR closed_by = ?) AND rating IS NOT NULL";
    
    const params = [guildId, staffId];
    // Para rating necesitamos repetir staffId porque se usa dos veces en el OR
    const ratingParams = [guildId, staffId, staffId];

    if (days) {
        const timeFilter = ` AND created_at >= datetime('now', '-${days} days')`;
        claimedQuery += timeFilter;
        // Para cerrados usamos closed_at
        closedQuery += ` AND closed_at >= datetime('now', '-${days} days')`;
        // Para rating usamos created_at o closed_at, usaremos closed_at ya que la valoración es post-cierre
        ratingQuery += ` AND closed_at >= datetime('now', '-${days} days')`;
    }

    const claimed = queryOne(claimedQuery, params).count;
    const closed = queryOne(closedQuery, params).count;
    const ratingData = queryOne(ratingQuery, ratingParams);

    return {
        claimed,
        closed,
        ratingAvg: ratingData.avg || 0,
        ratingCount: ratingData.count || 0
    };
}

/**
 * Obtiene las últimas valoraciones de tickets.
 * @param {string} guildId
 * @param {number} limit
 */
function getLatestRatings(guildId, limit = 10, staffId = null) {
    let sql = "SELECT * FROM tickets WHERE guild_id = ? AND rating IS NOT NULL";
    const params = [guildId];

    if (staffId) {
        sql += " AND (claimed_by = ? OR closed_by = ?)";
        params.push(staffId, staffId);
    }
    
    sql += " ORDER BY closed_at DESC LIMIT ?";
    params.push(limit);

    return queryAll(sql, params);
}

// ============================================================
// SUGGESTIONS
// ============================================================

function createSuggestionRecord(guildId, channelId, messageId, userId, content) {
    return run(`INSERT INTO suggestions (guild_id, channel_id, message_id, user_id, content) VALUES (?, ?, ?, ?, ?)`,
        [guildId, channelId, messageId, userId, content]);
}

function updateSuggestionStatus(messageId, status, staffId, staffReason) {
    return run(`UPDATE suggestions SET status = ?, staff_id = ?, staff_reason = ?, updated_at = datetime('now') WHERE message_id = ?`,
        [status, staffId, staffReason, messageId]);
}

function getSuggestionsByStatus(guildId, status, limit = 20) {
    return queryAll('SELECT * FROM suggestions WHERE guild_id = ? AND status = ? ORDER BY updated_at DESC LIMIT ?', [guildId, status, limit]);
}

function getUserSancions(guildId, userId) {
    return queryAll('SELECT * FROM sanctions WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC', [guildId, userId]);
}

function getUserTickets(guildId, userId) {
    return queryAll('SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC', [guildId, userId]);
}

/**
 * Obtiene estadísticas de todo el staff.
 * @param {string} guildId
 * @param {number|null} days
 */
function getAllStaffStats(guildId, days = null) {
    let query = "SELECT claimed_by, closed_by, rating, created_at, closed_at FROM tickets WHERE guild_id = ?";
    const tickets = queryAll(query, [guildId]);

    const stats = {};
    const cutoffDate = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

    for (const ticket of tickets) {
        const created = new Date(ticket.created_at + 'Z');
        const closed = ticket.closed_at ? new Date(ticket.closed_at + 'Z') : null;

        // Count claimed (if created/claimed within period - using created_at as proxy for claim time if not stored separately)
        if (ticket.claimed_by) {
            if (!cutoffDate || created >= cutoffDate) {
                if (!stats[ticket.claimed_by]) stats[ticket.claimed_by] = { claimed: 0, closed: 0, ratings: [] };
                stats[ticket.claimed_by].claimed++;
            }
        }

        // Count closed
        if (ticket.closed_by && closed) {
            if (!cutoffDate || closed >= cutoffDate) {
                if (!stats[ticket.closed_by]) stats[ticket.closed_by] = { claimed: 0, closed: 0, ratings: [] };
                stats[ticket.closed_by].closed++;
            }
        }

        // Ratings (linked to claimed_by or closed_by)
        if (ticket.rating && closed && (!cutoffDate || closed >= cutoffDate)) {
            // Assign rating to claimed_by
            if (ticket.claimed_by) {
                if (!stats[ticket.claimed_by]) stats[ticket.claimed_by] = { claimed: 0, closed: 0, ratings: [] };
                stats[ticket.claimed_by].ratings.push(ticket.rating);
            }
            // Assign rating to closed_by (if different)
            if (ticket.closed_by && ticket.closed_by !== ticket.claimed_by) {
                if (!stats[ticket.closed_by]) stats[ticket.closed_by] = { claimed: 0, closed: 0, ratings: [] };
                stats[ticket.closed_by].ratings.push(ticket.rating);
            }
        }
    }

    return Object.entries(stats).map(([id, data]) => {
        const ratingSum = data.ratings.reduce((a, b) => a + b, 0);
        return {
            staffId: id,
            claimed: data.claimed,
            closed: data.closed,
            ratingAvg: data.ratings.length > 0 ? (ratingSum / data.ratings.length) : 0,
            ratingCount: data.ratings.length
        };
    }).sort((a, b) => b.claimed - a.claimed); // Sort by claimed desc
}

/**
 * Elimina todo el historial de tickets y reinicia contadores.
 * @param {string} guildId 
 */
function deleteTicketHistory(guildId) {
    // Eliminar tickets
    run('DELETE FROM tickets WHERE guild_id = ?', [guildId]);
    
    // Reiniciar contadores (General)
    run('UPDATE guild_config SET ticket_counter = 0 WHERE guild_id = ?', [guildId]);
    
    // Reiniciar contadores de Departamentos
    run('UPDATE departments SET ticket_count = 0 WHERE guild_id = ?', [guildId]);
}


// ===================== BACKUPS AUTOMÁTICOS =====================
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

/**
 * Realiza un backup de la base de datos actual en /data/backups/YYYY-MM-DD.db
 * Borra backups de más de 7 días automáticamente.
 */
function backupDatabase() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const backupName = `${yyyy}-${mm}-${dd}.db`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Copiar archivo actual
    try {
        fs.copyFileSync(DB_PATH, backupPath);
        logger.info(`[DB] Backup realizado: ${backupPath}`);
    } catch (e) {
        logger.error('[DB] Error al crear backup:', e);
    }

    // Borrar backups antiguos (>7 días)
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    for (const file of files) {
        if (!file.endsWith('.db')) continue;
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
        if (ageDays > 7) {
            fs.unlinkSync(filePath);
            logger.info(`[DB] Backup antiguo eliminado: ${filePath}`);
        }
    }
}

// Intervalo de backup: cada 6 horas
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

// ============================================================
// PERM TIMEOUTS
// ============================================================

function addPermTimeout(guildId, userId, reason) {
    try {
        run(`INSERT INTO perm_timeouts (guild_id, user_id, reason, last_applied)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(guild_id, user_id) DO UPDATE SET reason = excluded.reason, last_applied = datetime('now')`,
            [guildId, userId, reason]);
        return true;
    } catch (e) {
        logger.error('[DB] Error al agregar perm_timeout:', e);
        return false;
    }
}

function getPermTimeouts() {
    return queryAll('SELECT * FROM perm_timeouts', []);
}

function updatePermTimeoutLastApplied(id) {
    run("UPDATE perm_timeouts SET last_applied = datetime('now') WHERE id = ?", [id]);
}

function removePermTimeout(guildId, userId) {
    const result = run('DELETE FROM perm_timeouts WHERE guild_id = ? AND user_id = ?', [guildId, userId]);
    return result.changes > 0;
}

// ============================================================
// WELCOME ROLES
// ============================================================

function getWelcomeRoles(guildId) {
    return queryAll('SELECT role_id FROM welcome_roles WHERE guild_id = ?', [guildId]);
}

function addWelcomeRole(guildId, roleId) {
    try {
        run('INSERT INTO welcome_roles (guild_id, role_id) VALUES (?, ?)', [guildId, roleId]);
        return true;
    } catch (e) {
        if (e.message?.includes('UNIQUE constraint')) return false;
        throw e;
    }
}

function removeWelcomeRole(guildId, roleId) {
    const result = run('DELETE FROM welcome_roles WHERE guild_id = ? AND role_id = ?', [guildId, roleId]);
    return result.changes > 0;
}

function clearWelcomeRoles(guildId) {
    run('DELETE FROM welcome_roles WHERE guild_id = ?', [guildId]);
}

module.exports = {
    backupDatabase,
    deleteTicketHistory,
    getAllStaffStats,
    initDatabase,
    getDatabase,
    saveDatabaseSync,
    // Guild
    getGuildConfig,
    updateGuildConfig,
    incrementTicketCounter,
    incrementDepartmentTicketCount,
    decrementDepartmentTicketCount,
    setPanelReference,
    getPanelReference,
    // Messages
    getTicketMessage,
    setTicketMessage,
    // Departments
    getDepartments,
    addDepartment,
    updateDepartmentForm,
    removeDepartment,
    // Tickets
    createTicket,
    getTicketById,
    getTicketByChannel,
    getOpenTicketsByUser,
    claimTicket,
    unclaimTicket,
    closeTicket,
    setTranscriptUrl,
    setCloseAuditLogId,
    updateTicketRating,
    // Audit
    addAuditLog,
    getAuditLogs,
    getTicketStats,
    getStaffStats,
    getAllStaffStats,
    getLatestRatings,
    // Suggestions
    createSuggestionRecord,
    updateSuggestionStatus,
    getSuggestionsByStatus,
    getUserSancions,
    getUserTickets,
    // Welcome
    getWelcomeRoles,
    addWelcomeRole,
    removeWelcomeRole,
    clearWelcomeRoles,
    // Perm Timeouts
    addPermTimeout,
    getPermTimeouts,
    updatePermTimeoutLastApplied,
    removePermTimeout,
};
