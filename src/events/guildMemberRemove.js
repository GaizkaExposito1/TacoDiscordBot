const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig } = require('../database/database');
const { replacePlaceholders } = require('../utils/placeholders');
const logger = require('../utils/logger');

const DEFAULT_GOODBYE = 'Adiós, **{username}**. Gracias por ser parte de **{server}** 👋';

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,

    async execute(member) {
        if (member.user.bot) return;
        try {
            const config = getGuildConfig(member.guild.id);

            if (!config?.welcome_channel_id || config.goodbye_enabled === 0) return;

            const channel = member.guild.channels.cache.get(config.welcome_channel_id);
            if (!channel) return;

            await member.guild.members.fetch();
            const memberCount = member.guild.members.cache.filter(m => !m.user.bot).size;
            const rawMessage = config.goodbye_message || DEFAULT_GOODBYE;

            const description = replacePlaceholders(rawMessage, {
                user: `<@${member.id}>`,
                username: member.user.username,
                userTag: member.user.tag,
                userId: member.id,
                server: member.guild.name,
                memberCount,
            });

            const embed = new EmbedBuilder()
                .setTitle('Adiós')
                .setDescription(description)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setColor(0xED4245)
                .setFooter({
                    text: `${member.guild.name} · Ahora somos ${memberCount} miembros`,
                    iconURL: member.guild.iconURL({ dynamic: true }) ?? undefined,
                })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
            logger.info(`[Goodbye] Despedida enviada para ${member.user.tag} en ${member.guild.name}`);
        } catch (error) {
            logger.error(`[Goodbye] Error en guildMemberRemove:`, error);
        }
    },
};
