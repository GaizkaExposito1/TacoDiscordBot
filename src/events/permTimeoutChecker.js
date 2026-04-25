const { getPermTimeouts, updatePermTimeoutLastApplied, removePermTimeout } = require('../database/database');
const logger = require('../utils/logger');

// Re-aplica el timeout permanente si quedan menos de 8 días para que caduque (last_applied + 20d)
const REAPPLY_AFTER_MS = 20 * 24 * 60 * 60 * 1000; // 20 días
// Usar 27 días en vez del límite exacto de 28 para evitar que la latencia de red
// empuje el timestamp por encima del máximo permitido por Discord.
const MAX_TIMEOUT_MS  = 27 * 24 * 60 * 60 * 1000;  // 27 días (límite Discord: 28d)

module.exports = {
    name: 'ready',
    once: false,
    execute(client) {
        const check = async () => {
            const entries = getPermTimeouts();
            const now = Date.now();

            for (const entry of entries) {
                const lastApplied = new Date(entry.last_applied + 'Z').getTime();
                if (now - lastApplied < REAPPLY_AFTER_MS) continue;

                const guild = client.guilds.cache.get(entry.guild_id);
                if (!guild) continue;

                const member = await guild.members.fetch(entry.user_id).catch(() => null);
                if (!member) {
                    // El usuario ya no está en el servidor, limpiar
                    removePermTimeout(entry.guild_id, entry.user_id);
                    continue;
                }

                try {
                    await member.timeout(MAX_TIMEOUT_MS, entry.reason || 'Timeout permanente');
                    updatePermTimeoutLastApplied(entry.id);
                    logger.info(`[PermTimeout] Timeout re-aplicado a ${member.user.tag} en ${guild.name}`);
                } catch (err) {
                    logger.error(`[PermTimeout] Error re-aplicando timeout a ${entry.user_id}:`, err);
                }
            }
        };

        // Comprobar cada hora
        setInterval(check, 60 * 60 * 1000);
        // También al arrancar
        check();

        logger.info('[PermTimeout] Checker de timeouts permanentes iniciado.');
    },
};
