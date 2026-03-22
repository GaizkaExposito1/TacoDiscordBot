const { EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');

module.exports = {
    async execute(interaction) {
        const config = getGuildConfig(interaction.guild.id);
        if (!await requireLevel(interaction, config, 'op')) return;

        const fmt = (id) => id ? `<@&${id}>` : '`No configurado`';

        const embed = new EmbedBuilder()
            .setTitle('🔐 Roles de acceso configurados')
            .setColor('#FF9900')
            .setDescription('Esta es la configuración actual de rangos y los permisos que otorgan en el bot.')
            .addFields(
                {
                    name: '🎫 Staff de Tickets',
                    value: `${fmt(config?.staff_role_id)}\n` +
                           `Puede ver, reclamar y cerrar tickets. Se configura con \`/tickets setup\`.`,
                    inline: false
                },
                {
                    name: '🛡️ Moderador (Warn/Timeout/Kick)',
                    value: `${fmt(config?.mod_min_role_id)}\n` +
                           `Puede aplicar warns, timeouts (incluido permanente), kicks, ver historial y limpiar chat.\n` +
                           `Se configura con \`/moderation setup-roles tipo:Mod\`.`,
                    inline: false
                },
                {
                    name: '⚔️ Administración (Ban/Unban/Remove Sanction)',
                    value: `${fmt(config?.admin_min_role_id)}\n` +
                           `Puede banear, desbanear y retirar sanciones del historial.\n` +
                           `Se configura con \`/moderation setup-roles tipo:Admin\`.`,
                    inline: false
                },
                {
                    name: '👑 Operador/Directiva (Config del bot)',
                    value: `${fmt(config?.op_min_role_id)}\n` +
                           `Acceso total: configuración de bienvenida, anuncios, auditoría y toda la config del bot.\n` +
                           `Se configura con \`/moderation setup-roles tipo:Operador/Directiva\`.`,
                    inline: false
                }
            )
            .setFooter({ text: 'Los Administradores de Discord siempre tienen acceso completo independientemente del rol.' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
