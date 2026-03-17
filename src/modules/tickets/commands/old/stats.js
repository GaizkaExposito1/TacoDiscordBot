const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicketStats } = require('../../../database/database');
const { COLORS } = require('../../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticketstats')
        .setDescription('Muestra estadísticas detalladas de los tickets.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Solo staff

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Este comando solo funciona en servidores.', ephemeral: true });
        }

        const stats = getTicketStats(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('📊 Resumen de Actividad de Tickets')
            .setColor(COLORS.INFO)
            .setDescription(`**Desde el inicio de los registros**\n📂 **Total de Tickets Creados:** \`${stats.total}\`\n🔴 **Total de Tickets Cerrados:** \`${stats.closed}\``)
            .addFields(
                // SECCIÓN 1: ESTADO ACTUAL (Lo más importante para ver al momento)
                { 
                    name: '🟢 Tickets Activos (Ahora mismo)', 
                    value: `> **Abiertos:** \`${stats.currentOpen}\`\n> **✋ En atención:** \`${stats.currentClaimed}\`\n> **🔓 Esperando:** \`${stats.currentUnclaimed}\``, 
                    inline: false 
                },

                // Separador visual invisible si es necesario, pero con inline false arriba ya separa
                
                // SECCIÓN 2: HISTÓRICO DE ATENCIÓN
                { 
                    name: '📉 Histórico de Atención', 
                    value: `> **🙋 Alguna vez atendidos:** \`${stats.historicClaimed}\`\n> **👻 Nunca atendidos:** \`${stats.historicUnclaimed}\``, 
                    inline: false 
                }
            )
            .setFooter({ text: 'Tacoland Network | Sistema de Soporte' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
