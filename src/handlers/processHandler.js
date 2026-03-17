const logger = require('../utils/logger');
const { getGuildConfig } = require('../database/database');
const { simpleEmbed } = require('../utils/embeds');
const { COLORS } = require('../utils/constants');

/**
 * Configura los manejadores de excepciones no capturadas y promesas rechazadas
 * para reportarlas al canal de logs si es posible.
 * @param {import('discord.js').Client} client 
 */
function setupProcessHandler(client) {
    // ─── Unhandled Rejection ───
    process.on('unhandledRejection', async (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        
        // Intentar reportar a Discord
        await reportErrorToDiscord(client, 'Unhandled Rejection', reason);
    });

    // ─── Uncaught Exception ───
    process.on('uncaughtException', async (error) => {
        logger.error('Uncaught Exception:', error);
        
        // Intentar reportar a Discord (best effort antes de morir)
        await reportErrorToDiscord(client, 'Uncaught Exception', error);
        
        // Dar un pequeño margen para que se envíen logs/mensajes antes de salir
        setTimeout(() => {
            process.exit(1); 
        }, 1000);
    });

    logger.info('[Process] ✔ Manejadores de procesos globales configurados.');
}

/**
 * Envía un embed de error al canal de logs configurado.
 */
async function reportErrorToDiscord(client, title, error) {
    if (!client || !client.isReady()) return;

    // Obtener variables de entorno (preferiblemente un canal específico para dev logs)
    // Usamos require dinámico para evitar conflictos circulares si env.js carga cosas raras
    let env;
    try { env = require('../config/env'); } catch (e) { env = process.env; }

    // PRIORIDAD 1: Si existe DEV_LOG_CHANNEL_ID en .env, enviar SOLO ahí.
    if (env.DEV_LOG_CHANNEL_ID) {
        try {
            const channel = await client.channels.fetch(env.DEV_LOG_CHANNEL_ID).catch(() => null);
            if (channel && channel.isTextBased()) {
                const embed = simpleEmbed(
                    `☠️ ${title} (Global Error)`,
                    `\`\`\`js\n${(error.stack || error).toString().slice(0, 4000)}\n\`\`\``,
                    COLORS.DANGER
                ).setTimestamp().setFooter({ text: 'Reporte interno del sistema' });
                
                await channel.send({ embeds: [embed] });
                return; // Ya enviamos al canal de dev, no spameamos a guilds
            }
        } catch (err) {
            logger.error(`[Process] Error enviando a DEV_LOG_CHANNEL_ID: ${err.message}`);
        }
    }

    // PRIORIDAD 2: Si no hay canal dev, intentar enviar al GUILD_ID principal (si existe config)
    // Esto es un fallback, pero evita iterar sobre todos los servidores.
    if (env.GUILD_ID) {
        try {
            const guild = client.guilds.cache.get(env.GUILD_ID);
            if (!guild) return;

            const config = getGuildConfig(guild.id);
            if (!config || !config.log_channel_id) return;

            const channel = guild.channels.cache.get(config.log_channel_id);
            if (!channel || !channel.isTextBased()) return;

            const embed = simpleEmbed(
                `☠️ ${title}`,
                `\`\`\`js\n${(error.stack || error).toString().slice(0, 4000)}\n\`\`\``,
                COLORS.DANGER
            ).setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (err) {
            logger.error(`[Process] No se pudo enviar reporte de error a Discord: ${err.message}`);
        }
    }
}

module.exports = { setupProcessHandler };
