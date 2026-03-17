const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../../../database/database');
const { replyError, replySuccess } = require('../../../../utils/responses');
const logger = require('../../../../utils/logger');

module.exports = {
    async execute(interaction) {
        // Verificar permisos de administrador
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return replyError(interaction, 'Permiso denegado.');
        }

        const channelType = interaction.options.getString('tipo');
        const channel = interaction.options.getChannel('canal');

        try {
            // Guardar en la base de datos la configuración
            updateGuildConfig(interaction.guild.id, channelType, channel.id);
            
            let label = '';
            if (channelType === 'suggestions_channel_id') label = 'Sugerencias Principales';
            if (channelType === 'updates_channel_id') label = 'Sugerencias Implementadas (Novedades)';

            await replySuccess(interaction, `El canal para **${label}** ha sido establecido en ${channel}.`);
            logger.info(`[Suggestions] Canal ${channelType} configurado en ${channel.id} por ${interaction.user.tag}`);
        } catch (error) {
            logger.error('[Suggestions] Error al guardar configuración:', error);
            await replyError(interaction, 'Hubo un error al guardar la configuración en la base de datos.');
        }
    }
};
