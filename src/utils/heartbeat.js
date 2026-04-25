const { getDatabase } = require('../database/database');
const logger = require('./logger');

let _interval = null;

/**
 * Inicia el heartbeat que envía el estado del bot al dashboard cada 30 segundos.
 * Requiere que DASHBOARD_HEARTBEAT_URL y HEARTBEAT_SECRET estén configurados en .env.
 * @param {import('discord.js').Client} client
 */
function startHeartbeat(client) {
    let env;
    try { env = require('../config/env'); } catch { return; }

    const url = env.DASHBOARD_HEARTBEAT_URL;
    const secret = env.HEARTBEAT_SECRET;

    if (!url || !secret) {
        logger.info('[Heartbeat] DASHBOARD_HEARTBEAT_URL o HEARTBEAT_SECRET no configurados — heartbeat desactivado.');
        return;
    }

    async function sendHeartbeat() {
        try {
            // Medir latencia de la DB
            const db = getDatabase();
            const t0 = Date.now();
            db.prepare('SELECT 1').get();
            const db_ping_ms = Date.now() - t0;

            const payload = {
                uptime_seconds: Math.floor(process.uptime()),
                db_ping_ms,
                guild_count: client.guilds?.cache?.size ?? null,
                shard_latency: client.ws?.ping ?? null,
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-heartbeat-secret': secret,
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(5000),
            });

            if (!res.ok) {
                logger.warn(`[Heartbeat] Respuesta inesperada del dashboard: ${res.status}`);
            }
        } catch (err) {
            // Silencioso en producción para no llenar los logs; solo warn
            logger.warn(`[Heartbeat] Error al enviar heartbeat: ${err.message}`);
        }
    }

    // Enviar inmediatamente al iniciar y luego cada 30 segundos
    sendHeartbeat();
    _interval = setInterval(sendHeartbeat, 30_000);

    logger.info('[Heartbeat] ✔ Heartbeat iniciado → ' + url);
}

function stopHeartbeat() {
    if (_interval) {
        clearInterval(_interval);
        _interval = null;
    }
}

module.exports = { startHeartbeat, stopHeartbeat };
