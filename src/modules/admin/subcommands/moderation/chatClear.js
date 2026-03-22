const { PermissionFlagsBits } = require('discord.js');
const logger = require('../../../../utils/logger.js');
const { requireLevel } = require('../../../../utils/permCheck');
const { getGuildConfig } = require('../../../../database/database');

module.exports = {
    async execute(interaction) {
        const filtro = interaction.options.getString('filtro');
        const channel = interaction.channel;
        const config = getGuildConfig(interaction.guild.id);

        // Verificar nivel mínimo: todos necesitan al menos Mod
        if (!await requireLevel(interaction, config, 'mod')) return;

        // --- OPCION 1: NUKE (Sin argumentos) — Solo Op ---
        if (!filtro) {
            if (!await requireLevel(interaction, config, 'op')) return;
            
            try {
                // Clonamos el canal actual con todas sus propiedades
                const newChannel = await channel.clone();
                // Movemos el nuevo canal a la misma posicion que el anterior
                await newChannel.setPosition(channel.position);

                // Borramos el canal viejo
                await channel.delete();

                // Enviamos mensaje al nuevo canal
                return newChannel.send(`💣 **Canal reiniciado** por ${interaction.user}.`);
            } catch (error) {
                logger.error(`Error en Nuke: ${error}`);
                if (channel) {
                    try {
                        await interaction.reply({ content: '❌ Error al reiniciar el canal.', ephemeral: true });
                    } catch (e) {
                        // Ignorar si ya no podemos responder
                    }
                }
                return;
            }
        }

        // --- OPCION 2: Borrar X mensajes o por tiempo ---
        
        // Intentar parsear como número enterosimple
        if (/^\d+$/.test(filtro)) {
            const amount = parseInt(filtro);
            
            if (amount < 1 || amount > 100) {
                return interaction.reply({ content: '⚠️ Por limitaciones de Discord, solo puedes borrar entre 1 y 100 mensajes a la vez con este método.', ephemeral: true });
            }

            try {
                const deleted = await channel.bulkDelete(amount, true);
                return interaction.reply({ content: `🧹 Se han borrado **${deleted.size}** mensajes.`, ephemeral: true });
            } catch (error) {
                logger.error(`Error en Clear Amount: ${error}`);
                return interaction.reply({ content: '❌ Error al borrar mensajes. Asegúrate de que no sean más antiguos de 14 días.', ephemeral: true });
            }
        }

        // Intentar parsear como tiempo (ej: "1h", "30m", "1d")
        const timeRegex = /^(\d+)\s*(s|m|h|d)$/i;
        const match = filtro.match(timeRegex);

        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            let ms = 0;

            if (unit === 's') ms = value * 1000;
            if (unit === 'm') ms = value * 60 * 1000;
            if (unit === 'h') ms = value * 60 * 60 * 1000;
            if (unit === 'd') ms = value * 24 * 60 * 60 * 1000;

            if (ms > 14 * 24 * 60 * 60 * 1000) {
                return interaction.reply({ content: '⚠️ No puedo borrar mensajes de hace más de 14 días en masa.', ephemeral: true });
            }

            const limitTime = Date.now() - ms;

            try {
                const messages = await channel.messages.fetch({ limit: 100 });
                const messagesToDelete = messages.filter(m => m.createdTimestamp > limitTime);

                if (messagesToDelete.size === 0) {
                    return interaction.reply({ content: `⚠️ No encontré mensajes recientes en los últimos ${filtro} para borrar.`, ephemeral: true });
                }

                const deleted = await channel.bulkDelete(messagesToDelete, true);
                return interaction.reply({ content: `🧹 Se han borrado **${deleted.size}** mensajes de los últimos ${filtro}.`, ephemeral: true });

            } catch (error) {
                logger.error(`Error en Clear Time: ${error}`);
                return interaction.reply({ content: '❌ Error al borrar mensajes por tiempo.', ephemeral: true });
            }
        }

        return interaction.reply({ content: '❌ Formato inválido. Usa un número (ej: `50`) o tiempo (ej: `10m`, `2h`, `1d`).', ephemeral: true });
    }
};
