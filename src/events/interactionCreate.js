const { handleComponentInteraction } = require('../handlers/interactionHandler');
const { simpleEmbed } = require('../utils/embeds');
const { COLORS } = require('../utils/constants');
const { isModuleEnabled, getCommandPermission } = require('../database/database');

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

            // Verificar permisos de comando personalizados (overrides del dashboard)
            if (interaction.guildId) {
                const subcommand = interaction.options.getSubcommand(false);
                const commandKey = subcommand
                    ? `${interaction.commandName} ${subcommand}`
                    : interaction.commandName;

                const override = getCommandPermission(interaction.guildId, commandKey);
                if (override) {
                    // Si el comando está desactivado, bloquearlo
                    if (override.enabled === 0) {
                        return interaction.reply({
                            embeds: [simpleEmbed(
                                '\u274c Comando desactivado',
                                `El comando \`/${commandKey}\` está desactivado en este servidor.`,
                                COLORS.DANGER
                            )],
                            flags: 64,
                        });
                    }
                    // Inyectar el nivel mínimo personalizado para que requireLevel lo use
                    if (override.level) {
                        interaction._permOverride = override.level;
                    }
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
