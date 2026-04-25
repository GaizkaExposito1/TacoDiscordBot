const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, addAuditLog } = require('../database/database');
const { COLORS, AUDIT_ACTIONS } = require('./constants');
const logger = require('./logger');

/**
 * Registra una acción en la base de datos y envía un embed al canal de logs.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {string} action - Acción (ver AUDIT_ACTIONS en constants.js)
 * @param {string} executorId - ID del usuario que ejecutó la acción
 * @param {string|null} targetId - ID del target (ticket, usuario, etc.)
 * @param {string} details - Detalles legibles de la acción o un objeto para tickets cerrados
 * @param {Object} [extraFields] - Campos extra opcionales para el embed { name, value, inline }
 * @param {string} [overrideChannelId] - ID de canal opcional para forzar el envío a otro canal (ej: transcripciones)
 */
async function logAudit(client, guildId, action, executorId, targetId, details, extraFields = [], overrideChannelId = null) {
    // Si details es string, lo guardamos tal cual. Si es objeto (special case), lo stringificamos para DB
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    
    // Guardar siempre en DB
    addAuditLog(guildId, action, executorId, targetId, detailsStr);

    const config = getGuildConfig(guildId);
    
    // Determinar canal de destino: overrideChannelId tiene prioridad sobre log_channel_id
    const targetChannelId = overrideChannelId || config?.log_channel_id;

    if (!targetChannelId) return;

    try {
        const channel = await client.channels.fetch(targetChannelId);
        if (!channel?.isTextBased()) return;

        const actionEmojis = {
            [AUDIT_ACTIONS.CONFIG_UPDATE]: '⚙️',
            [AUDIT_ACTIONS.TICKET_OPEN]: '📩',
            [AUDIT_ACTIONS.TICKET_CLAIM]: '✋',
            [AUDIT_ACTIONS.TICKET_CLOSE]: '🔒',
            [AUDIT_ACTIONS.TICKET_UNCLAIM]: '🔓',
            [AUDIT_ACTIONS.TICKET_RATE]: '⭐',
            [AUDIT_ACTIONS.DEPARTMENT_ADD]: '➕',
            [AUDIT_ACTIONS.DEPARTMENT_REMOVE]: '➖',
            [AUDIT_ACTIONS.PANEL_SETUP]: '📋',
        };

        const emoji = actionEmojis[action] ?? '📝';

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} Registro de Auditoría`)
            .setColor(COLORS.INFO)
            .setTimestamp()
            .setFooter({ text: `${process.env.BOT_NAME || 'TacoBot'} | ID: ${executorId}` });

        // Si es un log de CIERRE DE TICKET con formato especial
        if (action === AUDIT_ACTIONS.TICKET_CLOSE && typeof details === 'object') {
            const { ticketId, openerId, claimedBy, closerId, reason } = details;
            embed.addFields(
                { name: 'Acción', value: 'Ticket Cerrado', inline: true },
                { name: 'Ejecutor', value: `<@${executorId}>`, inline: true },
                { name: 'Ticket', value: `#${ticketId}`, inline: true },
                
                { name: '👤 Abierto por', value: `<@${openerId}>`, inline: true },
                { name: '🛡️ Atendido por', value: claimedBy ? `<@${claimedBy}>` : 'Nadie', inline: true },
                { name: '🔒 Cerrado por', value: `<@${closerId}>`, inline: true },
                { name: '📝 Razón de Cierre', value: reason || 'Sin razón especificada', inline: false }
            );
        } else {
            // Log Estándar
            embed.addFields(
                { name: 'Acción', value: action.replace(/_/g, ' '), inline: true },
                { name: 'Ejecutor', value: `<@${executorId}>`, inline: true },
                { name: 'Detalles', value: detailsStr || 'Sin detalles', inline: false },
            );
            if (targetId) {
                embed.addFields({ name: 'Objetivo', value: `<@${targetId}>`, inline: true });
            }
        }

        if (extraFields && extraFields.length > 0) {
            embed.addFields(extraFields);
        }

        const sentMessage = await channel.send({ embeds: [embed] });
        return sentMessage;
    } catch (err) {
        logger.warn(`[Audit] No se pudo enviar log al canal ${targetChannelId}: ${err.message}`);
        return null;
    }
}

module.exports = { logAudit };
