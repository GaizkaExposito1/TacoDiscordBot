require('dotenv').config();
const { cleanEnv, str, num } = require('envalid');

const env = cleanEnv(process.env, {
    DISCORD_TOKEN: str({ desc: 'El token de tu bot de Discord' }),
    CLIENT_ID: str({ desc: 'El Client ID de tu aplicación de Discord' }),
    GUILD_ID: str({ desc: 'El ID del servidor (Guild) donde se registrarán los comandos' }),
    NODE_ENV: str({ choices: ['development', 'test', 'production', 'Test', 'Produccion', 'Desarrollo'], default: 'Produccion' }),
    DASHBOARD_HEARTBEAT_URL: str({ default: '', docs: 'URL del endpoint de heartbeat del dashboard (ej: http://localhost:4001/api/bot/heartbeat)' }),
    HEARTBEAT_SECRET: str({ default: '', docs: 'Secreto compartido con el dashboard para autenticar el heartbeat' }),
});

module.exports = env;
