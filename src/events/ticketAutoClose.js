const { getTicketsForAutoClose } = require('../database/database');
const { autoCloseTicket } = require('../modules/tickets/services/ticketService');
const logger = require('../utils/logger');

const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Cada 15 minutos

module.exports = {
    name: 'ready',
    once: false,
    execute(client) {
        const check = async () => {
            try {
                const tickets = getTicketsForAutoClose();
                if (tickets.length === 0) return;

                logger.info(`[AutoClose] ${tickets.length} ticket(s) inactivo(s) encontrado(s). Cerrando...`);
                for (const ticket of tickets) {
                    await autoCloseTicket(client, ticket);
                }
            } catch (err) {
                logger.error('[AutoClose] Error en la comprobación:', err);
            }
        };

        // Comprobar cada 15 minutos
        setInterval(check, CHECK_INTERVAL_MS);

        // Primera comprobación tras 30s (esperar a que guilds y canales estén en caché)
        setTimeout(check, 30_000);

        logger.info('[AutoClose] Checker de auto-cierre iniciado (cada 15 min).');
    },
};
