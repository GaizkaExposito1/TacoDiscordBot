const env = require('./config/env');
const { createClient } = require('./client');
const { initI18n } = require('./config/i18n');
const logger = require('./utils/logger');

// Crear e iniciar el bot
(async () => {
    try {
        await initI18n(); // Cargar traducciones primero
        const client = await createClient();
        await client.login(env.DISCORD_TOKEN);
    } catch (err) {
        logger.error('[Fatal] No se pudo iniciar el bot:', err);
        process.exit(1);
    }
})();
