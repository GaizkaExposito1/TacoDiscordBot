const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../../utils/logger.js');

// Importar subcomandos
const sendSuggestion = require('../subcommands/suggestions/send');
const setupSuggestions = require('../subcommands/suggestions/setup');
const suggestionAction = require('../subcommands/suggestions/action');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestions')
        .setDescription('Sistema de sugerencias de TacoLand')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
        // ------------------ SUBCOMANDO: SETUP ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configura canales del sistema (Solo Admin).')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('El tipo de canal a configurar.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Canal de Sugerencias Principal', value: 'suggestions_channel_id' },
                            { name: 'Canal de Sugerencias Implementadas', value: 'updates_channel_id' }
                        ))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('El canal seleccionado.')
                        .setRequired(true))
        )
        // ------------------ SUBCOMANDO: SEND ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Envía una nueva sugerencia al servidor.')
        )
        // ------------------ SUBCOMANDO: ACTION ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('action')
                .setDescription('Gestiona una sugerencia existente (Solo Staff).')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Copia el enlace del mensaje de la sugerencia (Click derecho -> Copiar enlace del mensaje).')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('estado')
                        .setDescription('El nuevo estado de la sugerencia.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Aceptada ✅', value: 'accepted' },
                            { name: 'Denegada ❌', value: 'denied' },
                            { name: 'En Desarrollo 🛠️', value: 'indev' },
                            { name: 'Implementada 🎉', value: 'implemented' }
                        ))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón o comentario adicional.')
                        .setRequired(false))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'setup') {
                return await setupSuggestions.execute(interaction);
            } else if (subcommand === 'send') {
                return await sendSuggestion.execute(interaction);
            } else if (subcommand === 'action') {
                return await suggestionAction.execute(interaction);
            }
        } catch (error) {
            logger.error(`[Suggestions] Error en subcomando ${subcommand}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'Hubo un error al ejecutar el comando.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'Hubo un error al ejecutar el comando.', ephemeral: true });
            }
        }
    }
};
