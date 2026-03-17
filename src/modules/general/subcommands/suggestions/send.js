const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getGuildConfig } = require('../../../../database/database');
const logger = require('../../../../utils/logger');

module.exports = {
    async execute(interaction) {
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

        // Crear el Modal
        const modal = new ModalBuilder()
            .setCustomId('suggestion_modal')
            .setTitle('Nueva Sugerencia');

        const suggestionInput = new TextInputBuilder()
            .setCustomId('suggestion_input')
            .setLabel("¿Qué te gustaría sugerir?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe tu idea detalladamente aquí...')
            .setMinLength(10)
            .setMaxLength(1000)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(suggestionInput);
        modal.addComponents(firstActionRow);

        // Mostrar el modal al usuario
        await interaction.showModal(modal);
    }
};
