const { Events, AuditLogEvent, EmbedBuilder } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');
const { createLogEmbed } = require('../utils/logEmbed');
const { getGuildConfig, removePermTimeout } = require('../../../database/database');
const logger = require('../../../utils/logger');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (!oldMember.guild || !newMember.guild) return;
        const guild = newMember.guild;

        // ─── Detectar fin de timeout → quitar rol Silenciado ───────────────────
        const wasTimedOut = oldMember.communicationDisabledUntil && new Date(oldMember.communicationDisabledUntil) > new Date();
        const isTimedOut = newMember.isCommunicationDisabled();
        if (wasTimedOut && !isTimedOut) {
            try {
                const botConfig = getGuildConfig(guild.id);
                if (botConfig?.silenciado_role_id) {
                    const role = guild.roles.cache.get(botConfig.silenciado_role_id);
                    if (role && newMember.roles.cache.has(role.id)) {
                        await newMember.roles.remove(role, 'Timeout expirado').catch(() => {});
                        // Si el usuario tenía timeout permanente registrado, limpiarlo también
                        removePermTimeout(guild.id, newMember.id);
                    }
                }
            } catch (err) {
                logger.warn(`[GuildMemberUpdate] Error al quitar rol silenciado: ${err.message}`);
            }
        }
        // ───────────────────────────────────────────────────────────────────────

        const config = getAuditConfig(guild.id);
        if (!config) return;
        if (!config) return;

        // 1. Roles
        if (config.log_member_role_update) {
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0 || removedRoles.size > 0) {
                // Fetch audit log
                let executor = null;
                try {
                    const logs = await guild.fetchAuditLogs({
                        limit: 1,
                        type: AuditLogEvent.MemberRoleUpdate,
                    });
                    const entry = logs.entries.first();
                    if (entry && entry.target.id === newMember.id && (Date.now() - entry.createdTimestamp) < 5000) {
                        executor = entry.executor;
                    }
                } catch (e) {}

                // Construir descripción
                let desc = `Usuario: ${newMember} (\`${newMember.id}\`)\n`;
                if (addedRoles.size > 0) desc += `✅ **Añadido:** ${addedRoles.map(r => r).join(', ')}\n`;
                if (removedRoles.size > 0) desc += `❌ **Eliminado:** ${removedRoles.map(r => r).join(', ')}`;

                const embed = new EmbedBuilder()
                    .setTitle('🛡️ Roles Actualizados')
                    .setColor('#7289da')
                    .setDescription(desc)
                    .setTimestamp();
                
                if (executor) {
                    embed.setFooter({ text: `Autor: ${executor.tag}`, iconURL: executor.displayAvatarURL() });
                }

                await sendAuditLog(guild, 'log_member_role_update', embed);
            }
        }

        // 2. Nicknames
        if (config.log_member_update) {
            if (oldMember.nickname !== newMember.nickname) {
                const oldNick = oldMember.nickname || oldMember.user.username;
                const newNick = newMember.nickname || newMember.user.username; // Si se quita el nick vuelve al username

                const embed = new EmbedBuilder()
                    .setTitle('👤 Nickname Cambiado')
                    .setColor('#3498db')
                    .addFields(
                        { name: 'Usuario', value: `${newMember} (\`${newMember.id}\`)` },
                        { name: 'Antes', value: `\`${oldNick}\``, inline: true },
                        { name: 'Ahora', value: `\`${newNick}\``, inline: true }
                    )
                    .setTimestamp();

                await sendAuditLog(guild, 'log_member_update', embed);
            }
        }
    },
};
