const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig, getWelcomeRoles } = require('../database/database');
const { replacePlaceholders } = require('../utils/placeholders');
const logger = require('../utils/logger');

const DEFAULT_WELCOME = '¡Bienvenido/a {user} a **{server}**! Esperamos que lo pases genial 🎉';

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        if (member.user.bot) return;
        const guildId = member.guild.id;

        try {
            const config = getGuildConfig(guildId);

            // ── Auto-roles ────────────────────────────────────────────
            const welcomeRoles = getWelcomeRoles(guildId);
            if (welcomeRoles.length > 0) {
                for (const { role_id } of welcomeRoles) {
                    const role = member.guild.roles.cache.get(role_id);
                    if (role) {
                        await member.roles.add(role).catch(err =>
                            logger.warn(`[Welcome] No se pudo asignar el rol ${role_id} a ${member.user.tag}: ${err.message}`)
                        );
                    }
                }
            }

            // ── Mensaje de bienvenida ──────────────────────────────────
            if (!config?.welcome_channel_id || config.welcome_enabled === 0) return;

            const channel = member.guild.channels.cache.get(config.welcome_channel_id);
            if (!channel) return;

            await member.guild.members.fetch();
            const memberCount = member.guild.members.cache.filter(m => !m.user.bot).size;
            const rawMessage = config.welcome_message || DEFAULT_WELCOME;

            const description = replacePlaceholders(rawMessage, {
                user: `<@${member.id}>`,
                username: member.user.username,
                userTag: member.user.tag,
                userId: member.id,
                server: member.guild.name,
                memberCount,
            });

            const embed = new EmbedBuilder()
                .setTitle('Bienvenido')
                .setDescription(description)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setColor(0x57F287)
                .setFooter({
                    text: `${member.guild.name} · Miembro #${memberCount}`,
                    iconURL: member.guild.iconURL({ dynamic: true }) ?? undefined,
                })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            logger.info(`[Welcome] Bienvenida enviada para ${member.user.tag} en ${member.guild.name}`);
        } catch (error) {
            logger.error(`[Welcome] Error en guildMemberAdd:`, error);
        }
    },
};
