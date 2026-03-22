const {
    SlashCommandBuilder,
    ChannelType,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
} = require('discord.js');
const { getGuildConfig, createPoll, closePoll, getPollByMessage, getActivePolls, deletePollHistory } = require('../../../database/database');
const { requireLevel, getMemberLevel } = require('../../../utils/permCheck');
const { replyError, replySuccess, replyWarning } = require('../../../utils/responses');
const { COLORS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

// Regex para extraer un emoji Unicode al inicio de una cadena
const EMOJI_REGEX = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u;

/**
 * Parsea las líneas de opciones de la modal:
 * Cada línea puede empezar con un emoji Unicode → se extrae como emoji de la opción.
 * Devuelve array de { text, emoji? }
 */
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

/**
 * Construye la barra de progreso de una opción.
 */
function buildBar(votes, total, length = 10) {
    if (total === 0) return '░'.repeat(length);
    const filled = Math.round((votes / total) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
}

/**
 * Construye el embed de resultados de una encuesta.
 */
async function buildResultsEmbed(poll, message, closed, closedBy = null) {
    const pollData = message.poll;
    const embed = new EmbedBuilder()
        .setTitle(`📊 ${closed ? 'Encuesta finalizada' : 'Resultados en curso'} — ${poll.question}`)
        .setColor(closed ? COLORS.DANGER : COLORS.PRIMARY)
        .setTimestamp();

    if (!pollData) {
        embed.setDescription('No se pudieron obtener los datos de la encuesta.');
        return embed;
    }

    const totalVotes = pollData.answers.reduce((acc, a) => acc + (a.voteCount ?? 0), 0);

    const lines = pollData.answers.map(answer => {
        const votes = answer.voteCount ?? 0;
        const pct = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';
        const bar = buildBar(votes, totalVotes);
        const emoji = answer.emoji?.name ? `${answer.emoji.name} ` : '';
        return `${emoji}**${answer.text}**\n\`${bar}\` ${votes} votos (${pct}%)`;
    });

    embed.setDescription(lines.join('\n\n'));
    embed.addFields({ name: 'Total', value: `**${totalVotes}** votos`, inline: true });

    if (closed && closedBy) {
        embed.setFooter({ text: `Cerrada por ${closedBy} • Tacoland Network` });
    } else if (!closed) {
        const expires = new Date(poll.expires_at);
        embed.addFields({ name: 'Cierra', value: `<t:${Math.floor(expires.getTime() / 1000)}:R>`, inline: true });
        embed.setFooter({ text: 'Encuesta en curso • Tacoland Network' });
    } else {
        embed.setFooter({ text: 'Tacoland Network' });
    }

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Sistema de encuestas de TacoLand')
        // ── CREATE ──
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Crea una nueva encuesta (Solo Admin+).')
                .addChannelOption(o =>
                    o.setName('canal')
                        .setDescription('Canal donde se publicará la encuesta.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
                .addStringOption(o =>
                    o.setName('visibilidad')
                        .setDescription('¿Quién puede ver esta encuesta en /poll list? (por defecto: pública)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Pública (todos)', value: 'publica' },
                            { name: 'Solo staff', value: 'staff' }
                        )
                )
        )
        // ── END ──
        .addSubcommand(sub =>
            sub.setName('end')
                .setDescription('Cierra una encuesta anticipadamente (Solo Admin+).')
                .addStringOption(o =>
                    o.setName('mensaje_id')
                        .setDescription('ID del mensaje de la encuesta.')
                        .setRequired(true)
                )
        )
        // ── RESULTS ──
        .addSubcommand(sub =>
            sub.setName('results')
                .setDescription('Muestra los resultados actuales de una encuesta.')
                .addStringOption(o =>
                    o.setName('mensaje_id')
                        .setDescription('ID del mensaje de la encuesta.')
                        .setRequired(true)
                )
        )
        // ── LIST ──
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('Lista todas las encuestas activas del servidor.')
        )
        // ── CLEAR ──
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Borra todo el historial de encuestas del servidor (Solo Op).')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const { guild, user } = interaction;
        const config = getGuildConfig(guild.id);

        try {
            // ─── CREATE ───────────────────────────────────────────────────────
            if (subcommand === 'create') {
                if (!await requireLevel(interaction, config, 'admin')) return;

                const targetChannel = interaction.options.getChannel('canal');
                const staffOnly = interaction.options.getString('visibilidad') === 'staff';

                // Guardar channelId y visibilidad en customId: poll_create_<channelId>_<0|1>
                const modal = new ModalBuilder()
                    .setCustomId(`poll_create_${targetChannel.id}_${staffOnly ? '1' : '0'}`)
                    .setTitle('📊 Crear Encuesta');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('poll_question')
                            .setLabel('Pregunta')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('¿Cuál es tu color favorito?')
                            .setMaxLength(300)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('poll_options')
                            .setLabel('Opciones (una por línea, mín. 2, máx. 5)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('🔵 Azul\n🔴 Rojo\n🟡 Amarillo')
                            .setMaxLength(500)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('poll_description')
                            .setLabel('Contexto/Descripción (opcional)')
                            .setStyle(TextInputStyle.Paragraph)
                            .setPlaceholder('Información adicional sobre la encuesta...')
                            .setMaxLength(500)
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('poll_duration')
                            .setLabel('Duración en horas (1-168, por defecto 24)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('24')
                            .setMaxLength(3)
                            .setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('poll_multiple')
                            .setLabel('¿Múltiples respuestas? (si / no)')
                            .setStyle(TextInputStyle.Short)
                            .setPlaceholder('no')
                            .setMaxLength(2)
                            .setRequired(false)
                    )
                );

                return await interaction.showModal(modal);
            }

            // ─── END ─────────────────────────────────────────────────────────
            if (subcommand === 'end') {
                if (!await requireLevel(interaction, config, 'admin')) return;

                const messageId = interaction.options.getString('mensaje_id');
                const poll = getPollByMessage(messageId, guild.id);

                if (!poll) {
                    return replyError(interaction, 'No encontré ninguna encuesta activa con ese ID en este servidor.', true);
                }
                if (poll.closed) {
                    return replyWarning(interaction, 'Esa encuesta ya está cerrada.', true);
                }

                await interaction.deferReply({ ephemeral: true });

                // Buscar el mensaje en el canal almacenado
                let pollMessage;
                try {
                    const ch = await guild.channels.fetch(poll.channel_id);
                    pollMessage = await ch.messages.fetch(messageId);
                } catch {
                    return interaction.editReply({ content: '❌ No pude encontrar el mensaje de la encuesta. ¿Fue eliminado?' });
                }

                // Cerrar el poll nativo de Discord
                try {
                    await pollMessage.poll.end();
                } catch (e) {
                    logger.warn(`[Poll] No se pudo cerrar el poll nativo: ${e.message}`);
                }

                // Marcar como cerrado en DB
                closePoll(messageId, guild.id);

                // Enviar embed de resultados en el canal de la encuesta
                const resultsEmbed = await buildResultsEmbed(poll, pollMessage, true, user.tag);
                await pollMessage.reply({ embeds: [resultsEmbed] });

                return interaction.editReply({ content: '✅ Encuesta cerrada y resultados publicados.' });
            }

            // ─── RESULTS ─────────────────────────────────────────────────────
            if (subcommand === 'results') {
                const messageId = interaction.options.getString('mensaje_id');
                const poll = getPollByMessage(messageId, guild.id);

                if (!poll) {
                    return replyError(interaction, 'No encontré ninguna encuesta con ese ID en este servidor.', true);
                }

                await interaction.deferReply({ ephemeral: true });

                let pollMessage;
                try {
                    const ch = await guild.channels.fetch(poll.channel_id);
                    pollMessage = await ch.messages.fetch(messageId);
                } catch {
                    return interaction.editReply({ content: '❌ No pude encontrar el mensaje de la encuesta.' });
                }

                const resultsEmbed = await buildResultsEmbed(poll, pollMessage, poll.closed);
                return interaction.editReply({ embeds: [resultsEmbed] });
            }

            // ─── LIST ─────────────────────────────────────────────────────────
            if (subcommand === 'list') {
                const activePolls = getActivePolls(guild.id);

                if (activePolls.length === 0) {
                    return interaction.reply({ content: 'ℹ️ No hay encuestas activas en este servidor.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 Encuestas activas')
                    .setColor(COLORS.PRIMARY)
                    .setTimestamp()
                    .setFooter({ text: 'Tacoland Network' });

                const fields = activePolls.slice(0, 10).map(p => {
                    const expires = new Date(p.expires_at + 'Z');
                    return {
                        name: p.question.substring(0, 80),
                        value: `📢 <#${p.channel_id}> · 👤 <@${p.creator_id}> · ⏰ <t:${Math.floor(expires.getTime() / 1000)}:R>\n🆔 \`${p.message_id}\``,
                        inline: false,
                    };
                });

                embed.addFields(fields);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // ─── CLEAR ────────────────────────────────────────────────────────
            if (subcommand === 'clear') {
                if (!await requireLevel(interaction, config, 'op')) return;

                const confirmEmbed = new EmbedBuilder()
                    .setTitle('⚠️ BORRAR HISTORIAL DE ENCUESTAS')
                    .setDescription('Esta acción eliminará **todas** las encuestas registradas en la base de datos.\nEscribe `CONFIRMAR` para proceder.')
                    .setColor(COLORS.DANGER);

                await interaction.reply({ embeds: [confirmEmbed] });

                const collector = interaction.channel.createMessageCollector({
                    filter: m => m.author.id === user.id,
                    time: 15000,
                    max: 1,
                });

                collector.on('collect', async m => {
                    try { await m.delete(); } catch (_) {}
                    if (m.content === 'CONFIRMAR') {
                        deletePollHistory(guild.id);
                        return replySuccess(interaction, 'Historial de encuestas borrado correctamente.', true);
                    } else {
                        return replyWarning(interaction, 'Operación cancelada.', true);
                    }
                });

                collector.on('end', (collected) => {
                    if (collected.size === 0) {
                        replyWarning(interaction, 'Tiempo agotado. Operación cancelada.', true);
                    }
                });

                return;
            }

        } catch (error) {
            logger.error(`[Poll] Error en subcomando ${subcommand}:`, error);
            const msg = 'Hubo un error al ejecutar el comando de encuesta.';
            if (interaction.deferred || interaction.replied) {
                return interaction.editReply({ content: `❌ ${msg}` });
            }
            return interaction.reply({ content: `❌ ${msg}`, ephemeral: true });
        }
    },
};
