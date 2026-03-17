const { Events, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.GuildRoleDelete,
    async execute(role) {
        if (!role.guild) return; 
        const guild = role.guild;

        const config = getAuditConfig(guild.id);
        if (!config || !config.log_role_delete) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Rol Eliminado')
            .setColor('#f04747')
            .setDescription(`Se ha eliminado el Rol: **@${role.name}** (\`${role.id}\`)`)
            .addFields(
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Miembros', value: `${role.members.size}`, inline: true }
            )
            .setFooter({ text: `ID Guild: ${guild.id}` })
            .setTimestamp();

        await sendAuditLog(guild, 'log_role_delete', embed);
    },
};
