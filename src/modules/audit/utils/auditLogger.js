const { getAuditConfig } = require('./auditDb');
const { EmbedBuilder } = require('discord.js');

/**
 * Envía un log de auditoría al canal configurado si el evento está habilitado.
 * @param {import('discord.js').Guild} guild 
 * @param {string} eventName Nombre del evento en la DB (ej: 'log_message_delete')
 * @param {import('discord.js').EmbedBuilder} embed El embed a enviar
 */
async function sendAuditLog(guild, eventName, embed) {
    try {
        const config = getAuditConfig(guild.id);
        
        // Verificar si existe configuración y si el evento está activado
        if (!config || !config.log_channel_id || !config[eventName]) {
            return;
        }

        const channel = guild.channels.cache.get(config.log_channel_id);
        if (!channel) {
            // Podría haber sido borrado, tal vez loguear esto en consola
            return;
        }

        // Verificar permisos de envio
        if (!channel.permissionsFor(guild.members.me).has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
            return;
        }

        await channel.send({ embeds: [embed] });
    } catch (error) {
        console.error(`Error enviando log de auditoría (${eventName}):`, error);
    }
}

module.exports = { sendAuditLog };
