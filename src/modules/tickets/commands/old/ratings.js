const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getLatestRatings, getGuildConfig } = require('../../../database/database');
const { replyError } = require('../../../utils/responses');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ratings')
        .setDescription('Muestra las últimas valoraciones de tickets.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El staff del que ver las valoraciones (Opcional)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('limite')
                .setDescription('Número de valoraciones a mostrar (máx 25)')
                .setMinValue(1)
                .setMaxValue(25)),

    async execute(interaction) {
        const limit = interaction.options.getInteger('limite') || 10;
        // Si se especifica usuario, lo usa. Si no, usa al que ejecuta el comando.
        const specifiedUser = interaction.options.getUser('usuario');
        const targetUser = specifiedUser || interaction.user;
        const guildId = interaction.guild.id;

        try {
            // Verificar permisos si intenta ver ratings de OTRO usuario
            if (specifiedUser && specifiedUser.id !== interaction.user.id) {
                const config = getGuildConfig(guildId);
                const adminRoleId = config ? config.admin_role_id : null;
                const hasAdminRole = adminRoleId ? interaction.member.roles.cache.has(adminRoleId) : false;
                const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || hasAdminRole;

                if (!isAdmin) {
                    return replyError(interaction, 'Ver valoraciones de otros miembros del staff requiere permisos de administrador.');
                }
            }

            // Pasamos targetUser.id como tercer argumento para filtrar por staff específico
            const ratings = getLatestRatings(guildId, limit, targetUser.id);

            if (!ratings || ratings.length === 0) {
                return interaction.reply({ content: `No hay valoraciones registradas para ${targetUser.username} aún.`, ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`🌟 Últimas Valoraciones de ${targetUser.username}`)
                .setColor('#FFD700') // Gold color
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            const fields = [];

            for (const ticket of ratings) {
                const user = await interaction.client.users.fetch(ticket.user_id).catch(() => null);
                // No necesitamos buscar al staff porque ya sabemos que es targetUser (o ticket.claimed_by/closed_by match)
                // Pero un ticket podria tener diferente claim/closed, aunque el filtro SQL asegura que uno de los dos es targetUser.
                // Mostraremos el rol que jugó (Reclamó o Cerró) si es necesario.
                
                const userDisplay = user ? user.username : 'Usuario desconocido';
                
                const stars = '⭐'.repeat(ticket.rating);
                // SQLite timestamps are UTC, add 'Z' to treat them as such in JS
                const timestamp = ticket.closed_at.endsWith('Z') ? ticket.closed_at : ticket.closed_at + 'Z';
                const date = new Date(timestamp).toLocaleDateString();
                
                let value = `**Usuario:** ${userDisplay}\n**Fecha:** ${date}`;
                if (ticket.rating_comment) {
                    value += `\n**Comentario:** *${ticket.rating_comment}*`;
                }

                fields.push({
                    name: `${stars} (Ticket #${ticket.ticket_id || ticket.id})`,
                    value: value,
                    inline: false
                });
            }

            embed.addFields(...fields);
            embed.setFooter({ text: 'Tacoland Network' });
            
            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error al obtener valoraciones:', error);
            await replyError(interaction, 'Ocurrió un error al obtener las valoraciones.');
        }
    },
};
