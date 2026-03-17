const { Events, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.GuildRoleCreate,
    async execute(role) {
        if (!role.guild) return; 
        const guild = role.guild;

        const config = getAuditConfig(guild.id);
        if (!config || !config.log_role_create) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Rol Creado')
            .setColor('#43b581')
            .setDescription(`Se ha creado un nuevo Rol: ${role} (\`${role.id}\`)`)
            .addFields(
                { name: 'Nombre', value: role.name, inline: true },
                { name: 'Color', value: role.hexColor, inline: true },
                { name: 'Mencionable', value: role.mentionable ? 'Sí' : 'No', inline: true }
            )
            .setFooter({ text: `ID Guild: ${guild.id}` })
            .setTimestamp();

        await sendAuditLog(guild, 'log_role_create', embed);
    },
};
