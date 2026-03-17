const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { deleteTicketHistory } = require('../../../database/database');
const { replyError, replySuccess } = require('../../../utils/responses');
const logger = require('../../../utils/logger');
const { COLORS } = require('../../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('borrar-tickets')
        .setDescription('¡PELIGRO! Borra TODO el historial de tickets y reinicia el contador #0001.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Doble confirmación
        const confirmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Acción Destructiva')
            .setDescription('Estás a punto de borrar **TODO el historial de tickets**.\n\nEsto eliminará:\n- Todos los registros de tickets cerrados y abiertos de la base de datos.\n- Reiniciará el contador de tickets a #0001.\n- Estadísticas de staff.\n\n¿Estás seguro? Escribe `CONFIRMAR` para proceder.')
            .setColor(COLORS.DANGER);

        await interaction.reply({ embeds: [confirmEmbed], fetchReply: true });

        const filter = m => m.author.id === interaction.user.id;
        // Solo esperamos 1 mensaje
        const collector = interaction.channel.createMessageCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async m => {
            if (m.content === 'CONFIRMAR') {
                try {
                    deleteTicketHistory(interaction.guild.id);
                    logger.warn(`[Admin] El usuario ${interaction.user.tag} ha borrado el historial de tickets en ${interaction.guild.name}`);
                    
                    const successEmbed = new EmbedBuilder()
                        .setTitle('♻️ Historial Reiniciado')
                        .setDescription('Se han eliminado todos los registros y reiniciado los contadores.')
                        .setColor(COLORS.SUCCESS)
                        .setTimestamp();
                        
                    await m.reply({ embeds: [successEmbed] });
                } catch (error) {
                    logger.error('Error al borrar historial de tickets:', error);
                    await m.reply({ content: 'Hubo un error al intentar borrar el historial.', ephemeral: true });
                }
            } else {
                await m.reply({ content: 'Operación cancelada. El código de confirmación no es correcto.', ephemeral: true });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.followUp({ content: 'Tiempo de espera agotado. Operación cancelada.', ephemeral: true });
            }
        });
    }
};