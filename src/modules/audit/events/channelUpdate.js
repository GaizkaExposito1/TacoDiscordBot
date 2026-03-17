const { Events, EmbedBuilder, ChannelType, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { getAuditConfig } = require('../utils/auditDb');
const { sendAuditLog } = require('../utils/auditLogger');

// Mapeo amigable de permisos
const PERM_NAMES = {
    [PermissionFlagsBits.CreateInstantInvite.toString()]: 'Crear Invitación',
    [PermissionFlagsBits.KickMembers.toString()]: 'Expulsar Miembros',
    [PermissionFlagsBits.BanMembers.toString()]: 'Banear Miembros',
    [PermissionFlagsBits.Administrator.toString()]: 'Administrador',
    [PermissionFlagsBits.ManageChannels.toString()]: 'Gestionar Canales',
    [PermissionFlagsBits.ManageGuild.toString()]: 'Gestionar Servidor',
    [PermissionFlagsBits.AddReactions.toString()]: 'Añadir Reacciones',
    [PermissionFlagsBits.ViewAuditLog.toString()]: 'Ver Registro Auditoría',
    [PermissionFlagsBits.PrioritySpeaker.toString()]: 'Prioridad de Palabra',
    [PermissionFlagsBits.Stream.toString()]: 'Video',
    [PermissionFlagsBits.ViewChannel.toString()]: 'Ver Canal',
    [PermissionFlagsBits.SendMessages.toString()]: 'Enviar Mensajes',
    [PermissionFlagsBits.SendTTSMessages.toString()]: 'Enviar TTS',
    [PermissionFlagsBits.ManageMessages.toString()]: 'Gestionar Mensajes',
    [PermissionFlagsBits.EmbedLinks.toString()]: 'Insertar Enlaces',
    [PermissionFlagsBits.AttachFiles.toString()]: 'Adjuntar Archivos',
    [PermissionFlagsBits.ReadMessageHistory.toString()]: 'Leer Historial',
    [PermissionFlagsBits.MentionEveryone.toString()]: 'Mencionar @everyone',
    [PermissionFlagsBits.UseExternalEmojis.toString()]: 'Emojis Externos',
    [PermissionFlagsBits.ViewGuildInsights.toString()]: 'Ver Insights',
    [PermissionFlagsBits.Connect.toString()]: 'Conectar',
    [PermissionFlagsBits.Speak.toString()]: 'Hablar',
    [PermissionFlagsBits.MuteMembers.toString()]: 'Silenciar Miembros',
    [PermissionFlagsBits.DeafenMembers.toString()]: 'Ensordecer Miembros',
    [PermissionFlagsBits.MoveMembers.toString()]: 'Mover Miembros',
    [PermissionFlagsBits.UseVAD.toString()]: 'Usar Act. Voz',
    [PermissionFlagsBits.ChangeNickname.toString()]: 'Cambiar Apodo',
    [PermissionFlagsBits.ManageNicknames.toString()]: 'Gestionar Apodos',
    [PermissionFlagsBits.ManageRoles.toString()]: 'Gestionar Roles',
    [PermissionFlagsBits.ManageWebhooks.toString()]: 'Gestionar Webhooks',
    [PermissionFlagsBits.ManageEmojisAndStickers.toString()]: 'Gestionar Emojis',
    [PermissionFlagsBits.UseApplicationCommands.toString()]: 'Usar Comandos App',
    [PermissionFlagsBits.RequestToSpeak.toString()]: 'Pedir Hablar',
    [PermissionFlagsBits.ManageEvents.toString()]: 'Gestionar Eventos',
    [PermissionFlagsBits.ManageThreads.toString()]: 'Gestionar Hilos',
    [PermissionFlagsBits.CreatePublicThreads.toString()]: 'Crear Hilos Públicos',
    [PermissionFlagsBits.CreatePrivateThreads.toString()]: 'Crear Hilos Privados',
    [PermissionFlagsBits.UseExternalStickers.toString()]: 'Stickers Externos',
    [PermissionFlagsBits.SendMessagesInThreads.toString()]: 'Enviar en Hilos',
    [PermissionFlagsBits.UseEmbeddedActivities.toString()]: 'Usar Actividades',
    [PermissionFlagsBits.ModerateMembers.toString()]: 'Moderar Miembros'
};

/**
 * Compara dos overwrites y devuelve cambios legibles.
 * @param {import('discord.js').PermissionOverwrites} oldO 
 * @param {import('discord.js').PermissionOverwrites} newO 
 */
function getPermissionChanges(oldO, newO) {
    const changes = [];
    
    // Lista de bits relevantes a verificar
    const allBits = Object.keys(PERM_NAMES).map(k => BigInt(k));

    for (const bit of allBits) {
        const permName = PERM_NAMES[bit.toString()];
        
        // Estado anterior
        const oldAllow = oldO.allow.has(bit);
        const oldDeny = oldO.deny.has(bit);
        
        // Estado nuevo
        const newAllow = newO.allow.has(bit);
        const newDeny = newO.deny.has(bit);

        // Si no cambió nada, continue
        if (oldAllow === newAllow && oldDeny === newDeny) continue;

        // Determinar cambio
        let status = '';
        if (newAllow) status = '✅ Permitido';
        else if (newDeny) status = '❌ Denegado';
        else status = '⏺️ Heredado (Gris)';

        changes.push(`> ${permName}: ${status}`);
    }
    return changes;
}

module.exports = {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel) {
        if (!oldChannel.guild) return; 
        const guild = newChannel.guild;

        const config = getAuditConfig(guild.id);
        if (!config || !config.log_channel_update) return;

        // Comprobar cambios
        const changes = [];

        if (oldChannel.name !== newChannel.name) {
            changes.push(`📝 **Nombre:** \`#${oldChannel.name}\` ➔ \`#${newChannel.name}\``);
        }
        if (oldChannel.topic !== newChannel.topic) {
             changes.push(`📋 **Tema:** \`Changed\``); // Topics pueden ser largos
        }
        if (oldChannel.nsfw !== newChannel.nsfw) {
            changes.push(`🔞 **NSFW:** \`${oldChannel.nsfw}\` ➔ \`${newChannel.nsfw}\``);
        }
        if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
            changes.push(`⏱️ **Slowmode:** \`${oldChannel.rateLimitPerUser}s\` ➔ \`${newChannel.rateLimitPerUser}s\``);
        }

        // --- Detección de Cambios de Permisos ---
        const oldOverwrites = oldChannel.permissionOverwrites.cache;
        const newOverwrites = newChannel.permissionOverwrites.cache;

        // 1. Permisos añadidos o modificados
        newOverwrites.forEach((overwrite, id) => {
            const oldOverwrite = oldOverwrites.get(id);
            
            // Intentar obtener nombre (Rol o Usuario)
            let name = id;
            let typeEmoji = '❓';
            
            const role = guild.roles.cache.get(id);
            const member = guild.members.cache.get(id);

            if (role) {
                name = `@${role.name}`;
                typeEmoji = '🛡️';
            } else if (member) {
                name = `@${member.user.username}`;
                typeEmoji = '👤';
            } else if (id === guild.id) {
                name = '@everyone';
                typeEmoji = '👥';
            }

            if (!oldOverwrite) {
                changes.push(`➕ **Permisos Añadidos:** ${typeEmoji} \`${name}\``);
                // Mostrar qué permisos tiene el nuevo overwrite
                const details = getPermissionChanges(
                    { allow: new PermissionsBitField(0n), deny: new PermissionsBitField(0n) }, // "Nada" como base
                    overwrite
                );
                 if (details.length > 0) changes.push(details.join('\n'));

            } else {
                // Si existen en ambos, comparamos los bitfields
                if (!oldOverwrite.allow.equals(overwrite.allow) || !oldOverwrite.deny.equals(overwrite.deny)) {
                    changes.push(`⚙️ **Permisos Editados:** ${typeEmoji} \`${name}\``);
                    const details = getPermissionChanges(oldOverwrite, overwrite);
                    if (details.length > 0) changes.push(details.join('\n'));
                }
            }
        });

        // 2. Permisos eliminados
        oldOverwrites.forEach((overwrite, id) => {
            if (!newOverwrites.has(id)) {
                let name = id;
                let typeEmoji = '❓';
                const role = guild.roles.cache.get(id);
                if (role) { name = `@${role.name}`; typeEmoji = '🛡️'; }
                else if (id === guild.id) { name = '@everyone'; typeEmoji = '👥'; }
                
                changes.push(`➖ **Permisos Eliminados:** ${typeEmoji} \`${name}\``);
            }
        });

        if (changes.length > 0) {
            const embed = new EmbedBuilder()
                .setTitle('🔧 Canal Actualizado')
                .setColor('#faa61a')
                .setDescription(`${newChannel} (\`${newChannel.id}\`)\n\n${changes.join('\n')}`)
                .setFooter({ text: `ID Guild: ${guild.id}` })
                .setTimestamp();
            
            await sendAuditLog(guild, 'log_channel_update', embed);
        }
    },
};
