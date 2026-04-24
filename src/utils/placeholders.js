/**
 * Sistema de Placeholders para mensajes dinámicos.
 * Reemplaza {user}, {ticket_id}, {department}, etc. en textos configurados.
 */

/**
 * Reemplaza placeholders en un string.
 * @param {string} text - Texto con placeholders.
 * @param {Object} data - Datos para reemplazar.
 * @returns {string}
 */
function replacePlaceholders(text, data = {}) {
    if (!text) return '';

    const placeholders = {
        '{user}': data.user ?? 'Usuario',
        '{username}': data.username ?? data.user ?? 'Usuario',
        '{user_tag}': data.userTag ?? 'Usuario#0000',
        '{user_id}': data.userId ?? '000000000000000000',
        '{ticket_id}': data.ticketId ?? '0000',
        '{department}': data.department ?? 'General',
        '{subject}': data.subject ?? 'Sin asunto',
        '{staff}': data.staff ?? 'Staff',
        '{closer}': data.closer ?? 'Staff',
        '{server}': data.server ?? 'Servidor',
        '{member_count}': data.memberCount != null ? String(data.memberCount) : '0',
        '{date}': data.date ?? new Date().toLocaleDateString('es-ES'),
        '{time}': data.time ?? new Date().toLocaleTimeString('es-ES'),
        '{priority_emoji}': data.priority_emoji ?? '',
        '{priority_label}': data.priority_label ?? '',
        '{old_priority_emoji}': data.old_priority_emoji ?? '⚪',
        '{old_priority_label}': data.old_priority_label ?? 'Sin prioridad',
    };

    let result = text;
    for (const [placeholder, value] of Object.entries(placeholders)) {
        result = result.replaceAll(placeholder, String(value));
    }

    return result;
}

module.exports = { replacePlaceholders };
