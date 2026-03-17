const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../../../utils/logger.js');

// Importar subcomandos
const chatClear = require('../subcommands/moderation/chatClear');
const updateStaff = require('../subcommands/moderation/updateStaff');
const anuncio = require('../subcommands/moderation/anuncio');
const actions = require('../subcommands/moderation/actions');
const history = require('../subcommands/moderation/history');
const unban = require('../subcommands/moderation/unban');
const removeSanction = require('../subcommands/moderation/removeSanction');
const setupRoles = require('../subcommands/moderation/setupRoles');

module.exports = {
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
                            { name: 'Admin (Ban/Remove Sanction)', value: 'admin' }
                        ))
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('El rol mínimo requerido.')
                        .setRequired(true))
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
        ),

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
            } else if (subcommand === 'remove-sanction') {
                return await removeSanction.execute(interaction);
            } else if (subcommand === 'chat-clear') {
                return await chatClear.execute(interaction);
            } else if (subcommand === 'update-staff') {
                return await updateStaff.execute(interaction);
            } else if (subcommand === 'anuncio') {
                return await anuncio.execute(interaction);
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
