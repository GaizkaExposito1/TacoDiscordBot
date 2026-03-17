const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { setupInteractionHandler } = require('./handlers/interactionHandler');
const { setupProcessHandler } = require('./handlers/processHandler');
const { initDatabase } = require('./database/database');

/**
 * Crea y configura el cliente del bot.
 * @returns {Promise<Client>}
 */
async function createClient() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
        ],
        partials: [
            Partials.Channel,
            Partials.Message,
            Partials.User,
        ],
    });

    // Inicializar la DB (síncrono con better-sqlite3)
    initDatabase();

    // Cargar handlers
    setupInteractionHandler(client);
    setupProcessHandler(client);
    loadCommands(client);
    loadEvents(client);

    return client;
}

module.exports = { createClient };
