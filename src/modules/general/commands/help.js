const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/logger');
const { getGuildConfig } = require('../../../database/database');
const { getMemberLevel } = require('../../../utils/permCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Muestra la lista de comandos disponibles y ayuda sobre el bot.'),

    async execute(interaction) {
        try {
            const guild = interaction.guild;
            const member = interaction.member;
            const config = getGuildConfig(guild.id);

            // Contar miembros (sin bots)
            await guild.members.fetch();
            const memberCount = guild.members.cache.filter(m => !m.user.bot).size;

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
