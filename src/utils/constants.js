/**
 * Constantes y valores por defecto del bot.
 */

const COLORS = {
    PRIMARY: '#5865F2',   // Blurple
    SUCCESS: '#57F287',   // Verde
    WARNING: '#FEE75C',   // Amarillo
    DANGER: '#ED4245',    // Rojo
    INFO: '#5865F2',      // Azul
    TICKET: '#2B2D31',    // Oscuro
};

const TICKET_STATUS = {
    OPEN: 'open',
    CLAIMED: 'claimed',
    CLOSED: 'closed',
};

const AUDIT_ACTIONS = {
    CONFIG_UPDATE: 'CONFIG_UPDATE',
    TICKET_OPEN: 'TICKET_OPEN',
    TICKET_CLAIM: 'TICKET_CLAIM',
    TICKET_CLOSE: 'TICKET_CLOSE',
    TICKET_UNCLAIM: 'TICKET_UNCLAIM',
    TICKET_RATE: 'TICKET_RATE',
    DEPARTMENT_ADD: 'DEPARTMENT_ADD',
    DEPARTMENT_REMOVE: 'DEPARTMENT_REMOVE',
    PANEL_SETUP: 'PANEL_SETUP',
};

const DEFAULT_MESSAGES = {
    panel: {
        title: '🎫 Centro de Soporte',
        description: 'Selecciona una categoria del menú inferior para abrir un ticket.\nNuestro equipo te atenderá lo antes posible.',
        color: COLORS.PRIMARY,
        footer: 'Tacoland Network',
    },
    ticket_welcome: {
        title: '🎫 Ticket #{ticket_id}',
        description: 'Hola {user}, gracias por contactarnos.',
        // description: 'Hola {user}, gracias por contactarnos.\n\n**Categoria:** {department}\n**Asunto:** {subject}\n\nUn miembro del staff te atenderá pronto. Mientras tanto, describe tu problema con el mayor detalle posible.',
        color: COLORS.WARNING,
        footer: 'Tacoland Network | Usa el botón de abajo para cerrar el ticket',
    },
    ticket_close: {
        title: '🔒 Ticket Cerrado',
        description: 'El ticket #{ticket_id} ha sido cerrado por {closer}.\nSe ha generado una transcripción del mismo.',
        color: COLORS.DANGER,
        footer: 'Tacoland Network | Este canal se eliminará en breve',
    },
    ticket_claimed: {
        title: '✋ Ticket Reclamado',
        description: 'Este ticket ha sido reclamado por {staff}.\nÉl/ella se encargará de tu caso.',
        color: COLORS.SUCCESS,
        footer: 'Tacoland Network',
    },
    ticket_priority: {
        title: '{priority_emoji}Prioridad Actualizada',
        description: 'La prioridad ha cambiado de **{old_priority_emoji}{old_priority_label}** a **{priority_emoji}{priority_label}** por {staff}.',
        color: COLORS.WARNING,
        footer: 'Tacoland Network',
    },
};

module.exports = {
    COLORS,
    TICKET_STATUS,
    AUDIT_ACTIONS,
    DEFAULT_MESSAGES,
};
