const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateSuggestionStatus } = require('../../../../database/database');
const { replyError, replySuccess } = require('../../../../utils/responses');
const logger = require('../../../../utils/logger');

module.exports = {
    async execute(interaction) {
        // Verificar permisos de Staff (ManageMessages o similar según tu config)
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return replyError(interaction, 'Permiso denegado.');
        }

        const messageUrl = interaction.options.getString('url');
        const action = interaction.options.getString('estado');
        const reason = interaction.options.getString('razon') || 'Sin razón proporcionada.';
        const guildId = interaction.guild.id;

        // Extraer IDs del mensajede del link (formato: https://discord.com/channels/guildId/channelId/messageId)
        const urlMatch = messageUrl.match(/\/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (!urlMatch) {
            return replyError(interaction, 'El enlace del mensaje no es válido. Haz click derecho en el mensaje de la sugerencia y selecciona "Copiar enlace del mensaje".');
        }
        
        const extractedChannelId = urlMatch[2];
        const messageId = urlMatch[3];

        const channel = interaction.guild.channels.cache.get(extractedChannelId);
        if (!channel) {
            return replyError(interaction, 'No se pudo encontrar el canal del mensaje. Asegúrate de que el bot tenga acceso a él.');
        }

        const config = getGuildConfig(guildId);

        try {
            const message = await channel.messages.fetch(messageId);
            if (!message || (message.author.id !== interaction.client.user.id && !message.webhookId) || !message.embeds[0]) {
                return replyError(interaction, 'No se encontró la sugerencia o el mensaje no es válido.');
            }

            const oldEmbed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed);

            let statusText = '';
            let color = 0x000000;
            let statusEmoji = '';

            switch (action) {
                case 'accepted':
                    statusText = 'Aceptada';
                    statusEmoji = '✅';
                    color = 0x00FF00;
                    break;
                case 'denied':
                    statusText = 'Denegada';
                    statusEmoji = '❌';
                    color = 0xFF0000;
                    break;
                case 'indev':
                    statusText = 'En Desarrollo';
                    statusEmoji = '🛠️';
                    color = 0x0099FF;
                    break;
                case 'implemented':
                    statusText = 'Implementada';
                    statusEmoji = '🎉';
                    color = 0xFFAA00;
                    break;
            }

            newEmbed.setColor(color);
            newEmbed.setTitle(`${statusEmoji} ${statusText}`);
            
            // Buscar si ya existe un campo con este estado para editarlo en lugar de añadir uno nuevo
            const fieldIndex = newEmbed.data.fields?.findIndex(f => f.name.includes(`(${statusText})`));
            const newFieldName = `Comentario (${statusText})`;
            
            if (fieldIndex !== undefined && fieldIndex !== -1) {
                // Editar campo existente
                newEmbed.data.fields[fieldIndex].value = reason;
            } else {
                // Añadir nuevo campo si la acción es diferente
                newEmbed.addFields({ name: newFieldName, value: reason });
            }

            await message.edit({ embeds: [newEmbed] });

            // Enviar a NOVEDADES/IMPLEMENTADAS si corresponde
            try {
                if (action === 'implemented' && config.updates_channel_id) {
                    const updateChannel = interaction.guild.channels.cache.get(config.updates_channel_id);
                    if (updateChannel) {
                        const updateEmbed = new EmbedBuilder()
                            .setTitle('🎉 ¡NUEVA MEJORA IMPLEMENTADA!')
                            .setDescription(oldEmbed.description || 'Sugerencia implementada')
                            .setColor(0xFFAA00)
                            .addFields({ name: 'Nota de la Actualización', value: reason })
                            .setFooter({ text: 'TacoLand Network - Novedades', iconURL: interaction.guild.iconURL() })
                            .setTimestamp();
                        
                        await updateChannel.send({ embeds: [updateEmbed] });
                        logger.info(`[Suggestions] Novedad enviada al canal ${config.updates_channel_id}`);
                    }
                }
            } catch (e) {
                logger.error('[Suggestions] Error al enviar novedad de sugerencia:', e);
            }

            // Actualizar en la base de datos
            updateSuggestionStatus(messageId, action, interaction.user.id, reason);

            // Opcional: Quitar reacciones originales para que no se siga votando algo ya decidido
            await message.reactions.removeAll().catch(() => {});

            await replySuccess(interaction, `Sugerencia actualizada a: **${statusText}**.`);
            logger.info(`[Suggestions] Sugerencia ${messageId} marcada como ${action} por ${interaction.user.tag}`);
        } catch (error) {
            logger.error('[Suggestions] Error al procesar acción de sugerencia:', error);
            await replyError(interaction, 'Asegúrate de que la ID del mensaje sea correcta y esté en el canal de sugerencias.');
        }
    }
};
