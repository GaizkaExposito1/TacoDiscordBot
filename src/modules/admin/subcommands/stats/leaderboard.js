const { EmbedBuilder } = require('discord.js');
const { getAllStaffStats } = require('../../../../database/database');
const { COLORS } = require('../../../../utils/constants');
const { replyError } = require('../../../../utils/responses');

/**
 * Muestra el ranking de los miembros del staff basándose en tickets reclamados.
 */
async function execute(interaction) {
    const period = interaction.options.getInteger('periodo') || 7; // Por defecto 7 días
    const guildId = interaction.guild.id;

    try {
        await interaction.deferReply({ ephemeral: false });

        // Obtener estadísticas de todo el staff
        const staffStats = getAllStaffStats(guildId, period);

        if (staffStats.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setTitle(`🏆 Leaderboard de Staff (${period} días)`)
                .setDescription('❌ No hay datos de actividad para ningún miembro del staff en este periodo.')
                .setColor(COLORS.WARNING);
            return await interaction.editReply({ embeds: [emptyEmbed] });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Ranking de Staff - Top 10`)
            .setDescription(`Actividad en los últimos **${period} días**.\nEl ranking se basa en el número de tickets reclamados.`)
            .setColor(COLORS.INFO)
            .setTimestamp();

        // Limitar a top 10 y construir el ranking
        const top10 = staffStats.slice(0, 10);
        let rankingText = '';

        for (let i = 0; i < top10.length; i++) {
            const s = top10[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`${i + 1}.\``;
            
            // Intentar obtener el nombre del usuario por su ID
            const user = await interaction.client.users.fetch(s.staffId).catch(() => null);
            const userTag = user ? `**${user.username}**` : `ID: \`${s.staffId}\``;
            
            const ratingText = s.ratingCount > 0 ? `⭐ ${s.ratingAvg.toFixed(1)}` : '❌ s/v';
            
            rankingText += `${medal} ${userTag} ── **${s.claimed}** reclamados / **${s.closed}** cerrados ( ${ratingText} )\n`;
        }

        embed.addFields({ 
            name: '📈 Clasificación Detallada', 
            value: rankingText || 'No hay datos disponibles.' 
        });

        // Información adicional
        const bestStaff = top10[0];
        const bestUser = await interaction.client.users.fetch(bestStaff.staffId).catch(() => null);
        if (bestUser) {
            embed.setFooter({ 
                text: `¡Felicidades a ${bestUser.username} por liderar el ranking!`, 
                iconURL: bestUser.displayAvatarURL() 
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[Leaderboard] Error:', error);
        await replyError(interaction, 'Hubo un error al obtener el ranking del staff.');
    }
}

module.exports = execute;