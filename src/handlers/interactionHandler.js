const { simpleEmbed } = require('../utils/embeds');
const { COLORS } = require('../utils/constants');

/**
 * Router central de interacciones (botones, modales, select menus).
 * Cada módulo registra sus propios handlers en client.buttons, client.modals, client.selectMenus.
 * @param {import('discord.js').Client} client
 */
function setupInteractionHandler(client) {
    // Colecciones para handlers de componentes
    client.buttons = client.buttons ?? new Map();
    client.modals = client.modals ?? new Map();
    client.selectMenus = client.selectMenus ?? new Map();
}

/**
 * Procesa una interacción de componente (botón, modal, select menu).
 * @param {import('discord.js').Interaction} interaction
 */
async function handleComponentInteraction(interaction) {
    const { client } = interaction;

    if (interaction.isButton()) {
        const handler = client.buttons.get(interaction.customId)
            ?? findPrefixHandler(client.buttons, interaction.customId);
        if (handler) return await handler(interaction);
    }

    if (interaction.isModalSubmit()) {
        const handler = client.modals.get(interaction.customId)
            ?? findPrefixHandler(client.modals, interaction.customId);
        if (handler) return await handler(interaction);
    }

    if (interaction.isStringSelectMenu()) {
        const handler = client.selectMenus.get(interaction.customId)
            ?? findPrefixHandler(client.selectMenus, interaction.customId);
        if (handler) return await handler(interaction);
    }
}

/**
 * Busca un handler que coincida por prefijo (ej: "ticket_close_" matches "ticket_close_12345").
 */
function findPrefixHandler(map, customId) {
    for (const [key, handler] of map) {
        if (customId.startsWith(key)) return handler;
    }
    return null;
}

module.exports = { setupInteractionHandler, handleComponentInteraction };
