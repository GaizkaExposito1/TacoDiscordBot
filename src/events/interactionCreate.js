const { handleComponentInteraction } = require('../handlers/interactionHandler');
const { simpleEmbed } = require('../utils/embeds');
const { COLORS } = require('../utils/constants');

const logger = require('../utils/logger'); // Importar logger
const { safeExecute } = require('../utils/errorHandler'); // Importar wrapper seguro

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        // ─── Slash Commands ───
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            // Ejecución segura con wrapper
            await safeExecute(interaction, () => command.execute(interaction));
            return;
        }

        // ─── Autocomplete ───
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (command?.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch {
                    // ignore autocomplete errors
                }
            }
            return;
        }

        // ─── Botones, Modales, Select Menus ───
        await safeExecute(interaction, () => handleComponentInteraction(interaction));
    },
};
