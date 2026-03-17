const { ChannelType, Events, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.ChannelCreate,
    async execute(channel) {
        if (!channel.guild) return; // Solo canales de guild
        const guild = channel.guild;

        const config = getAuditConfig(guild.id);
        if (!config || !config.log_channel_create) return;

        const embed = new EmbedBuilder()
            .setTitle('📁 Canal Creado')
            .setColor('#43b581')
            .setDescription(`Se ha creado un nuevo canal: ${channel} (\`${channel.id}\`)\nTipo: ${ChannelType[channel.type]}`)
            .setFooter({ text: `ID Guild: ${guild.id}` })
            .setTimestamp();

        await sendAuditLog(guild, 'log_channel_create', embed);
    },
};
