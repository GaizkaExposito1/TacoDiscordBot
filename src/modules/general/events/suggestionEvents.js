const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, createSuggestionRecord } = require('../../../database/database');
const logger = require('../../../utils/logger');

module.exports = {
    name: 'ready',
    once: true,

    execute(client) {
        // ─── Modal Submit: Enviar Sugerencia ───
        client.modals.set('suggestion_modal', async (interaction) => {
            const content = interaction.fields.getTextInputValue('suggestion_input');
            const guildId = interaction.guild.id;

            // Obtener el canal configurado
            const config = getGuildConfig(guildId);
            const channelId = config ? config.suggestions_channel_id : null;

            if (!channelId) {
                return interaction.reply({ 
                    content: '❌ El sistema de sugerencias no está configurado. Un administrador debe usar `/suggestions setup`.', 
                    ephemeral: true 
                });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) {
                return interaction.reply({ 
                    content: '❌ No se pudo encontrar el canal de sugerencias configurado. Por favor, re-configúralo.', 
                    ephemeral: true 
                });
            }

            try {
                // Diferir la respuesta inmediatamente para evitar que la interacción expire (3s limite)
                await interaction.deferReply({ ephemeral: true });

                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `Sugerencia de ${interaction.user.tag}`, 
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                    })
                    .setDescription(content)
                    .setColor(0xFFAA00)
                    .setFooter({ text: 'TacoLand Suggestions', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();

                const message = await channel.send({ embeds: [embed] });
                
                // Guardar en la base de datos
                createSuggestionRecord(guildId, channelId, message.id, interaction.user.id, content);

                // Añadir reacciones automáticas para votación (pueden tardar, por eso usamos defer)
                await message.react('✅');
                await message.react('❌');

                await interaction.editReply({ content: '✅ ¡Tu sugerencia ha sido enviada con éxito!' });
                logger.info(`[Suggestions] Sugerencia enviada por ${interaction.user.tag} vía modal`);
            } catch (error) {
                logger.error('[Suggestions] Error al enviar sugerencia desde el modal:', error);
                
                // Si ya diferimos la respuesta, usamos editReply
                if (interaction.deferred) {
                    await interaction.editReply({ content: '❌ Hubo un error al enviar tu sugerencia al canal.' });
                } else {
                    await interaction.reply({ content: '❌ Hubo un error al enviar tu sugerencia al canal.', ephemeral: true });
                }
            }
        });

        logger.info('[Suggestions] Eventos de sugerencias registrados.');
    }
};
