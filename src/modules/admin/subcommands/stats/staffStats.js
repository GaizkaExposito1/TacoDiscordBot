const { EmbedBuilder } = require('discord.js');
const { getStaffStats, getGuildConfig } = require('../../../../database/database');
const { COLORS } = require('../../../../utils/constants');
const { replyError } = require('../../../../utils/responses');

/**
 * Muestra las estadísticas detalladas de un miembro del staff.
 */
async function execute(interaction) {
    const targetUser = interaction.options.getUser('staff') || interaction.user;
    const days = interaction.options.getInteger('dias') || 0; // 0 = Todo el tiempo
    const guildId = interaction.guild.id;

    try {
        await interaction.deferReply({ ephemeral: true });

        // Obtener estadísticas de la DB
        const stats = getStaffStats(guildId, targetUser.id, days > 0 ? days : null);
        const config = getGuildConfig(guildId);

        // Verificar si el usuario tiene rol de staff
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        const isStaff = member && (member.roles.cache.has(config.staff_role_id) || member.roles.cache.has(config.admin_role_id));

        const embed = new EmbedBuilder()
            .setTitle(`📊 Estadísticas de Staff: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setColor(isStaff ? COLORS.SUCCESS : COLORS.PRIMARY)
            .setTimestamp();

        const periodText = days > 0 ? `Últimos ${days} días` : 'Todo el tiempo';
        embed.setDescription(`Periodo analizado: **${periodText}**`);

        // Estrellas basadas en el rating
        const ratingAvg = stats.ratingAvg || 0;
        const fullStars = Math.floor(ratingAvg);
        const emptyStars = 5 - fullStars;
        const starsText = '⭐'.repeat(fullStars) + '▫️'.repeat(emptyStars);

        embed.addFields(
            { name: '✋ Tickets Reclamados', value: `\`${stats.claimed}\``, inline: true },
            { name: '📁 Tickets Cerrados', value: `\`${stats.closed}\``, inline: true },
            { name: '\u200B', value: '\u200B', inline: true }, // Spacer
            { name: '⭐ Valoración Media', value: `${starsText} (${ratingAvg.toFixed(1)})`, inline: true },
            { name: '💬 Total Valoraciones', value: `\`${stats.ratingCount}\``, inline: true },
            { name: '\u200B', value: '\u200B', inline: true } // Spacer
        );

        if (!isStaff) {
            embed.setFooter({ text: '⚠️ Este usuario no tiene asignado un rol de Staff en la configuración.' });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('[StaffStats] Error:', error);
        await replyError(interaction, 'Hubo un error al obtener las estadísticas del staff.');
    }
}

module.exports = execute;