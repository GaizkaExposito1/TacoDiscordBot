const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger'); // Importar logger

/**
 * Carga todos los eventos de:
 * 1. src/events/ (eventos globales)
 * 2. src/modules/<modulo>/events/ (eventos de módulo)
 * @param {import('discord.js').Client} client
 */
function loadEvents(client) {
    // 1. Eventos globales
    const globalEventsPath = path.join(__dirname, '..', 'events');
    if (fs.existsSync(globalEventsPath)) {
        loadEventsFromDir(client, globalEventsPath, 'global');
    }

    // 2. Eventos de módulos
    const modulesPath = path.join(__dirname, '..', 'modules');
    if (!fs.existsSync(modulesPath)) return;

    const modules = fs.readdirSync(modulesPath).filter(f =>
        fs.statSync(path.join(modulesPath, f)).isDirectory()
    );

    for (const mod of modules) {
        const eventsPath = path.join(modulesPath, mod, 'events');
        if (fs.existsSync(eventsPath)) {
            loadEventsFromDir(client, eventsPath, mod);
        }
    }
}

/**
 * Registra eventos desde un directorio.
 */
function loadEventsFromDir(client, dirPath, source) {
    const eventFiles = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(dirPath, file));
        if (!event.name || !event.execute) {
            logger.warn(`[Events] ⚠ ${file} (${source}) no tiene name/execute.`); // Log estructurado
            continue;
        }

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }

        logger.info(`[Events] ✔ ${event.name} (${source})`);
    }
}

module.exports = { loadEvents };
