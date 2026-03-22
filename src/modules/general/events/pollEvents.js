const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, createPoll } = require('../../../database/database');
const { COLORS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

// Regex para extraer un emoji Unicode al inicio de una cadena
const EMOJI_REGEX = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;

function parseOptions(raw) {
    return raw
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const match = line.match(EMOJI_REGEX);
            if (match) {
                return { text: line.slice(match[0].length).trim(), emoji: match[0] };
            }
            return { text: line };
        });
}

module.exports = {
    name: 'ready',
    once: true,

    execute(client) {
        // ─── Modal Submit: Crear encuesta ─────────────────────────────────────
        client.modals.set('poll_create_', async (interaction) => {
            try {
                // Extraer channelId y staffOnly del customId: poll_create_<channelId>_<0|1>
                const withoutPrefix = interaction.customId.replace('poll_create_', '');
                const lastUnderscore = withoutPrefix.lastIndexOf('_');
                const lastSegment = withoutPrefix.slice(lastUnderscore + 1);
                let channelId, staffOnly;
                if (lastUnderscore !== -1 && (lastSegment === '0' || lastSegment === '1')) {
                    channelId = withoutPrefix.slice(0, lastUnderscore);
                    staffOnly = lastSegment === '1';
                } else {
                    // Compatibilidad con formato antiguo (sin staffOnly)
                    channelId = withoutPrefix;
                    staffOnly = false;
                }

                const question    = interaction.fields.getTextInputValue('poll_question').trim();
                const optionsRaw  = interaction.fields.getTextInputValue('poll_options');
                const description = interaction.fields.getTextInputValue('poll_description')?.trim() || null;
                const durationRaw = interaction.fields.getTextInputValue('poll_duration')?.trim();
                const multipleRaw = interaction.fields.getTextInputValue('poll_multiple')?.trim().toLowerCase();

                // Parsear opciones
                const options = parseOptions(optionsRaw);

                if (options.length < 2) {
                    return interaction.reply({
                        content: '❌ Debes introducir al menos **2 opciones** (una por línea).',
                        ephemeral: true,
                    });
                }
                if (options.length > 5) {
                    return interaction.reply({
                        content: '❌ Máximo **5 opciones** permitidas.',
                        ephemeral: true,
                    });
                }

                // Parsear duración
                let duration = parseInt(durationRaw, 10);
                if (isNaN(duration) || duration < 1) duration = 24;
                if (duration > 168) duration = 168;

                // Múltiples respuestas
                const allowMultiselect = multipleRaw === 'si' || multipleRaw === 'sí' || multipleRaw === 'yes';

                // Resolver el canal destino
                let targetChannel;
                try {
                    targetChannel = await interaction.guild.channels.fetch(channelId);
                } catch {
                    return interaction.reply({ content: '❌ No encontré el canal seleccionado.', ephemeral: true });
                }

                if (!targetChannel?.isTextBased()) {
                    return interaction.reply({ content: '❌ El canal seleccionado no es de texto.', ephemeral: true });
                }

                await interaction.deferReply({ ephemeral: true });

                // Construir payload del poll nativo de Discord
                const pollPayload = {
                    question: { text: question },
                    answers: options.map(opt => {
                        const answer = { text: opt.text.substring(0, 55) };
                        if (opt.emoji) answer.emoji = { name: opt.emoji };
                        return answer;
                    }),
                    duration,          // en horas
                    allowMultiselect,
                };

                // Añadir descripción como contenido del mensaje si existe
                const messageOptions = { poll: pollPayload };
                if (description) {
                    const descEmbed = new EmbedBuilder()
                        .setDescription(description)
                        .setColor(COLORS.PRIMARY);
                    messageOptions.embeds = [descEmbed];
                }

                // Enviar el poll al canal destino
                const pollMessage = await targetChannel.send(messageOptions);

                // Calcular fecha de expiración para la DB
                const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000)
                    .toISOString()
                    .replace('T', ' ')
                    .substring(0, 19);

                // Guardar en DB
                createPoll(
                    interaction.guild.id,
                    targetChannel.id,
                    pollMessage.id,
                    interaction.user.id,
                    question,
                    expiresAt,
                    staffOnly
                );

                logger.info(`[Poll] Encuesta creada por ${interaction.user.tag} en #${targetChannel.name} (msg: ${pollMessage.id})`);

                return interaction.editReply({
                    content: `✅ Encuesta publicada en ${targetChannel}.\nID del mensaje: \`${pollMessage.id}\``,
                });

            } catch (error) {
                logger.error('[Poll] Error al crear encuesta desde modal:', error);
                const msg = '❌ Hubo un error al crear la encuesta.';
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({ content: msg });
                }
                return interaction.reply({ content: msg, ephemeral: true });
            }
        });
    },
};
