const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../../../../utils/logger.js');
const { COLORS } = require('../../../../utils/constants');
const { getGuildConfig } = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');

module.exports = {
    async execute(interaction) {
        const config = getGuildConfig(interaction.guild.id);
        if (!await requireLevel(interaction, config, 'op')) return;
        try {
            const tipo = interaction.options.getString('tipo');
            const mencion = interaction.options.getString('mencion'); 
            const rol = interaction.options.getRole('rol');
            const channel = interaction.options.getChannel('canal') || interaction.channel;

            // Crear el modal
            const modal = new ModalBuilder()
                .setCustomId(`modal_anuncet_${interaction.id}`) 
                .setTitle('Redactar Anuncio');

            const mensajeInput = new TextInputBuilder()
                .setCustomId('mensajeInput')
                .setLabel("Contenido del anuncio")
                .setPlaceholder("Escribe aquí tu mensaje largo...")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMaxLength(4000);

            const firstActionRow = new ActionRowBuilder().addComponents(mensajeInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

            try {
                const modalInteraction = await interaction.awaitModalSubmit({
                    filter: (i) => i.customId === `modal_anuncet_${interaction.id}` && i.user.id === interaction.user.id,
                    time: 900000 // 15 min
                });

                const mensaje = modalInteraction.fields.getTextInputValue('mensajeInput');
                
                let embedColor;
                let embedTitle;

                switch (tipo) {
                    case 'error':
                        embedColor = COLORS.DANGER;
                        embedTitle = '❌ Error';
                        break;
                    case 'incidencia':
                        embedColor = COLORS.WARNING;
                        embedTitle = '⚠️ Incidencia';
                        break;
                    case 'anuncio':
                        embedColor = COLORS.PRIMARY;
                        embedTitle = '📢 Anuncio';
                        break;
                    case 'normal':
                    default:
                        embedColor = COLORS.INFO;
                        embedTitle = 'ℹ️ Información';
                        break;
                }

                const embed = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle(embedTitle)
                    .setDescription(mensaje)
                    .setFooter({ 
                        text: 'Tacoland High Staff', 
                        iconURL: interaction.guild.iconURL() 
                    })
                    .setTimestamp();

                const payload = { embeds: [embed] };
                if (mencion) {
                    payload.content = mencion;
                } else if (rol) { 
                    payload.content = `<@&${rol.id}>`; 
                }

                const sentMessage = await channel.send(payload);

                await modalInteraction.reply({ 
                    content: `✅ Anuncio de tipo **${tipo}** enviado correctamente a ${channel}. [Ver mensaje](${sentMessage.url})`, 
                    ephemeral: true 
                });

            } catch (err) {
                if (err.code === 'InteractionCollectorError') {
                    logger.debug('[Anuncio] Modal timeout or cancelled by user.');
                } else {
                    throw err;
                }
            }

        } catch (error) {
            logger.error('[Anuncio] Error al procesar comando:', error);
            if (!interaction.replied && !interaction.deferred) {
                 // await interaction.reply({ content: 'Hubo un error al preparar el anuncio.', ephemeral: true });
            }
        }
    }
};
