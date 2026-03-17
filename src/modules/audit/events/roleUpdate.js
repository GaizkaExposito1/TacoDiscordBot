const { Events, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

module.exports = {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole) {
        if (!oldRole.guild) return; 
        const guild = newRole.guild;

        const config = getAuditConfig(guild.id);
        if (!config || !config.log_role_update) return;

        // Detectar cambios
        const changes = [];
        if (oldRole.name !== newRole.name) {
            changes.push(`📝 **Nombre:** \`@${oldRole.name}\` ➔ \`@${newRole.name}\``);
        }
        if (oldRole.hexColor !== newRole.hexColor) {
            changes.push(`🎨 **Color:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
        }
        if (oldRole.mentionable !== newRole.mentionable) {
            changes.push(`🔔 **Mencionable:** \`${oldRole.mentionable}\` ➔ \`${newRole.mentionable}\``);
        }
        if (oldRole.hoist !== newRole.hoist) {
             changes.push(`🏗️ **Separado (Hoist):** \`${oldRole.hoist}\` ➔ \`${newRole.hoist}\``);
        }
        // Permisos (simplificado)
        if (!oldRole.permissions.equals(newRole.permissions)) {
             changes.push(`⚙️ **Permisos:** Actualizados`);
        }

        if (changes.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle('🔧 Rol Actualizado')
                .setColor('#faa61a')
                .setDescription(`${newRole} (\`${newRole.id}\`)\n\n${changes.join('\n')}`)
                .setFooter({ text: `ID Guild: ${guild.id}` })
                .setTimestamp();

            await sendAuditLog(guild, 'log_role_update', embed);
        }
    },
};
