const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../../../database/database');
const logger = require('../../../../utils/logger');
const { simpleEmbed } = require('../../../../utils/embeds');

const FIELDS = {
    mod:   { field: 'mod_min_role_id',   label: 'Moderación (Warn/Timeout/Kick)' },
    admin: { field: 'admin_min_role_id', label: 'Administración (Ban/Unban/Remove Sanction)' },
    op:    { field: 'op_min_role_id',    label: 'Operador/Directiva (Configuración del bot)' },
};

module.exports = {
    async execute(interaction) {
        // Solo administradores de Discord pueden configurar roles para evitar escalada de privilegios
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Solo un Administrador de Discord puede configurar los roles de moderación.', ephemeral: true });
        }

        const type = interaction.options.getString('tipo');
        const role = interaction.options.getRole('rol');
        const guild = interaction.guild;

        const { field, label } = FIELDS[type] ?? {};
        if (!field) return interaction.reply({ content: '❌ Tipo no válido.', ephemeral: true });

        try {
            updateGuildConfig(guild.id, field, role.id);
            return interaction.reply({
                embeds: [simpleEmbed('Configuración Actualizada', `✅ El rol mínimo para **${label}** ahora es ${role}.`, '#00ff00')]
            });
        } catch (error) {
            logger.error(`Error al configurar rol de moderación:`, error);
            return interaction.reply({ content: '❌ Ocurrió un error al guardar la configuración.', ephemeral: true });
        }
    }
};