const { handleComponentInteraction } = require('../handlers/interactionHandler');
const { simpleEmbed } = require('../utils/embeds');
const { COLORS } = require('../utils/constants');
const { isModuleEnabled } = require('../database/database');

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

            // Verificar si el módulo está habilitado en este servidor
            if (command.module && interaction.guildId) {
                if (!isModuleEnabled(interaction.guildId, command.module)) {
                    return interaction.reply({
                        embeds: [simpleEmbed(
                            '\u274c Módulo desactivado',
                            `El módulo \`${command.module}\` no está habilitado en este servidor.\n-# Un administrador puede activarlo desde el dashboard o contactando con el propietario.`,
                            COLORS.DANGER
                        )],
                        flags: 64,
                    });
                }
            }

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
