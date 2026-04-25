require('dotenv').config();
const { cleanEnv, str, num } = require('envalid');

const env = cleanEnv(process.env, {
    DISCORD_TOKEN: str({ desc: 'El token de tu bot de Discord' }),
    CLIENT_ID: str({ desc: 'El Client ID de tu aplicación de Discord' }),
    GUILD_ID: str({ default: '', desc: 'El ID del servidor para registrar comandos en desarrollo. Dejar vacío en producción' }),
    REGISTER_GLOBAL: str({ default: 'false', desc: 'Si "true", registra los slash commands globalmente (producción). Si "false", usa GUILD_ID (desarrollo, instantáneo)' }),
    NODE_ENV: str({ choices: ['development', 'test', 'production', 'Test', 'Produccion', 'Desarrollo'], default: 'Produccion' }),
    BOT_NAME: str({ default: 'TacoBot', desc: 'Nombre del bot que aparece en embeds y mensajes' }),
    DASHBOARD_HEARTBEAT_URL: str({ default: '', docs: 'URL del endpoint de heartbeat del dashboard (ej: http://localhost:4001/api/bot/heartbeat)' }),
    HEARTBEAT_SECRET: str({ default: '', docs: 'Secreto compartido con el dashboard para autenticar el heartbeat' }),
});

module.exports = env;
