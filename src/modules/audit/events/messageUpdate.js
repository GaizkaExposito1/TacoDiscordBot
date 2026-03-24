const { Events, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.MessageUpdate,
    async execute(oldMessage, newMessage) {
        // Ignorar si el mensaje parcial no está en caché o si no tiene contenido de texto
        if (oldMessage.partial) return; 
        if (!oldMessage.guild || !newMessage.guild) return;
        if (oldMessage.author?.bot) return; // Ignorar bots
        
        // Asegurarnos de que el contenido no sea null (mensajes solo con attachments/embeds)
        const oldContent = oldMessage.content ?? '';
        const newContent = newMessage.content ?? '';

        if (oldContent === newContent) return; 

        const guild = newMessage.guild;

        // Verificar config
        const config = getAuditConfig(guild.id);
        if (!config || !config.log_message_edit) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mensaje Editado')
            .setColor('#faa61a') // Naranja
            .setAuthor({ 
                name: newMessage.author?.tag || 'Usuario desconocido', 
                iconURL: newMessage.author?.displayAvatarURL() 
            })
            .setDescription(`**Canal:** ${newMessage.channel}\n**Mensaje original:** [Ir al mensaje](${newMessage.url})`)
            .addFields(
                { name: 'Antes', value: oldContent.slice(0, 1024) || '*Sin contenido de texto*' },
                { name: 'Después', value: newContent.slice(0, 1024) || '*Sin contenido de texto*' }
            )
            .setFooter({ text: `ID Usuario: ${newMessage.author?.id || 'ID Desconocido'}` })
            .setTimestamp();

        await sendAuditLog(guild, 'log_message_edit', embed);
    },
};
