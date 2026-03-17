const { EmbedBuilder } = require('discord.js');
const { getDatabase } = require('../../../../database/database');
const logger = require('../../../../utils/logger');
const { simpleEmbed } = require('../../../../utils/embeds');

module.exports = {
    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        const guild = interaction.guild;
        const db = getDatabase();

        try {
            const sanctions = db.prepare(`
                SELECT id, type, reason, moderator_id, duration, status, timestamp 
                FROM sanctions 
                WHERE guild_id = ? AND user_id = ?
                ORDER BY timestamp DESC
                LIMIT 10
            `).all(guild.id, targetUser.id);

            const stats = db.prepare(`
                SELECT type, status, COUNT(*) as count 
                FROM sanctions 
                WHERE guild_id = ? AND user_id = ?
                GROUP BY type, status
            `).all(guild.id, targetUser.id);

            const statsMap = { warn: 0, timeout: 0, kick: 0, ban: 0 };
            stats.forEach(s => { 
                if (s.status === 'active') {
                    statsMap[s.type] += s.count; 
                }
            });

            const embed = new EmbedBuilder()
                .setTitle(`Historial de Sanciones: ${targetUser.tag}`)
                .setDescription(`👤 **Usuario:** <@${targetUser.id}> (\`${targetUser.id}\`)\n\n` +
                    `📊 **Resumen de Sanciones:**\n` + 
                    `└ ⚠ Warns: **${statsMap.warn}**\n` +
                    `└ 🔇 Timeouts: **${statsMap.timeout}**\n` +
                    `└ 👢 Kicks: **${statsMap.kick}**\n` +
                    `└ 🚫 Bans: **${statsMap.ban}**\n\n` +
                    `📅 Total de sanciones: **${statsMap.warn + statsMap.timeout + statsMap.kick + statsMap.ban}**`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .setColor(statsMap.ban > 0 ? '#ff0000' : statsMap.timeout > 0 ? '#ffaa00' : statsMap.warn > 0 ? '#ffff00' : '#00ff00')
                .setFooter({ text: `Consultado por: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (sanctions.length === 0) {
                embed.addFields({ 
                    name: 'ℹ Sin registros', 
                    value: 'Este usuario no tiene ninguna sanción registrada en el historial.' 
                });
            } else {
                sanctions.forEach((s) => {
                    const moderatorTag = interaction.client.users.cache.get(s.moderator_id)?.tag || `ID: ${s.moderator_id}`;
                    const moderatorInfo = `${moderatorTag} (\`${s.moderator_id}\`)`;
                    const typeLabels = { 'warn': '🟡 Warn', 'timeout': '🟠 Timeout', 'kick': '🔴 Kick', 'ban': '🖤 Ban' };
                    const statusLabels = { 'active': '', 'revoked': ' ❌ (Revocada)', 'expired': ' ⏳ (Expirada)' };
                    const label = `${typeLabels[s.type]}${statusLabels[s.status] || ''}`;
                    
                    // Aseguramos que la fecha se interprete como UTC al leer de SQLite
                    // sqlite usa datetime('now') que es UTC por defecto
                    const timestamp = s.timestamp.endsWith('Z') ? s.timestamp : s.timestamp + 'Z';
                    const date = new Date(timestamp);
                    const timeStr = `<t:${Math.floor(date.getTime() / 1000)}:R>`;
                    const idBadge = `ID: \`#${s.id}\``;
                    
                    let details = `**Mod:** ${moderatorInfo}\n` +
                                `**Razón:** \`${s.reason}\``;
                    
                    if (s.duration) details += `\n**Tiempo:** \`${s.duration}\``;
                    details += `\n**Fecha:** ${timeStr}`;

                    embed.addFields({ 
                        name: `${label} (${idBadge})`, 
                        value: details,
                        inline: false
                    });
                });
            }

            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            logger.error(`Error al obtener historial de sanciones para ${targetUser.id}:`, error);
            return interaction.reply({ content: '❌ Ocurrió un error al obtener el historial.', ephemeral: true });
        }
    }
};