const { Events } = require('discord.js');
const { deactivateGuild } = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildDelete,
    once: false,

    execute(guild) {
        // guild.available === false indica una outage de Discord, no una expulsión
        if (guild.available === false) return;

        logger.info(`[Guild] ➖ Bot eliminado de: ${guild.name ?? 'Servidor desconocido'} (${guild.id})`);

        try {
            deactivateGuild(guild.id);
        } catch (err) {
            logger.error(`[Guild] Error al desactivar guild ${guild.id}:`, err);
        }
    },
};
