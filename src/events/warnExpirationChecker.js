const { getDatabase } = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: false,
    execute(client) {
        // Ejecutar cada 10 minutos
        setInterval(async () => {
            const db = getDatabase();
            const now = new Date().toISOString();

            try {
                // Obtener warns activos cuya fecha de expiración ya pasó
                const expiredWarns = db.prepare(`
                    SELECT id, guild_id, user_id, reason
                    FROM sanctions
                    WHERE type = 'warn' AND status = 'active' AND expires_at IS NOT NULL AND expires_at <= ?
                `).all(now);

                if (expiredWarns.length === 0) return;

                const expireStmt = db.prepare(
                    "UPDATE sanctions SET status = 'expired' WHERE id = ?"
                );

                const expireMany = db.transaction((warns) => {
                    for (const warn of warns) {
                        expireStmt.run(warn.id);
                    }
                });

                expireMany(expiredWarns);

                logger.info(`[WarnExpiration] ${expiredWarns.length} warn(s) expirado(s) y marcados como 'expired'.`);
            } catch (error) {
                logger.error('[WarnExpiration] Error al procesar warns expirados:', error);
            }
        }, 10 * 60 * 1000); // 10 minutos
    },
};
