const { getTicketByChannel, updateTicketLastActivity } = require('../database/database');

module.exports = {
    name: 'messageCreate',
    once: false,
    execute(message) {
        // Ignorar bots y DMs
        if (message.author.bot) return;
        if (!message.guild) return;

        // Si el canal es un ticket activo, actualizar su timestamp de actividad
        const ticket = getTicketByChannel(message.channel.id);
        if (ticket && ticket.status !== 'closed') {
            updateTicketLastActivity(message.channel.id);
        }
    },
};
