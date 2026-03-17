const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getStaffStats, getAllStaffStats, getGuildConfig } = require('../../../database/database');
const { replyError } = require('../../../utils/responses');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staffstats')
        .setDescription('Muestra las estadísticas de un miembro del staff o de todos.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Restringir a admins/roles altos por defecto
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El miembro del staff a consultar (Opcional)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('dias')
                .setDescription('Periodo de tiempo en días (Solo administradores)')
                .setMinValue(1)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario');
        const days = interaction.options.getInteger('dias'); // Si es null, mostrará histórico total
        const guildId = interaction.guild.id;

        try {
            // Verificar permisos si se intenta consultar otro usuario o ver leaderboard global
            const config = getGuildConfig(guildId);
            const adminRoleId = config ? config.admin_role_id : null;
            const hasAdminRole = adminRoleId ? interaction.member.roles.cache.has(adminRoleId) : false;
            const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || hasAdminRole;

            // Si se especifica un usuario distinto al propio, o si no se especifica usuario (Leaderboard global)
            // se requiere permiso de admin.
            // Excepción: Consultar tus propias estadísticas explícitamente es permitido.
            const isSelfQuery = targetUser && targetUser.id === interaction.user.id;
            
            if (!targetUser && !isAdmin) {
                 return replyError(interaction, 'Ver el ranking global del staff requiere permisos de administrador.');
            }

            if (targetUser && !isSelfQuery && !isAdmin) {
                return replyError(interaction, 'Ver estadísticas de otros miembros del staff requiere permisos de administrador.');
            }

            // Caso 1: Usuario específico
            if (targetUser) {
                const stats = getStaffStats(guildId, targetUser.id, days);

                // Calcular promedio con 1 decimal
                const avgRating = stats.ratingAvg ? parseFloat(stats.ratingAvg).toFixed(1) : 'N/A';
                
                const embed = new EmbedBuilder()
                    .setTitle(`📊 Estadísticas de Staff: ${targetUser.username}`)
                    .setColor('#0099ff')
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: 'Tickets Reclamados', value: stats.claimed.toString(), inline: true },
                        { name: 'Tickets Cerrados', value: stats.closed.toString(), inline: true },
                        { name: 'Valoración Media', value: `${avgRating} ⭐ (${stats.ratingCount} votos)`, inline: true },
                        { name: 'Periodo', value: days ? `Últimos ${days} días` : 'Histórico completo', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Tacoland Network' });

                await interaction.reply({ embeds: [embed] });
            } else {
                // Caso 2: Todos los miembros del staff (Leaderboard)

                const allStats = getAllStaffStats(guildId, days); // Devuelve array ordenado por claimed desc

                if (allStats.length === 0) {
                    return interaction.reply({ content: 'No hay datos de actividad del staff en el periodo seleccionado.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🏆 Ranking de Actividad del Staff`)
                    .setDescription(days ? `Actividad en los últimos ${days} días` : 'Histórico completo de actividad')
                    .setColor('#0099ff')
                    .setTimestamp();

                // Top 10
                const top10 = allStats.slice(0, 10);
                let description = '';

                for (let i = 0; i < top10.length; i++) {
                    const stat = top10[i];
                    const position = i + 1;
                    let medal = '';
                    if (position === 1) medal = '🥇 ';
                    else if (position === 2) medal = '🥈 ';
                    else if (position === 3) medal = '🥉 ';
                    else medal = `#${position} `;

                    const avg = stat.ratingAvg ? parseFloat(stat.ratingAvg).toFixed(1) : '-';
                    
                    description += `**${medal}<@${stat.staffId}>**\n`;
                    description += `> 📨 Reclamados: \`${stat.claimed}\` | 🔒 Cerrados: \`${stat.closed}\`\n`;
                    description += `> ⭐ Valoración: \`${avg}\` (${stat.ratingCount} votos)\n\n`;
                }
                
                embed.setDescription(description || 'No hay datos.')
                    .setFooter({ text: 'Tacoland Network' });
                
                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error al obtener estadísticas de staff:', error);
            await replyError(interaction, 'Ocurrió un error al obtener las estadísticas.');
        }
    },
};
