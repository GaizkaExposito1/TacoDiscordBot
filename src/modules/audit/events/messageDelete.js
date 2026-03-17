const { Events, AuditLogEvent, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { createLogEmbed } = require('../utils/logEmbed');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.MessageDelete,
    async execute(message) {
        // Log de debug para ver si entra el evento
        console.log(`[DEBUG] messageDelete en canal ${message.channelId} (ID: ${message.id}) | Parcial: ${message.partial}`);

        if (!message.guild) return; 
        const guild = message.guild;

        // Verificar config
        const config = getAuditConfig(guild.id);
        if (!config || !config.log_message_delete) {
            // console.log('[DEBUG] Log de message_delete desactivado en DB');
            return;
        }

        let executor = null;
        let targetAuthor = message.author; // Puede ser null si es parcial
        let content = message.content;

        // Intentar obtener quién borró el mensaje (Audit Logs)
        try {
            const auditLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MessageDelete,
            });
            const logEntry = auditLogs.entries.first();
            
            // Si hay un log reciente (< 5s)
            if (logEntry && (Date.now() - logEntry.createdTimestamp) < 5000) {
                // Verificar si el log corresponde al mensaje (Target ID = Autor del mensaje)
                // Si el mensaje es parcial, no tenemos message.author.id fiable siempre, 
                // pero asumimos que el logEntry es correcto por tiempo.
                executor = logEntry.executor;
            }
        } catch (error) {
            console.error('[Audit] Error fetching audit logs:', error);
        }

        // Si el mensaje es parcial, no tenemos autor ni contenido
        if (message.partial) {
             const embed = new EmbedBuilder()
                .setTitle('🗑️ Mensaje Eliminado (Parcial)')
                .setColor('#f04747')
                .setDescription(`Se ha borrado un mensaje antiguo o no cacheado en ${message.channel}. No se puede recuperar el contenido.`)
                .setFooter({ text: `ID Mensaje: ${message.id}` })
                .setTimestamp();
            
            if (executor) {
                embed.addFields({ name: 'Posiblemente borrado por', value: `${executor} (\`${executor.id}\`)` });
            }

            return await sendAuditLog(guild, 'log_message_delete', embed);
        }

        // Si NO es parcial
        if (message.author?.bot) return; // Ignorar bots solo si sabemos que es bot

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mensaje Eliminado')
            .setColor('#f04747')
            .addFields(
                { name: 'Autor', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
                { name: 'Canal', value: `${message.channel}`, inline: true },
                { name: 'Contenido', value: content ? content.slice(0, 1024) : '*Sin contenido (posiblemente imagen/embed)*' }
            )
            .setFooter({ text: `ID Mensaje: ${message.id}` })
            .setTimestamp();

        if (executor) {
            embed.setAuthor({ name: executor.tag, iconURL: executor.displayAvatarURL() });
            embed.addFields({ name: 'Eliminado por', value: `${executor} (\`${executor.id}\`)`, inline: true });
        } else {
             embed.setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() });
             embed.addFields({ name: 'Info', value: 'Auto-eliminado o log no encontrado (posiblemente borrado por el propio autor)', inline: true });
        }

        // Adjuntos
        if (message.attachments.size > 0) {
             const attachments = message.attachments.map(a => `[${a.name}](${a.url})`).join(', ');
             embed.addFields({ name: 'Adjuntos', value: attachments });
        }

        await sendAuditLog(guild, 'log_message_delete', embed);
    },
};
