const { getDatabase } = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: false,
    execute(client) {
        // Ejecutar cada 1 minuto
        setInterval(async () => {
            const db = getDatabase();
            const now = new Date().toISOString();
            
            try {
                // Seleccionar baneos que ya deberían haber expirado
                const expiredBans = db.prepare('SELECT * FROM temp_bans WHERE unban_at <= ?').all(now);
                
                for (const ban of expiredBans) {
                    const guild = client.guilds.cache.get(ban.guild_id);
                    if (guild) {
                        try {
                            await guild.members.unban(ban.user_id, 'Fin de baneo temporal');
                            logger.info(`[Moderation] Unbanned user ${ban.user_id} in guild ${ban.guild_id} (Tempban expired)`);
                        } catch (err) {
                            // Código 10013: Unknown User | Código 10026: Unknown Ban
                            if (err.code === 10013 || err.code === 10026) {
                                logger.info(`[Moderation] User ${ban.user_id} already unbanned or not found.`);
                            } else {
                                logger.error(`[Moderation] Error unbanning user ${ban.user_id}:`, err);
                            }
                        }
                    }

                    // Marcar baneo como expirado en el historial de sanciones
                    try {
                        db.prepare("UPDATE sanctions SET status = 'expired' WHERE guild_id = ? AND user_id = ? AND type = 'ban' AND status = 'active'").run(ban.guild_id, ban.user_id);
                    } catch (e) {
                        logger.error(`[Moderation] Error updating sanction status to expired for ${ban.user_id}:`, e);
                    }

                    // Eliminar de la base de datos de baneos temporales para no repetir
                    db.prepare('DELETE FROM temp_bans WHERE id = ?').run(ban.id);
                }
            } catch (error) {
                logger.error('[Moderation] Error in tempban checker:', error);
            }
        }, 60000); // 1 minuto
    }
};