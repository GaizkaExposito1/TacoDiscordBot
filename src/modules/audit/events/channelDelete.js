const { Events, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.ChannelDelete,
    async execute(channel) {
        if (!channel.guild) return; // Solo canales de guild
        const guild = channel.guild;

        const config = getAuditConfig(guild.id);
        if (!config || !config.log_channel_delete) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Canal Borrado')
            .setColor('#f04747')
            .setDescription(`Se ha eliminado el canal: **#${channel.name}** (\`${channel.id}\`)`)
            .setFooter({ text: `Tipo: ${channel.type}` })
            .setTimestamp();

        await sendAuditLog(guild, 'log_channel_delete', embed);
    },
};
