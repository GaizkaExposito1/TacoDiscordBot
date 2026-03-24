const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDatabase, getGuildConfig, addPermTimeout, cacheUser } = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');
const logger = require('../../../../utils/logger');
const { simpleEmbed } = require('../../../../utils/embeds');

/**
 * Comprueba si el usuario ha alcanzado el umbral de warns y ejecuta la acción automática.
 * @returns {Promise<string|null>} Mensaje con la acción tomada, o null si no aplica.
 */
async function checkWarnThreshold(guild, targetUser, targetMember, config) {
    const threshold = config.warn_threshold ?? 0;
    const action    = config.warn_action ?? 'none';
    if (threshold === 0 || action === 'none') return null;

    const db = getDatabase();
    const now = new Date().toISOString();
    const { count } = db
        .prepare("SELECT COUNT(*) as count FROM sanctions WHERE guild_id = ? AND user_id = ? AND type = 'warn' AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)")
        .get(guild.id, targetUser.id, now);

    if (count < threshold) return null;

    const duration = config.warn_action_duration || null;

    try {
        if (action === 'timeout') {
            const durationMs = parseDuration(duration);
            if (durationMs && durationMs !== 'PERM') {
                await targetMember.timeout(durationMs, `Auto-acción: ${threshold} warns acumulados`);
                return `⚡ Acción automática: **timeout ${duration}** aplicado (${count} warns activos).`;
            }
        } else if (action === 'kick') {
            await targetMember.kick(`Auto-acción: ${threshold} warns acumulados`);
            return `⚡ Acción automática: **kick** aplicado (${count} warns activos).`;
        } else if (action === 'ban') {
            await guild.members.ban(targetUser.id, { reason: `Auto-acción: ${threshold} warns acumulados` });
            return `⚡ Acción automática: **ban** aplicado (${count} warns activos).`;
        }
    } catch (err) {
        logger.error('[Actions] Error ejecutando acción automática de warn:', err);
    }
    return null;
}

/**
 * Registra una sanción en la base de datos.
 */
function recordSanction(guildId, userId, moderatorId, type, reason, duration = null, expiresAt = null) {
    const db = getDatabase();
    try {
        const stmt = db.prepare(`
            INSERT INTO sanctions (guild_id, user_id, moderator_id, type, reason, duration, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(guildId, userId, moderatorId, type, reason, duration, expiresAt);
    } catch (error) {
        logger.error(`[Moderation] Error registrando sanción (${type}) para ${userId}:`, error);
    }
}

/**
 * Envía un DM al usuario notificado.
 */
async function sendSanctionDM(user, guild, type, reason, duration = null) {
    try {
        const typeLabels = {
            'warn': 'Advertencia (Warn)',
            'timeout': 'Aislamiento (Timeout/Mute)',
            'kick': 'Expulsión (Kick)',
            'ban': 'Baneo (Ban)'
        };

        const embed = new EmbedBuilder()
            .setTitle(`Sanción recibida en ${guild.name}`)
            .setDescription(`Has recibido una sanción de tipo: **${typeLabels[type] || type}**`)
            .addFields(
                { name: 'Razón', value: reason || 'Sin razón proporcionada' }
            )
            .setColor(type === 'ban' ? '#ff0000' : type === 'timeout' ? '#ffaa00' : '#ffff00')
            .setTimestamp()
            .setFooter({ text: guild.name, iconURL: guild.iconURL() });

        if (duration) {
            embed.addFields({ name: 'Duración', value: duration });
        }

        await user.send({ embeds: [embed] });
        return true;
    } catch (error) {
        logger.warn(`No se pudo enviar DM a ${user.tag}: ${error.message}`);
        return false;
    }
}

// Función auxiliar para parsear tiempo (ej: 1h, 1d) a milisegundos
function parseDuration(durationStr) {
    if (!durationStr) return null;
    const lower = durationStr.toLowerCase();
    if (lower === 'perm' || lower === 'permanente') return 'PERM';

    const regex = /^(\d+)([smhdMy])$/;
    const match = durationStr.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
        's': 1000,
        'm': 1000 * 60,
        'h': 1000 * 60 * 60,
        'd': 1000 * 60 * 60 * 24,
        'M': 1000 * 60 * 60 * 24 * 30,
        'y': 1000 * 60 * 60 * 24 * 365
    };

    return value * multipliers[unit];
}

module.exports = {
    async execute(interaction) {
        const action = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón proporcionada';
        const moderator = interaction.user;
        const guild = interaction.guild;

        // --- VERIFICACIÓN DE ROLES ---
        const config = getGuildConfig(guild.id);
        const requiredLevel = ['ban'].includes(action) ? 'admin' : 'mod';
        if (!await requireLevel(interaction, config, requiredLevel)) return;
        // --- FIN DE VERIFICACIÓN DE ROLES ---

        // Cachear nombres de usuario para el panel web
        cacheUser(targetUser.id, targetUser.globalName ?? targetUser.username);
        cacheUser(moderator.id, moderator.globalName ?? moderator.username);

        // Verificar si el bot tiene permisos
        if (!guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({ content: '❌ No tengo permisos suficientes para moderar miembros.', ephemeral: true });
        }

        // Obtener el miembro del servidor
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember && (action === 'warn' || action === 'timeout' || action === 'kick')) {
            return interaction.reply({ content: '❌ El usuario no está en el servidor.', ephemeral: true });
        }

        // Verificar jerarquía
        if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ No puedes moderar a alguien con un rango igual o superior al tuyo.', ephemeral: true });
        }

        let dmStatus = '';
        
        try {
            if (action === 'warn') {
                const expiracionStr = interaction.options.getString('expiracion');
                let expiresAt = null;
                let expiracionLabel = '';
                if (expiracionStr) {
                    const ms = parseDuration(expiracionStr);
                    if (!ms || ms === 'PERM') {
                        return interaction.reply({ content: '❌ Formato de expiración inválido. Usa: 1h, 1d, 7d, 30d.', ephemeral: true });
                    }
                    expiresAt = new Date(Date.now() + ms).toISOString();
                    expiracionLabel = `\n**Expira en:** ${expiracionStr}`;
                }

                recordSanction(guild.id, targetUser.id, moderator.id, 'warn', reason, null, expiresAt);
                const dmSent = await sendSanctionDM(targetUser, guild, 'warn', reason);
                dmStatus = dmSent ? ' (DM enviado)' : ' (No se pudo enviar DM)';

                const autoMsg = await checkWarnThreshold(guild, targetUser, targetMember, config);

                return interaction.reply({ 
                    embeds: [simpleEmbed(
                        'Warn Aplicado',
                        `✅ **${targetUser.tag}** ha sido advertido.\n**Razón:** ${reason}${expiracionLabel}${dmStatus}${autoMsg ? `\n\n${autoMsg}` : ''}`,
                        '#ffff00'
                    )] 
                });

            } else if (action === 'timeout') {
                const durationStr = interaction.options.getString('duracion');
                const durationMs = parseDuration(durationStr);

                if (!durationMs) {
                    return interaction.reply({ content: '❌ Formato de duración inválido. Usa: 10m, 1h, 1d, 28d o `perm` para permanente.', ephemeral: true });
                }

                if (durationMs === 'PERM') {
                    const maxMs = 28 * 24 * 60 * 60 * 1000;
                    await targetMember.timeout(maxMs, reason);
                    addPermTimeout(guild.id, targetUser.id, reason);
                    recordSanction(guild.id, targetUser.id, moderator.id, 'timeout', reason, 'permanente');
                    const dmSent = await sendSanctionDM(targetUser, guild, 'timeout', reason, 'Permanente');
                    dmStatus = dmSent ? ' (DM enviado)' : ' (No se pudo enviar DM)';
                    return interaction.reply({
                        embeds: [simpleEmbed('Timeout Permanente Aplicado', `✅ **${targetUser.tag}** ha sido silenciado **permanentemente**.\n**Razón:** ${reason}${dmStatus}`, '#ff6600')]
                    });
                }

                if (durationMs > 2419200000) {
                    return interaction.reply({ content: '❌ El tiempo máximo de timeout es de 28 días. Usa `perm` para timeout permanente.', ephemeral: true });
                }

                await targetMember.timeout(durationMs, reason);
                recordSanction(guild.id, targetUser.id, moderator.id, 'timeout', reason, durationStr);
                // Asignar rol silenciado si está configurado
                const silenciadoRoleId = config.silenciado_role_id;
                if (silenciadoRoleId) await targetMember.roles.add(silenciadoRoleId, `Timeout ${durationStr} aplicado`).catch(() => {});
                
                const dmSent = await sendSanctionDM(targetUser, guild, 'timeout', reason, durationStr);
                dmStatus = dmSent ? ' (DM enviado)' : ' (No se pudo enviar DM)';

                return interaction.reply({ 
                    embeds: [simpleEmbed('Timeout Aplicado', `✅ **${targetUser.tag}** ha sido silenciado por **${durationStr}**.\n**Razón:** ${reason}${dmStatus}`, '#ffaa00')] 
                });

            } else if (action === 'kick') {
                const dmSent = await sendSanctionDM(targetUser, guild, 'kick', reason);
                dmStatus = dmSent ? ' (DM enviado)' : ' (No se pudo enviar DM)';
                
                await targetMember.kick(reason);
                recordSanction(guild.id, targetUser.id, moderator.id, 'kick', reason);

                return interaction.reply({ 
                    embeds: [simpleEmbed('Usuario Expulsado', `✅ **${targetUser.tag}** ha sido expulsado.\n**Razón:** ${reason}${dmStatus}`, '#ff5500')] 
                });

            } else if (action === 'ban') {
                const durationStr = interaction.options.getString('duracion');
                const durationMs = durationStr ? parseDuration(durationStr) : null;
                
                const dmSent = await sendSanctionDM(targetUser, guild, 'ban', reason, durationStr);
                dmStatus = dmSent ? ' (DM enviado)' : ' (No se pudo enviar DM)';
                
                await guild.members.ban(targetUser.id, { reason });
                recordSanction(guild.id, targetUser.id, moderator.id, 'ban', reason, durationStr);

                if (durationMs) {
                    const db = getDatabase();
                    const unbanAt = new Date(Date.now() + durationMs).toISOString();
                    db.prepare('INSERT INTO temp_bans (guild_id, user_id, unban_at) VALUES (?, ?, ?)').run(guild.id, targetUser.id, unbanAt);
                }

                const banType = durationStr ? `temporal por **${durationStr}**` : 'permanente';
                return interaction.reply({ 
                    embeds: [simpleEmbed('Usuario Baneado', `✅ **${targetUser.tag}** ha sido baneado ${banType}.\n**Razón:** ${reason}${dmStatus}`, '#ff0000')] 
                });
            }

        } catch (error) {
            logger.error(`Error al procesar sanción ${action}:`, error);
            return interaction.reply({ content: `❌ No se pudo ejecutar la acción: ${error.message}`, ephemeral: true });
        }
    }
};