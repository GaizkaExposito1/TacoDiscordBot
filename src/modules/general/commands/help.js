const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/logger');
const { getGuildConfig } = require('../../../database/database');
const { getMemberLevel } = require('../../../utils/permCheck');

const LEVEL_ORDER = { user: 0, mod: 1, admin: 2, op: 3 };

// Minimum level required per "commandName" or "commandName.subcommandName"
// When adding a new command/subcommand, add ONE entry here — the description
// is pulled automatically from the command builder, so help stays in sync.
const LEVEL_MAP = {
    // Tickets
    'tickets.close':                'user',
    'tickets.claim':                'mod',
    'tickets.unclaim':              'mod',
    'tickets.add':                  'mod',
    'tickets.remove':               'mod',
    'tickets.ratings':              'mod',
    'tickets.config':               'op',
    'tickets.setup':                'op',
    'tickets.panel':                'op',
    // Suggestions
    'suggestions.send':             'user',
    'suggestions.action':           'mod',
    'suggestions.setup':            'op',
    // Moderation — mod+
    'moderation.warn':              'mod',
    'moderation.timeout':           'mod',
    'moderation.kick':              'mod',
    'moderation.history':           'mod',
    'moderation.slowmode':          'mod',
    'moderation.chat-clear':        'mod',
    // Moderation — admin+
    'moderation.ban':               'admin',
    'moderation.unban':             'admin',
    'moderation.remove-sanction':   'admin',
    'moderation.warn-config':       'admin',
    // Moderation — op+
    'moderation.anuncio':           'op',
    'moderation.update-staff':      'op',
    'moderation.setup-roles':       'op',
    'moderation.roles-info':        'op',
    'moderation.bienvenida-setup':  'op',
    'moderation.bienvenida-mensaje':'op',
    'moderation.bienvenida-estado': 'op',
    'moderation.bienvenida-rol-add':'op',
    'moderation.bienvenida-rol-remove':'op',
    'moderation.bienvenida-rol-lista':'op',
    'moderation.bienvenida-vista':  'op',
    'moderation.bienvenida-info':   'op',
    // Polls
    'poll.create':                  'admin',
    'poll.end':                     'admin',
    'poll.results':                 'admin',
    'poll.list':                    'admin',
    'poll.clear':                   'op',
    // Audit
    'audit.toggle':                 'op',
    'audit.lookup':                 'op',
    // Top-level (no subcommands)
    'botinfo':                      'user',
    'help':                         'user',
    'config':                       'op',
};

// Ordered sections with subcommands
const SECTION_CONFIG = [
    { name: 'tickets',     label: '🎫 Tickets y Soporte' },
    { name: 'suggestions', label: '📢 Sugerencias' },
    { name: 'moderation',  label: '⚔️ Moderación' },
    { name: 'poll',        label: '📊 Encuestas' },
    { name: 'audit',       label: '🔍 Auditoría' },
];

// Top-level commands shown in the utility field
const TOP_LEVEL_CMDS = ['botinfo', 'help', 'config'];

/**
 * Returns the registered command, accounting for the 'd' dev-mode prefix.
 */
function getCmd(client, realName) {
    return client.commands.get(realName) ?? client.commands.get(`d${realName}`);
}

/**
 * Returns formatted subcommand lines visible to the given user level.
 * Names and descriptions come directly from the registered SlashCommandBuilder,
 * so they stay in sync whenever the command definition is updated.
 */
function buildCmdLines(client, cmdRealName, userLevel) {
    const userOrder = LEVEL_ORDER[userLevel] ?? 0;
    const cmd = getCmd(client, cmdRealName);
    if (!cmd) return [];
    const SUB_COMMAND = 1;
    const cmdJson = cmd.data.toJSON();
    return (cmdJson.options ?? [])
        .filter(o => o.type === SUB_COMMAND)
        .filter(sub => (LEVEL_ORDER[LEVEL_MAP[`${cmdRealName}.${sub.name}`] ?? 'user'] ?? 0) <= userOrder)
        .map(sub => `\`/${cmdRealName} ${sub.name}\` — ${sub.description}`);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra la lista de comandos disponibles y ayuda sobre el bot.'),

    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const member = interaction.member;
            const config = getGuildConfig(guild.id);

            const memberCount = guild.approximateMemberCount ?? guild.memberCount ?? '?';
            const level = getMemberLevel(member, config);
            const userOrder = LEVEL_ORDER[level] ?? 0;

            const levelLabel = level === 'op'    ? '👑 Operador/Directiva'
                             : level === 'admin' ? '⚔️ Administración'
                             : level === 'mod'   ? '🛡️ Moderador'
                             : '👤 Usuario';
            const embedColor = level === 'op'    ? '#9B59B6'
                             : level === 'admin' ? '#FF0000'
                             : level === 'mod'   ? '#FF9900'
                             : '#57F287';

            const fields = [];

            // Commands with subcommands — auto-built from the registered builders
            for (const section of SECTION_CONFIG) {
                const lines = buildCmdLines(interaction.client, section.name, level);
                if (lines.length === 0) continue;
                fields.push({ name: section.label, value: lines.join('\n') });
            }

            // Top-level commands
            const topLines = TOP_LEVEL_CMDS
                .filter(name => (LEVEL_ORDER[LEVEL_MAP[name] ?? 'user'] ?? 0) <= userOrder)
                .map(name => {
                    const cmd = getCmd(interaction.client, name);
                    const desc = cmd?.data?.toJSON()?.description ?? '';
                    return `\`/${name}\` — ${desc}`;
                });
            if (topLines.length) fields.push({ name: '🔍 Utilidad', value: topLines.join('\n') });

            // Useful links (always shown)
            fields.push({
                name: '🌐 Enlaces Útiles',
                value: '🔗 **IP:** `play.tacoland.es` / `bedrock.tacoland.es`\n' +
                       '🛒 **Tienda:** [tienda.tacoland.es](https://tienda.tacoland.es)\n' +
                       '🌐 **Web:** [tacoland.es](https://tacoland.es)',
            });

            const embed = new EmbedBuilder()
                .setTitle(`🌮 Ayuda de ${interaction.client.user.username}`)
                .setDescription(
                    `¡Hola, ${member.displayName}! Soy el asistente integral de **TacoLand**.\n` +
                    `Estás viendo el panel de **${levelLabel}**.\n\n` +
                    `👥 Actualmente somos **${memberCount} miembros** en el servidor.\n\n` +
                    `Usa los comandos empezando con \`/\` para interactuar conmigo.`
                )
                .setColor(embedColor)
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(...fields)
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('[HelpCommand] Error al ejecutar:', error);
            await interaction.reply({
                content: '❌ Hubo un error al intentar mostrar el menú de ayuda.',
                ephemeral: true,
            });
        }
    },
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra la lista de comandos disponibles y ayuda sobre el bot.'),

    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const member = interaction.member;
            const config = getGuildConfig(guild.id);

            // Contar miembros aproximado (sin fetch masivo que causa rate limit)
            const memberCount = guild.approximateMemberCount ?? guild.memberCount ?? '?';

            const level = getMemberLevel(member, config);
            const ismod   = ['mod', 'admin', 'op'].includes(level);
            const isadmin = ['admin', 'op'].includes(level);
            const isop    = level === 'op';

            const levelLabel = isop ? '👑 Operador/Directiva' : isadmin ? '⚔️ Administración' : ismod ? '🛡️ Moderador' : '👤 Usuario';
            const embedColor = isop ? '#9B59B6' : isadmin ? '#FF0000' : ismod ? '#FF9900' : '#57F287';

            const fields = [];

            // ── Tickets ────────────────────────────────────────────────────────
            if (isop) {
                fields.push({
                    name: '🎫 Soporte y Tickets',
                    value: '`/tickets setup` - Configura el sistema de tickets.\n' +
                           '`/tickets panel` - Crea un panel de apertura de tickets.\n' +
                           '`/tickets add/remove` - Gestiona usuarios en un ticket.\n' +
                           '`/tickets close` - Cierra un ticket de soporte.'
                });
            } else {
                fields.push({
                    name: '🎫 Soporte y Tickets',
                    value: '`/tickets close` - Cierra tu ticket de soporte.'
                });
            }

            // ── Sugerencias ────────────────────────────────────────────────────
            if (isop) {
                fields.push({
                    name: '📢 Sugerencias',
                    value: '`/suggestions setup` - Configura los canales de sugerencias.\n' +
                           '`/suggestions send` - Envía una nueva sugerencia.\n' +
                           '`/suggestions action` - Acepta o deniega sugerencias.'
                });
            } else if (ismod) {
                fields.push({
                    name: '📢 Sugerencias',
                    value: '`/suggestions send` - Envía una nueva sugerencia.\n' +
                           '`/suggestions action` - Acepta o deniega sugerencias.'
                });
            } else {
                fields.push({
                    name: '📢 Sugerencias',
                    value: '`/suggestions send` - Envía una nueva sugerencia a la comunidad.'
                });
            }

            // ── Moderación ─────────────────────────────────────────────────────
            if (isadmin) {
                fields.push({
                    name: '⚔️ Moderación (Admin)',
                    value: '`/moderation ban` - Banea a un usuario (permanente o temporal).\n' +
                           '`/moderation unban` - Desbanea a un usuario por ID.\n' +
                           '`/moderation remove-sanction` - Retira una sanción del historial.'
                });
            }
            if (ismod) {
                fields.push({
                    name: '🛡️ Moderación',
                    value: '`/moderation warn` - Aplica una advertencia a un usuario.\n' +
                           '`/moderation timeout` - Silencia a un usuario (usa `perm` para permanente).\n' +
                           '`/moderation kick` - Expulsa a un usuario.\n' +
                           '`/moderation history` - Consulta el historial de sanciones.\n' +
                           '`/moderation chat-clear` - Borra mensajes del canal.'
                });
            }

            // ── Config (Operador) ──────────────────────────────────────────────
            if (isop) {
                fields.push({
                    name: '👋 Bienvenida y Despedida',
                    value: '`/moderation bienvenida-setup` - Establece el canal de bienvenida/despedida.\n' +
                           '`/moderation bienvenida-mensaje` - Personaliza el mensaje de bienvenida o despedida.\n' +
                           '`/moderation bienvenida-estado` - Activa o desactiva los mensajes.\n' +
                           '`/moderation bienvenida-rol-add/remove` - Gestiona roles que se asignan al entrar.\n' +
                           '`/moderation bienvenida-rol-lista` - Lista los roles de bienvenida configurados.\n' +
                           '`/moderation bienvenida-vista` - Previsualiza los mensajes.\n' +
                           '`/moderation bienvenida-info` - Muestra la configuración actual.'
                });
                fields.push({
                    name: '⚙️ Configuración del bot',
                    value: '`/moderation anuncio` - Envía un anuncio al servidor.\n' +
                           '`/moderation update-staff` - Publica un cambio en el equipo.\n' +
                           '`/moderation setup-roles` - Configura los roles de moderación.\n' +
                           '`/moderation roles-info` - Muestra los rangos configurados y sus permisos.'
                });
            }

            // ── Auditoría ──────────────────────────────────────────────────────
            if (isop) {
                fields.push({
                    name: '🔍 Auditoría y Utilidad',
                    value: '`/audit lookup` - Investiga el historial completo de un usuario.\n' +
                           '`/botinfo` - Muestra estadísticas del bot.\n' +
                           '`/help` - Muestra este mensaje.'
                });
            } else {
                fields.push({
                    name: '🔍 Utilidad',
                    value: '`/botinfo` - Muestra estadísticas del bot.\n' +
                           '`/help` - Muestra este mensaje.'
                });
            }

            // ── Encuestas ──────────────────────────────────────────────────────
            if (isop) {
                fields.push({
                    name: '📊 Encuestas',
                    value: '`/poll create` - Crea una nueva encuesta con modal.\n' +
                           '`/poll end` - Cierra una encuesta y publica resultados.\n' +
                           '`/poll results` - Consulta resultados de una encuesta.\n' +
                           '`/poll list` - Lista las encuestas activas del servidor.\n' +
                           '`/poll clear` - Borra todo el historial de encuestas.'
                });
            } else if (isadmin) {
                fields.push({
                    name: '📊 Encuestas',
                    value: '`/poll create` - Crea una nueva encuesta con modal.\n' +
                           '`/poll end` - Cierra una encuesta y publica resultados.\n' +
                           '`/poll results` - Consulta resultados de una encuesta.\n' +
                           '`/poll list` - Lista las encuestas activas del servidor.'
                });
            } else {
                fields.push({
                    name: '📊 Encuestas',
                    value: '`/poll results` - Consulta resultados de una encuesta.\n' +
                           '`/poll list` - Lista las encuestas activas del servidor.'
                });
            }

            // ── Enlaces ────────────────────────────────────────────────────────
            fields.push({
                name: '🌐 Enlaces Útiles',
                value: '🔗 **IP:** `play.tacoland.es` / `bedrock.tacoland.es`\n' +
                       '🛒 **Tienda:** [tienda.tacoland.es](https://tienda.tacoland.es)\n' +
                       '🌐 **Web:** [tacoland.es](https://tacoland.es)'
            });

            const embed = new EmbedBuilder()
                .setTitle(`🌮 Ayuda de ${interaction.client.user.username}`)
                .setDescription(
                    `¡Hola, ${member.displayName}! Soy el asistente integral de **TacoLand**.\n` +
                    `Estás viendo el panel de **${levelLabel}**.\n\n` +
                    `👥 Actualmente somos **${memberCount} miembros** en el servidor.\n\n` +
                    `Usa los comandos empezando con \`/\` para interactuar conmigo.`
                )
                .setColor(embedColor)
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .addFields(...fields)
                .setFooter({
                    text: `Solicitado por ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error('[HelpCommand] Error al ejecutar:', error);
            await interaction.reply({
                content: '❌ Hubo un error al intentar mostrar el menú de ayuda.',
                ephemeral: true
            });
        }
    },
};
