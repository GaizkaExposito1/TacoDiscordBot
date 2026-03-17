const { EmbedBuilder } = require('discord.js');
const { getUserSancions, getUserTickets, getGuildConfig } = require('../../../../database/database');
const { replyError } = require('../../../../utils/responses');
const logger = require('../../../../utils/logger.js');

module.exports = {
    async execute(interaction) {
        const user = interaction.options.getUser('usuario');
        const guildId = interaction.guild.id;

        try {
            await interaction.deferReply({ ephemeral: true });

            const sanctions = getUserSancions(guildId, user.id);
            const tickets = getUserTickets(guildId, user.id);
            const config = getGuildConfig(guildId);

            // Verificar si el usuario que ejecuta el comando tiene el rol de "Directiva" (admin_role_id o admin_min_role_id)
            const member = interaction.member;
            const isAdmin = member.roles.cache.has(config.admin_role_id) || 
                          member.roles.cache.has(config.admin_min_role_id) || 
                          member.permissions.has('Administrator');

            const embed = new EmbedBuilder()
                .setTitle(`🔎 Auditoría de Usuario: ${user.tag}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setColor(0x5865F2)
                .setTimestamp();

            // --- SECCIÓN: SANCIONES ---
            let sanctionsText = sanctions.length > 0 
                ? sanctions.map(s => {
                    const date = new Date(s.timestamp + 'Z'); // Forzar lectura como UTC
                    return `• **${s.type.toUpperCase()}**: ${s.reason} (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
                }).join('\n')
                : '✅ Sin sanciones registradas.';
            
            if (sanctionsText.length > 1024) sanctionsText = sanctionsText.substring(0, 1021) + '...';
            embed.addFields({ name: `🛡️ Sanciones (${sanctions.length})`, value: sanctionsText });

            // --- SECCIÓN: TICKETS ---
            // Solo se muestra el historial de tickets si el usuario tiene rango de Directiva
            if (isAdmin) {
                const recentTickets = tickets.slice(0, 5);
                let ticketsText = tickets.length > 0
                    ? recentTickets.map(t => {
                        const status = t.status === 'closed' ? '📁 Cerrado' : '🔓 Abierto';
                        const transcript = t.transcript_url ? ` [[Transcript]](${t.transcript_url})` : '';
                        const date = new Date(t.created_at + 'Z'); // Forzar lectura como UTC
                        return `• Ticket #${t.id} - ${status}${transcript} (<t:${Math.floor(date.getTime() / 1000)}:R>)`;
                    }).join('\n')
                    : '🎫 Sin historial de tickets.';

                if (tickets.length > 5) ticketsText += `\n*...y ${tickets.length - 5} tickets más.*`;
                
                embed.addFields({ name: `🎫 Historial de Tickets (${tickets.length})`, value: ticketsText });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error(`[Lookup] Error al investigar al usuario ${user.id}:`, error);
            await replyError(interaction, 'Hubo un error al recuperar los datos del usuario.');
        }
    }
};
