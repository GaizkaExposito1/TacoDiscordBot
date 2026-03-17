const { EmbedBuilder } = require('discord.js');
const { getTicketMessage } = require('../database/database');
const { DEFAULT_MESSAGES } = require('./constants');
const { replacePlaceholders } = require('./placeholders');

/**
 * Construye un embed dinámico usando los mensajes de la DB o los defaults.
 * @param {string} guildId - ID del servidor.
 * @param {string} key - Clave del mensaje (panel, ticket_welcome, ticket_close, etc.).
 * @param {Object} placeholderData - Datos para reemplazar placeholders.
 * @returns {EmbedBuilder}
 */
function buildEmbed(guildId, key, placeholderData = {}) {
    // Buscar mensaje personalizado en la DB
    const custom = getTicketMessage(guildId, key);
    const defaults = DEFAULT_MESSAGES[key] ?? { title: '', description: '', color: '#5865F2', footer: '' };

    const title = custom?.title || defaults.title;
    const description = custom?.description || defaults.description;
    const color = custom?.color || defaults.color;
    const footer = custom?.footer ?? defaults.footer;

    const embed = new EmbedBuilder()
        .setTitle(replacePlaceholders(title, placeholderData))
        .setDescription(replacePlaceholders(description, placeholderData))
        .setColor(color)
        .setTimestamp();

    if (footer) {
        embed.setFooter({ text: replacePlaceholders(footer, placeholderData) });
    }

    return embed;
}

/**
 * Construye un embed simple (auxiliar, sin DB).
 */
function simpleEmbed(title, description, color = '#5865F2') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: 'Tacoland Network' });
}

module.exports = { buildEmbed, simpleEmbed };
