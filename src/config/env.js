require('dotenv').config();
const { cleanEnv, str, num } = require('envalid');

const env = cleanEnv(process.env, {
    DISCORD_TOKEN: str({ desc: 'El token de tu bot de Discord' }),
    CLIENT_ID: str({ desc: 'El Client ID de tu aplicación de Discord' }),
    GUILD_ID: str({ desc: 'El ID del servidor (Guild) donde se registrarán los comandos' }),
    NODE_ENV: str({ choices: ['development', 'test', 'production', 'Test', 'Produccion', 'Desarrollo'], default: 'Produccion' }),
    // Agrega más variables aquí si las necesitas
    // PORT: num({ default: 3000 }),
});

module.exports = env;
