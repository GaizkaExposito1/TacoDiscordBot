const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../../../utils/logger.js');
const { getGuildConfig, updateGuildConfig } = require('../../../database/database');
const { requireLevel } = require('../../../utils/permCheck');

// Importar subcomandos
const chatClear = require('../subcommands/moderation/chatClear');
const updateStaff = require('../subcommands/moderation/updateStaff');
const anuncio = require('../subcommands/moderation/anuncio');
const actions = require('../subcommands/moderation/actions');
const history = require('../subcommands/moderation/history');
const unban = require('../subcommands/moderation/unban');
const removeSanction = require('../subcommands/moderation/removeSanction');
const setupRoles = require('../subcommands/moderation/setupRoles');
const bienvenidaConfig = require('../subcommands/moderation/bienvenidaConfig');
const rolesInfo = require('../subcommands/moderation/rolesInfo');
const slowmode = require('../subcommands/moderation/slowmode');

module.exports = {
    module: 'moderation',
    data: new SlashCommandBuilder()
        .setName('moderation')
        .setDescription('Comandos de moderación general')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        // ------------------ SUBCOMANDO: SETUP-ROLES ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup-roles')
                .setDescription('Configura los roles mínimos para moderar.')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('El tipo de nivel de moderación.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Mod (Warn/Timeout/Kick)', value: 'mod' },
                            { name: 'Admin (Ban/Unban/Remove Sanction)', value: 'admin' },
                            { name: 'Operador/Directiva (Config del bot)', value: 'op' }
                        ))
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('El rol mínimo requerido.')
                        .setRequired(true))
        )
        // ------------------ SUBCOMANDO: ROLES-INFO ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('roles-info')
                .setDescription('Muestra los rangos configurados y qué permisos tiene cada uno.')
        )
        // ------------------ SUBCOMANDO: WARN ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('warn')
                .setDescription('Aplica una advertencia (warn) a un usuario.')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('Usuario a advertir.')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('razon')
                        .setDescription('Razón del warn.')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('expiracion')
                        .setDescription('Tiempo hasta que el warn expire automáticamente (ej: 7d, 30d). Vacío = permanente.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: TIMEOUT ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('timeout')
                .setDescription('Aislar (mute) a un usuario por tiempo determinado.')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('Usuario a silenciar.')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('duracion')
                        .setDescription('Duración del silencio (ej: 10m, 1h, 1d).')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('razon')
                        .setDescription('Razón del silencio.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: KICK ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('kick')
                .setDescription('Expulsar a un usuario del servidor.')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('Usuario a expulsar.')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('razon')
                        .setDescription('Razón de la expulsión.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: BAN ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('ban')
                .setDescription('Banear a un usuario del servidor.')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('Usuario a banear.')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('razon')
                        .setDescription('Razón del baneo.')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('duracion')
                        .setDescription('Duración del baneo (ej: 1d, 7d, 30d). Vacío = Permanente.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: HISTORY ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('history')
                .setDescription('Ver historial de sanciones de un usuario.')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('Usuario a consultar (puedes dejar vacío para ver el tuyo).')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: UNBAN ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('unban')
                .setDescription('Retira el baneo a un usuario.')
                .addStringOption(option =>
                    option.setName('usuario_id')
                        .setDescription('La ID del usuario a desbanear.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('razon')
                        .setDescription('Razón del desbaneo.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: REMOVE-SANCTION ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-sanction')
                .setDescription('Retira una sanción del historial de un usuario.')
                .addIntegerOption(option =>
                    option.setName('id_sancion')
                        .setDescription('El ID de la sanción a eliminar (ver con /moderation history).')
                        .setRequired(false))
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario del cual retirar la última sanción.')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: CHAT-CLEAR ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('chat-clear')
                .setDescription('Borra mensajes del chat. Sin argumentos reinicia el canal.')
                .addStringOption(option =>
                    option.setName('filtro')
                        .setDescription('Cantidad (ej: 50) o Tiempo (ej: 1h, 1d). Vacío = Reiniciar canal')
                        .setRequired(false))
        )
        // ------------------ SUBCOMANDO: ANUNCIO (Anuncios normales) ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('anuncio')
                .setDescription('Envía un anuncio normal (con modal).')
                .addStringOption(option =>
                    option.setName('tipo')
                        .setDescription('El tipo de anuncio a enviar.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Error', value: 'error' },
                            { name: 'Normal', value: 'normal' },
                            { name: 'Incidencia', value: 'incidencia' },
                            { name: 'Anuncio', value: 'anuncio' },
                        ))
                .addStringOption(option =>
                    option.setName('mencion')
                        .setDescription('Mencionar a todos o a un grupo.')
                        .setRequired(false)
                        .addChoices(
                            { name: '@everyone', value: '@everyone' },
                            { name: '@here', value: '@here' }
                        ))
                .addRoleOption(option => 
                    option.setName('rol')
                        .setDescription('Rol a mencionar (opcional).')
                        .setRequired(false))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('El canal donde se enviará el anuncio. (Opcional)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )
        // ------------------ SUBCOMANDO: UPDATE-STAFF (Nuevo) ------------------
        .addSubcommand(subcommand =>
            subcommand
                .setName('update-staff')
                .setDescription('Envía un anuncio de actualización de staff.')
                .addUserOption(option => 
                    option.setName('usuario')
                        .setDescription('Usuario afectado.')
                        .setRequired(true))
                .addRoleOption(option => 
                    option.setName('rango_staff')
                        .setDescription('Rango afectado.')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('accion')
                        .setDescription('Acción realizada.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Promote', value: 'promote' },
                            { name: 'Downgrade', value: 'downgrade' },
                            { name: 'Join', value: 'join' },
                            { name: 'Resign', value: 'resign' }
                        ))
                .addStringOption(option =>
                    option.setName('mencion')
                        .setDescription('Mencionar a todos o a un grupo (opcional).')
                        .setRequired(false)
                        .addChoices(
                            { name: '@everyone', value: '@everyone' },
                            { name: '@here', value: '@here' }
                        ))
                .addChannelOption(option =>
                    option.setName('canal')
                        .setDescription('El canal donde se enviará el anuncio. (Opcional)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )
        // ── BIENVENIDA: SETUP ──────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-setup')
                .setDescription('Establece el canal de bienvenida y despedida.')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Canal donde se publicarán los mensajes.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
        )
        // ── BIENVENIDA: MENSAJE ────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-mensaje')
                .setDescription('Personaliza el mensaje de bienvenida o despedida.')
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Tipo de mensaje.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bienvenida', value: 'welcome' },
                            { name: 'Despedida',  value: 'goodbye' },
                        ))
                .addStringOption(opt =>
                    opt.setName('texto')
                        .setDescription('Texto del mensaje. Usa {user}, {username}, {server}, {member_count}.')
                        .setRequired(true)
                        .setMaxLength(1000))
        )
        // ── BIENVENIDA: ESTADO ─────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-estado')
                .setDescription('Activa o desactiva la bienvenida o despedida.')
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Función a cambiar.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bienvenida', value: 'welcome' },
                            { name: 'Despedida',  value: 'goodbye' },
                        ))
                .addStringOption(opt =>
                    opt.setName('valor')
                        .setDescription('¿Activar o desactivar?')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Activar',    value: '1' },
                            { name: 'Desactivar', value: '0' },
                        ))
        )
        // ── BIENVENIDA: ROL-ADD ────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-rol-add')
                .setDescription('Añade un rol que se asignará automáticamente al entrar.')
                .addRoleOption(opt =>
                    opt.setName('rol')
                        .setDescription('Rol a asignar.')
                        .setRequired(true))
        )
        // ── BIENVENIDA: ROL-REMOVE ─────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-rol-remove')
                .setDescription('Quita un rol de la asignación automática.')
                .addRoleOption(opt =>
                    opt.setName('rol')
                        .setDescription('Rol a quitar.')
                        .setRequired(true))
        )
        // ── BIENVENIDA: ROL-LISTA ──────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-rol-lista')
                .setDescription('Muestra los roles de asignación automática configurados.')
        )
        // ── BIENVENIDA: VISTA-PREVIA ───────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-vista')
                .setDescription('Muestra una vista previa de los mensajes de bienvenida y despedida.')
        )
        // ── BIENVENIDA: INFO ───────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('bienvenida-info')
                .setDescription('Muestra la configuración actual de bienvenida y despedida.')
        )
        // ── SILENCIADO ROL ─────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('silenciado-rol')
                .setDescription('Configura el rol de Silenciado (se asigna/quita con timeout automáticamente).')
                .addRoleOption(opt =>
                    opt.setName('rol')
                        .setDescription('El rol de Silenciado del servidor.')
                        .setRequired(true))        )
        // ── SLOWMODE ────────────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('slowmode')
                .setDescription('Activa o desactiva el modo lento en un canal. [Mod+]')
                .addChannelOption(opt =>
                    opt.setName('canal')
                        .setDescription('Canal donde aplicar el slow mode.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('segundos')
                        .setDescription('Segundos de espera entre mensajes (0 = desactivar).')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(21600))
        )
        // ── WARN-CONFIG ───────────────────────────────────────────────────
        .addSubcommand(sub =>
            sub
                .setName('warn-config')
                .setDescription('Configura el sistema de warns: umbral, acción automática y expiración global. [Solo Op]')
                .addIntegerOption(opt =>
                    opt.setName('umbral')
                        .setDescription('Número de warns activos para activar la acción (0 = desactivado).')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(50))
                .addStringOption(opt =>
                    opt.setName('accion')
                        .setDescription('Acción automática al alcanzar el umbral.')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Ninguna (solo mostrar aviso en el warn)', value: 'none' },
                            { name: 'Timeout', value: 'timeout' },
                            { name: 'Kick', value: 'kick' },
                            { name: 'Ban', value: 'ban' },
                        ))
                .addStringOption(opt =>
                    opt.setName('duracion')
                        .setDescription('Duración del timeout/ban automático (ej: 1h, 7d). Solo timeout o ban.')
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName('expiracion_global')
                        .setDescription('Expiración global para TODOS los warns nuevos (ej: 7d, 30d). Vacío = sin expiración.')
                        .setRequired(false))        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (['warn', 'timeout', 'kick', 'ban'].includes(subcommand)) {
                return await actions.execute(interaction);
            } else if (subcommand === 'history') {
                return await history.execute(interaction);
            } else if (subcommand === 'unban') {
                return await unban.execute(interaction);
            } else if (subcommand === 'setup-roles') {
                return await setupRoles.execute(interaction);
            } else if (subcommand === 'roles-info') {
                return await rolesInfo.execute(interaction);
            } else if (subcommand === 'remove-sanction') {
                return await removeSanction.execute(interaction);
            } else if (subcommand === 'chat-clear') {
                return await chatClear.execute(interaction);
            } else if (subcommand === 'update-staff') {
                return await updateStaff.execute(interaction);
            } else if (subcommand === 'anuncio') {
                return await anuncio.execute(interaction);
            } else if (subcommand.startsWith('bienvenida-')) {
                return await bienvenidaConfig.execute(interaction);
            } else if (subcommand === 'slowmode') {
                return await slowmode.execute(interaction);
            } else if (subcommand === 'warn-config') {
                const config = getGuildConfig(interaction.guild.id);
                if (!await requireLevel(interaction, config, 'op')) return;
                const umbral   = interaction.options.getInteger('umbral');
                const accion   = interaction.options.getString('accion');
                const duracion = interaction.options.getString('duracion');
                const expGlobal = interaction.options.getString('expiracion_global');
                updateGuildConfig(interaction.guild.id, 'warn_threshold', umbral);
                updateGuildConfig(interaction.guild.id, 'warn_action', accion);
                updateGuildConfig(interaction.guild.id, 'warn_action_duration', duracion);
                updateGuildConfig(interaction.guild.id, 'warn_default_expiry', expGlobal);
                const lines = [];
                if (umbral === 0 || accion === 'none') {
                    lines.push('✅ Acción automática de warns **desactivada**.');
                } else {
                    lines.push(`✅ Al acumular **${umbral} warns** activos: **${accion.toUpperCase()}**${duracion ? ` (${duracion})` : ''}.`);
                }
                lines.push(expGlobal
                    ? `⌛ Expiración global configurada a **${expGlobal}**. Todos los warns nuevos expirarán automáticamente.`
                    : '⚠️ Expiración global **desactivada**. Los warns serán permanentes salvo que se especifique al aplicarlos.');
                return interaction.reply({ content: lines.join('\n'), ephemeral: true });
            } else if (subcommand === 'silenciado-rol') {
                if (!await requireLevel(interaction, getGuildConfig(interaction.guild.id), 'op')) return;
                const rol = interaction.options.getRole('rol');
                updateGuildConfig(interaction.guild.id, 'silenciado_role_id', rol.id);
                return interaction.reply({ content: `✅ Rol de Silenciado configurado: ${rol}`, ephemeral: true });
            } else {
                logger.warn(`Subcomando desconocido: ${subcommand}`);
                return await interaction.reply({ content: '❌ Subcomando desconocido.', ephemeral: true });
            }
        } catch (error) {
            logger.error(`Error ejecutando subcomando ${subcommand}: ${error}`);
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true });
            }
        }
    },
};
