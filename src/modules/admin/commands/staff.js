const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../../utils/logger.js');

// Importar subcomandos
const staffStats = require('../subcommands/stats/staffStats');
const leaderboard = require('../subcommands/stats/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff')
        .setDescription('Comandos de estadísticas y gamificación de Staff')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        // ------------------ SUBCOMANDO: STATS ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Muestra las estadísticas detalladas de un miembro del staff.')
                .addUserOption(option => 
                    option.setName('staff')
                        .setDescription('El miembro del staff a consultar.')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('dias')
                        .setDescription('Mostrar datos de los últimos X días. Dejar vacío para histórico total.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: LEADERBOARD ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Muestra el ranking de actividad del staff.')
                .addIntegerOption(option =>
                    option.setName('periodo')
                        .setDescription('Periodo de tiempo en días (ej: 7, 30).')
                        .setRequired(false))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'stats':
                    await staffStats(interaction);
                    break;
                case 'leaderboard':
                    await leaderboard(interaction);
                    break;
                default:
                    await interaction.reply({ content: 'Subcomando no reconocido.', ephemeral: true });
            }
        } catch (error) {
            logger.error(`[StaffCommand] Error al ejecutar subcomando ${subcommand}:`, error);
        }
    }
};