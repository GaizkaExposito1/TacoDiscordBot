const { Events } = require('discord.js');
const { setupGuildOnJoin } = require('../database/database');
const { simpleEmbed } = require('../utils/embeds');
const { COLORS } = require('../utils/constants');
const logger = require('../utils/logger');

module.exports = {
    name: Events.GuildCreate,
    once: false,

    async execute(guild) {
        logger.info(`[Guild] ➕ Bot añadido a: ${guild.name} (${guild.id}) | ${guild.memberCount} miembros`);

        // Inicializar config y módulos en BD
        try {
            setupGuildOnJoin(guild.id);
        } catch (err) {
            logger.error(`[Guild] Error al inicializar config para ${guild.id}:`, err);
        }

        // Enviar mensaje de bienvenida al canal adecuado
        try {
            // Preferir el canal de sistema; si no, el primer canal de texto con permisos
            const channel = guild.systemChannel
                ?? guild.channels.cache
                    .filter(c => c.isTextBased() && !c.isThread() && c.permissionsFor(guild.members.me)?.has('SendMessages'))
                    .sort((a, b) => a.position - b.position)
                    .first();

            if (!channel) return;

            const embed = simpleEmbed(
                '👋 ¡Hola! Soy TacoManagment',
                `Gracias por añadirme a **${guild.name}**.\n\n` +
                `Para comenzar, usa \`/config\` para configurar los roles y canales, o accede al **dashboard web** para una configuración completa y visual.\n\n` +
                `> Necesitarás asignar los roles de Moderador, Administrador y Operador para que tu equipo pueda usar el bot correctamente.`,
                COLORS.PRIMARY
            );

            await channel.send({ embeds: [embed] });
        } catch (err) {
            logger.warn(`[Guild] No se pudo enviar mensaje de bienvenida a ${guild.id}:`, err.message);
        }
    },
};
