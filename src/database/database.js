const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger'); // Importamos el logger

const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'taco.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db = null;
const configCache = new Map(); // Cache en memoria para configuraciones

// ── Migraciones versionadas ─────────────────────────────────────────────────
//
// Cada objeto define una versión de esquema y su función `up(db)`.
// Solo se ejecutan las migraciones cuya versión supere la almacenada en
// la tabla `schema_version`. Para DBs existentes que usaban el sistema
// antiguo de ALTER TABLE, el bootstrap detecta automáticamente que ya
// están al día y salta al número de versión máximo.
//
const MIGRATIONS = [
    {
        version: 1,
        description: 'Columnas rating y rating_comment en tickets',
        up(db) {
            db.prepare('ALTER TABLE tickets ADD COLUMN rating INTEGER').run();
            db.prepare('ALTER TABLE tickets ADD COLUMN rating_comment TEXT').run();
        },
    },
    {
        version: 2,
        description: 'Columna close_audit_log_id en tickets',
        up(db) {
            db.prepare('ALTER TABLE tickets ADD COLUMN close_audit_log_id TEXT').run();
        },
    },
    {
        version: 3,
        description: 'Columnas de sugerencias en guild_config',
        up(db) {
            db.prepare('ALTER TABLE guild_config ADD COLUMN suggestions_channel_id TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN suggestions_accepted_id TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN suggestions_denied_id TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN updates_channel_id TEXT').run();
        },
    },
    {
        version: 4,
        description: 'Columnas de bienvenida/despedida en guild_config',
        up(db) {
            db.prepare('ALTER TABLE guild_config ADD COLUMN welcome_channel_id TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN welcome_message TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN goodbye_message TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN welcome_enabled INTEGER DEFAULT 1').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN goodbye_enabled INTEGER DEFAULT 1').run();
        },
    },
    {
        version: 5,
        description: 'Columnas de roles de permisos (mod, admin, op) en guild_config',
        up(db) {
            db.prepare('ALTER TABLE guild_config ADD COLUMN mod_min_role_id TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN admin_min_role_id TEXT').run();
            db.prepare('ALTER TABLE guild_config ADD COLUMN op_min_role_id TEXT').run();
        },
    },
    {
        version: 6,
        description: 'Columna ticket_counter_mode en guild_config',
        up(db) {
            db.prepare("ALTER TABLE guild_config ADD COLUMN ticket_counter_mode TEXT DEFAULT 'category'").run();
        },
    },
    {
        version: 7,
        description: 'Columna silenciado_role_id en guild_config',
        up(db) {
            db.prepare('ALTER TABLE guild_config ADD COLUMN silenciado_role_id TEXT').run();
        },
    },
    {
        version: 8,
        description: 'Columna max_tickets_per_user en guild_config',
        up(db) {
            db.prepare('ALTER TABLE guild_config ADD COLUMN max_tickets_per_user INTEGER DEFAULT 1').run();
        },
    },
    {
        version: 9,
        description: 'Tabla welcome_roles',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS welcome_roles (
                    id       INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    role_id  TEXT NOT NULL,
                    UNIQUE(guild_id, role_id)
                );
            `);
        },
    },
    {
        version: 10,
        description: 'Tablas suggestions, sanctions, temp_bans, perm_timeouts',
        up(db) {
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
                    status          TEXT DEFAULT 'active',
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
        },
    },
    {
        version: 11,
        description: 'Tabla polls (encuestas nativas de Discord)',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS polls (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id    TEXT NOT NULL,
                    channel_id  TEXT NOT NULL,
                    message_id  TEXT NOT NULL,
                    creator_id  TEXT NOT NULL,
                    question    TEXT NOT NULL,
                    expires_at  TEXT NOT NULL,
                    closed      INTEGER DEFAULT 0,
                    created_at  TEXT DEFAULT (datetime('now'))
                );
            `);
        },
    },
    {
        version: 12,
        description: 'Columna staff_only en polls (visibilidad para staff)',
        up(db) {
            db.exec(`ALTER TABLE polls ADD COLUMN staff_only INTEGER NOT NULL DEFAULT 0`);
        },
    },
    {
        version: 13,
        description: 'Warn acumulático (umbral + acción) y auto-cierre de tickets por inactividad',
        up(db) {
            const gcCols = db.pragma('table_info(guild_config)').map(c => c.name);
            if (!gcCols.includes('warn_threshold'))       db.exec(`ALTER TABLE guild_config ADD COLUMN warn_threshold INTEGER DEFAULT 0`);
            if (!gcCols.includes('warn_action'))          db.exec(`ALTER TABLE guild_config ADD COLUMN warn_action TEXT DEFAULT 'none'`);
            if (!gcCols.includes('warn_action_duration')) db.exec(`ALTER TABLE guild_config ADD COLUMN warn_action_duration TEXT`);
            if (!gcCols.includes('ticket_autoclose_hours')) db.exec(`ALTER TABLE guild_config ADD COLUMN ticket_autoclose_hours INTEGER DEFAULT 0`);
            const tkCols = db.pragma('table_info(tickets)').map(c => c.name);
            // SQLite no permite DEFAULT (datetime('now')) en ALTER TABLE → DEFAULT NULL
            if (!tkCols.includes('last_activity_at')) db.exec(`ALTER TABLE tickets ADD COLUMN last_activity_at TEXT DEFAULT NULL`);
        },
    },
    {
        version: 14,
        description: 'Expiración automática de warns (columna expires_at en sanctions)',
        up(db) {
            const cols = db.pragma('table_info(sanctions)').map(c => c.name);
            if (!cols.includes('expires_at')) {
                db.exec(`ALTER TABLE sanctions ADD COLUMN expires_at TEXT`);
            }
            db.exec(`CREATE INDEX IF NOT EXISTS idx_sanctions_expires ON sanctions(expires_at) WHERE expires_at IS NOT NULL`);
        },
    },
    {
        version: 15,
        description: 'Caché de nombres de usuario de Discord',
        up(db) {
            db.exec(`
                CREATE TABLE IF NOT EXISTS user_cache (
                    user_id    TEXT PRIMARY KEY,
                    username   TEXT NOT NULL,
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            `);
        },
    },
    {
        version: 16,
        description: 'Expiración global de warns (warn_default_expiry en guild_config)',
        up(db) {
            const cols = db.pragma('table_info(guild_config)').map(c => c.name);
            if (!cols.includes('warn_default_expiry')) {
                db.exec(`ALTER TABLE guild_config ADD COLUMN warn_default_expiry TEXT DEFAULT NULL`);
            }
        },
    },
    {
        version: 17,
        description: 'Columna priority en tickets (high, medium, low)',
        up(db) {
            const cols = db.pragma('table_info(tickets)').map(c => c.name);
            if (!cols.includes('priority')) {
                db.exec(`ALTER TABLE tickets ADD COLUMN priority TEXT DEFAULT NULL`);
            }
        },
    },
    {
        version: 18,
        description: 'Columna avatar_hash en user_cache',
        up(db) {
            const cols = db.pragma('table_info(user_cache)').map(c => c.name);
            if (!cols.includes('avatar_hash')) {
                db.exec(`ALTER TABLE user_cache ADD COLUMN avatar_hash TEXT DEFAULT NULL`);
            }
        },
    },
];

// Última versión que aplicaba el sistema antiguo de ALTER TABLE manual.
// Las DBs existentes se marcan aquí para que solo corran las migraciones
// añadidas DESPUÉS de introducir el sistema versionado.
const LEGACY_VERSION = 10;

/**
 * Ejecuta las migraciones pendientes contra la base de datos.
 *
 * Bootstrap automático: si schema_version no existía y la DB ya tiene
 * columnas históricas (columna `rating` en tickets), se inicializa en
 * LEGACY_VERSION para que las migraciones posteriores (nuevas tablas como
 * polls) sí se ejecuten correctamente.
 */
function runMigrations(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0)`);

    let row = db.prepare('SELECT version FROM schema_version').get();

    if (!row) {
        // Primera aparición de schema_version — detectar si DB es nueva o existente
        const ticketCols = db.pragma('table_info(tickets)').map(c => c.name);
        const isExistingDb = ticketCols.includes('rating'); // columna de migración v1

        if (isExistingDb) {
            db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(LEGACY_VERSION);
            logger.info(`[DB] Migraciones: DB existente detectada → inicializada en v${LEGACY_VERSION}`);
            row = { version: LEGACY_VERSION };
        } else {
            db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
            row = { version: 0 };
        }
    }

    // Corrección de seguridad: si la versión almacenada es mayor que LEGACY_VERSION
    // pero alguna tabla crítica no existe, revertir al punto anterior.
    // Esto ocurre cuando el bootstrap anterior marcó max incorrectamente.
    if (row.version > LEGACY_VERSION) {
        const missingTables = MIGRATIONS
            .filter(m => m.version > LEGACY_VERSION && m.version <= row.version)
            .filter(m => {
                // Detectar tablas creadas por esta migración comparando nombres en sqlite_master
                const sql = m.up.toString();
                const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
                if (!match) return false;
                const tableName = match[1];
                return !db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
            });

        if (missingTables.length > 0) {
            logger.warn(`[DB] Tablas faltantes detectadas (${missingTables.map(m => m.description).join(', ')}). Corrigiendo versión a v${LEGACY_VERSION}...`);
            db.prepare('UPDATE schema_version SET version = ?').run(LEGACY_VERSION);
            row = { version: LEGACY_VERSION };
        }
    }

    const currentVersion = row.version;
    const pending = MIGRATIONS.filter(m => m.version > currentVersion);

    if (pending.length === 0) {
        logger.info(`[DB] Migraciones: al día (v${currentVersion})`);
        return;
    }

    logger.info(`[DB] Aplicando ${pending.length} migración(es) pendiente(s)...`);

    for (const migration of pending) {
        const apply = db.transaction(() => {
            migration.up(db);
            db.prepare('UPDATE schema_version SET version = ?').run(migration.version);
        });
        apply();
        logger.info(`[DB] ✓ v${migration.version}: ${migration.description}`);
    }

    const finalVersion = MIGRATIONS[MIGRATIONS.length - 1].version;
    logger.info(`[DB] Migraciones completadas → v${finalVersion}`);
}

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

        runMigrations(db);

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
        // v13
        'warn_threshold', 'warn_action', 'warn_action_duration',
        'ticket_autoclose_hours',
        // v16
        'warn_default_expiry',
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
    run(`INSERT INTO tickets (guild_id, channel_id, user_id, department_id, subject, priority) VALUES (?, ?, ?, ?, ?, 'low')`,
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

function setTicketPriority(channelId, priority) {
    run('UPDATE tickets SET priority = ? WHERE channel_id = ?', [priority, channelId]);
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

// ============================================================
// POLLS
// ============================================================

function createPoll(guildId, channelId, messageId, creatorId, question, expiresAt, staffOnly = 0) {
    const result = run(
        `INSERT INTO polls (guild_id, channel_id, message_id, creator_id, question, expires_at, staff_only)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [guildId, channelId, messageId, creatorId, question, expiresAt, staffOnly ? 1 : 0]
    );
    return result.lastInsertRowid;
}

function closePoll(messageId, guildId) {
    return run(
        `UPDATE polls SET closed = 1 WHERE message_id = ? AND guild_id = ?`,
        [messageId, guildId]
    );
}

function getPollByMessage(messageId, guildId) {
    return queryOne('SELECT * FROM polls WHERE message_id = ? AND guild_id = ?', [messageId, guildId]);
}

function getActivePolls(guildId, showAll = false) {
    const query = showAll
        ? `SELECT * FROM polls WHERE guild_id = ? AND closed = 0 ORDER BY created_at DESC`
        : `SELECT * FROM polls WHERE guild_id = ? AND closed = 0 AND staff_only = 0 ORDER BY created_at DESC`;
    return queryAll(query, [guildId]);
}

/**
 * Elimina todo el historial de encuestas de un servidor.
 * @param {string} guildId 
 */
function deletePollHistory(guildId) {
    run('DELETE FROM polls WHERE guild_id = ?', [guildId]);
}

// ===================== TICKETS — ACTIVIDAD =====================

/**
 * Actualiza el timestamp de actividad de un ticket (para auto-cierre).
 * @param {string} channelId
 */
function updateTicketLastActivity(channelId) {
    run("UPDATE tickets SET last_activity_at = datetime('now') WHERE channel_id = ? AND status != 'closed'", [channelId]);
}

/**
 * Guarda o actualiza el nombre en caché de un usuario de Discord.
 * No‐op si los argumentos son falsy o si la tabla no existe aún.
 */
function cacheUser(userId, username, avatarHash = null) {
    if (!userId || !username) return;
    try {
        getDatabase().prepare(`
            INSERT INTO user_cache (user_id, username, avatar_hash, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                username    = excluded.username,
                avatar_hash = COALESCE(excluded.avatar_hash, user_cache.avatar_hash),
                updated_at  = excluded.updated_at
        `).run(userId, username, avatarHash ?? null);
    } catch (_) { /* no‐critical */ }
}

/**
 * Devuelve todos los tickets abiertos que superan el umbral de inactividad de su servidor.
 * Usa COALESCE(last_activity_at, created_at) como fallback para tickets sin actividad registrada.
 */
function getTicketsForAutoClose() {
    return queryAll(`
        SELECT t.*
        FROM tickets t
        JOIN guild_config gc ON t.guild_id = gc.guild_id
        WHERE t.status != 'closed'
          AND gc.ticket_autoclose_hours > 0
          AND datetime(COALESCE(t.last_activity_at, t.created_at), '+' || gc.ticket_autoclose_hours || ' hours') <= datetime('now')
    `, []);
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
    setTicketPriority,
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
    // Polls
    createPoll,
    closePoll,
    getPollByMessage,
    getActivePolls,
    deletePollHistory,
    // Tickets — actividad y auto-cierre
    updateTicketLastActivity,
    getTicketsForAutoClose,
    // User cache
    cacheUser,
};
