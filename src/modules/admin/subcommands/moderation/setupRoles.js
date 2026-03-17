const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../../../database/database');
const logger = require('../../../../utils/logger');
const { simpleEmbed } = require('../../../../utils/embeds');

module.exports = {
    async execute(interaction) {
        // Solo administradores de Discord pueden configurar esto por seguridad inicial
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Solo un Administrador de Discord puede configurar los roles de moderación.', ephemeral: true });
        }

        const type = interaction.options.getString('tipo');
        const role = interaction.options.getRole('rol');
        const guild = interaction.guild;

        try {
            const field = type === 'mod' ? 'mod_min_role_id' : 'admin_min_role_id';
            const label = type === 'mod' ? 'Moderación (Warn/Timeout/Kick)' : 'Administración (Ban/Remove Sanction)';

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