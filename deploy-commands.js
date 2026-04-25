/**
 * Script para registrar los Slash Commands en Discord.
 * Ejecutar: node deploy-commands.js
 */
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const env = require('./src/config/env');
const logger = require('./src/utils/logger'); // Importar logger

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID, NODE_ENV, REGISTER_GLOBAL } = env;

const commands = [];
const modulesPath = path.join(__dirname, 'src', 'modules');

// Cargar comandos de todos los módulos
const modules = fs.readdirSync(modulesPath).filter(f =>
    fs.statSync(path.join(modulesPath, f)).isDirectory()
);

for (const mod of modules) {
    const commandsPath = path.join(modulesPath, mod, 'commands');
    if (!fs.existsSync(commandsPath)) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if (command.data) {
            // Si estamos en entorno de desarrollo, añadir prefijo 'd'
            if (NODE_ENV === 'development') {
                command.data.setName(`d${command.data.name}`);
            }
            commands.push(command.data.toJSON());
            logger.info(`[Deploy] ✔ /${command.data.name}`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    const isGlobal = REGISTER_GLOBAL === 'true';

    try {
        if (isGlobal) {
            logger.info(`\n[Deploy] Registrando ${commands.length} comando(s) GLOBALMENTE...`);
            logger.info(`[Deploy] \u26a0 Los comandos globales pueden tardar hasta 1 hora en propagarse a todos los servidores.`);

            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands },
            );

            logger.info(`[Deploy] \u2705 ${data.length} comando(s) registrado(s) globalmente.`);
        } else {
            if (!GUILD_ID) {
                logger.error('[Deploy] \u274c GUILD_ID no configurado. Define GUILD_ID en .env para registro por servidor, o usa REGISTER_GLOBAL=true para registro global.');
                process.exit(1);
            }
            logger.info(`\n[Deploy] Registrando ${commands.length} comando(s) en el servidor ${GUILD_ID}...`);

            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands },
            );

            logger.info(`[Deploy] \u2705 ${data.length} comando(s) registrado(s) en el servidor (instant\u00e1neo).`);
        }
    } catch (error) {
        logger.error('[Deploy] ❌ Error:', error);
    } finally {
        // Forzar salida limpia para que el .bat pueda continuar
        // Dar tiempo a Winston para flush de los últimos logs antes de salir
        setTimeout(() => process.exit(0), 500);
    }
})();
