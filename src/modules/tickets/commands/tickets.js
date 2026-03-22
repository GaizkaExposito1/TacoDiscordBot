const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle
} = require('discord.js');

const { 
    getTicketByChannel, 
    getGuildConfig, 
    updateGuildConfig, 
    getTicketStats, 
    getStaffStats, 
    getAllStaffStats,
    getLatestRatings, 
    deleteTicketHistory,
    addDepartment,
    getDepartments,
    setPanelReference,
    setTicketMessage,
    removeDepartment,
    updateDepartmentForm,
    getPanelReference
} = require('../../../database/database');

const { processTicketClosure, handleClaimTicket, handleUnclaimTicket } = require('../services/ticketService');
const { requireLevel } = require('../../../utils/permCheck');
const { replyError, replySuccess, replyInfo, replyWarning } = require('../../../utils/responses');
const { buildEmbed, simpleEmbed } = require('../../../utils/embeds');
const { logAudit } = require('../../../utils/audit');
const { generateTranscript } = require('../../../utils/transcript');
const { AUDIT_ACTIONS, COLORS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

// --- Helper Functions from config.js ---
async function updateLivePanel(client, guildId) {
    const ref = getPanelReference(guildId);
    if (!ref) return;

    try {
        const channel = await client.channels.fetch(ref.channelId);
        if (!channel?.isTextBased()) return;
        const message = await channel.messages.fetch(ref.messageId);
        if (!message) return;

        // Reconstruir embed
        const panelEmbed = buildEmbed(guildId, 'panel', {});

        // Reconstruir select menu con departamentos actualizados
        const departments = getDepartments(guildId);
        if (departments.length === 0) return;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_department_select')
            .setPlaceholder('📩 Selecciona una categoria')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(
                departments.map(dept => ({
                    label: dept.name,
                    value: String(dept.id),
                    description: dept.description?.substring(0, 100) ?? 'Sin descripción',
                    emoji: dept.emoji || '📩',
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await message.edit({
            embeds: [panelEmbed],
            components: [row],
        });

        logger.info('[Config] Panel actualizado en vivo.');
    } catch (err) {
        logger.warn('[Config] No se pudo actualizar el panel en vivo:', err.message);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tickets')
        .setDescription('Comando unificado para gestión de tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages) // Permisos base, cada subcomando filtra

        // --- GESTIÓN DE TICKET ACTUAL (ticket.js) ---
        .addSubcommand(sub => sub.setName('add')
            .setDescription('Añade a un usuario al ticket actual.')
            .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a añadir').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('remove')
            .setDescription('Elimina a un usuario del ticket actual.')
            .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a eliminar').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('close')
            .setDescription('Cierra el ticket actual.')
            .addStringOption(opt => opt.setName('razon').setDescription('La razón del cierre (opcional)'))
        )
        .addSubcommand(sub => sub.setName('claim')
            .setDescription('Reclama este ticket para ti.')
        )
        .addSubcommand(sub => sub.setName('unclaim')
            .setDescription('Libera este ticket.')
        )
        .addSubcommand(sub => sub.setName('transcript')
            .setDescription('Genera una transcripción HTML del canal actual (Prueba).')
        )

        // --- SETUP / PANEL (setup-tickets.js) ---
        .addSubcommand(sub => sub.setName('setup')
            .setDescription('Envía el panel de tickets (Admin).')
        )

        // --- ESTADÍSTICAS (stats.js, staffstats.js, ratings.js) ---
        .addSubcommand(sub => sub.setName('stats')
            .setDescription('Muestra estadísticas detalladas de los tickets (Staff).')
        )
        .addSubcommand(sub => sub.setName('staff-stats')
            .setDescription('Estadísticas de staff (Admin/Manager).')
            .addUserOption(option => option.setName('usuario').setDescription('El miembro del staff (Opcional)'))
            .addIntegerOption(option => option.setName('dias').setDescription('Periodo en días').setMinValue(1))
        )
        .addSubcommand(sub => sub.setName('ratings')
            .setDescription('Muestra valoraciones de tickets (Staff).')
            .addUserOption(option => option.setName('usuario').setDescription('Usuario (Opcional)'))
            .addIntegerOption(option => option.setName('limite').setDescription('Límite resultados').setMinValue(1).setMaxValue(25))
        )

        // --- ADMINISTRACIÓN (deleteHistory.js) ---
        .addSubcommand(sub => sub.setName('delete-history')
            .setDescription('¡PELIGRO! Borra TODO el historial de tickets (Admin).')
        )

        // --- CONFIGURACIÓN (config.js) ---
        // IMPORTANTE: Discord SOLO permite 3 niveles: Comando -> Grupo -> Subcomando.
        // Si 'tickets' es nivel 1, 'config' es nivel 2 (Grupo). Los subcomandos de config serán nivel 3.
        // NO se pueden tener grupos dentro de grupos.
        // Por tanto, los subcomandos de config.js que eran grupos ('preguntas') deben aplanarse o moverse.
        // 'tickets config preguntas-add' es una opción válida para aplanar.
        .addSubcommandGroup(group => group.setName('config')
            .setDescription('Configuración del sistema de tickets')
            .addSubcommand(sub => sub.setName('ver').setDescription('Ver configuración actual'))
            .addSubcommand(sub => sub.setName('roles').setDescription('Configura roles').addRoleOption(o=>o.setName('staff').setDescription('Rol soporte')).addRoleOption(o=>o.setName('admin').setDescription('Rol admin')))
            .addSubcommand(sub => sub.setName('logs').setDescription('Canal de logs').addChannelOption(o=>o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
            .addSubcommand(sub => sub.setName('transcripciones').setDescription('Canal transcripciones').addChannelOption(o=>o.setName('canal').setDescription('Canal').addChannelTypes(ChannelType.GuildText).setRequired(true)))
            .addSubcommand(sub => sub.setName('categoria').setDescription('Categoría tickets').addChannelOption(o=>o.setName('categoria').setDescription('Categoría').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))
            .addSubcommand(sub => sub.setName('mensaje').setDescription('Mensajes personalizados').addStringOption(o=>o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices({name:'Panel',value:'panel'},{name:'Bienvenida',value:'ticket_welcome'},{name:'Cierre',value:'ticket_close'},{name:'Reclamado',value:'ticket_claimed'})).addStringOption(o=>o.setName('titulo').setDescription('Titulo')).addStringOption(o=>o.setName('descripcion').setDescription('Descripcion')).addStringOption(o=>o.setName('color').setDescription('Color')).addStringOption(o=>o.setName('footer').setDescription('Footer')))
            .addSubcommand(sub => sub.setName('dept-add').setDescription('Añadir depto').addStringOption(o=>o.setName('nombre').setDescription('Nombre').setRequired(true)).addStringOption(o=>o.setName('emoji').setDescription('Emoji')).addStringOption(o=>o.setName('descripcion').setDescription('Desc')))
            .addSubcommand(sub => sub.setName('dept-del').setDescription('Eliminar depto').addIntegerOption(o=>o.setName('id').setDescription('ID Depto').setRequired(true)))
            .addSubcommand(sub => sub.setName('contador').setDescription('Modo de numeración de tickets').addStringOption(o=>o.setName('modo').setDescription('Modo del contador').setRequired(true).addChoices({name:'Global (un único contador para todos)',value:'global'},{name:'Por categoría (contador por departamento)',value:'category'})))
            .addSubcommand(sub => sub.setName('max-tickets').setDescription('Máximo de tickets abiertos por usuario').addIntegerOption(o=>o.setName('limite').setDescription('Número máximo (1-10)').setRequired(true).setMinValue(1).setMaxValue(10)))
            
            // Aplanando el grupo 'preguntas' de config.js
            .addSubcommand(sub => sub.setName('preguntas-add').setDescription('Añadir pregunta a form').addIntegerOption(o=>o.setName('departamento').setDescription('Depto').setRequired(true).setAutocomplete(true)))
            .addSubcommand(sub => sub.setName('preguntas-edit').setDescription('Editar pregunta form').addIntegerOption(o=>o.setName('departamento').setDescription('Depto').setRequired(true).setAutocomplete(true)).addStringOption(o=>o.setName('pregunta_id').setDescription('ID Pregunta').setRequired(true).setAutocomplete(true)))
            .addSubcommand(sub => sub.setName('preguntas-del').setDescription('Eliminar pregunta form').addIntegerOption(o=>o.setName('departamento').setDescription('Depto').setRequired(true).setAutocomplete(true)).addStringOption(o=>o.setName('pregunta_id').setDescription('ID Pregunta').setRequired(true).setAutocomplete(true)))
            .addSubcommand(sub => sub.setName('preguntas-list').setDescription('Listar preguntas form').addIntegerOption(o=>o.setName('departamento').setDescription('Depto').setRequired(true).setAutocomplete(true)))
        ),

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const guildId = interaction.guild.id;

        if (focusedOption.name === 'departamento') {
            const departments = getDepartments(guildId);
            const value = focusedOption.value.toLowerCase();
            const filtered = departments.filter(dept => 
                dept.name.toLowerCase().includes(value) ||
                String(dept.id).includes(value)
            );
            await interaction.respond(filtered.slice(0, 25).map(dept => ({ name: `${dept.emoji || '📂'} ${dept.name}`, value: dept.id })));
        }

        if (focusedOption.name === 'pregunta_id') {
            const departmentId = interaction.options.getInteger('departamento');
            if (!departmentId) return await interaction.respond([{ name: '⚠️ Primero selecciona un departamento', value: 'error_no_dept' }]);
            
            const departments = getDepartments(guildId);
            const dept = departments.find(d => d.id === departmentId);
            
            if (!dept || !dept.form_json) return await interaction.respond([{ name: 'ℹ️ Sin preguntas', value: 'error_no_questions' }]);

            let questions = [];
            try {
                const parsed = JSON.parse(dept.form_json);
                questions = Array.isArray(parsed) ? parsed : [{ id: 'legacy', label: parsed.label }];
            } catch (e) { return await interaction.respond([]); }

            const value = focusedOption.value.toLowerCase();
            const filtered = questions.filter(q => (q.label?.toLowerCase().includes(value) || q.id?.toLowerCase().includes(value)));
            await interaction.respond(filtered.slice(0, 25).map(q => ({ name: (q.label||'Texto').substring(0,100), value: q.id||'legacy' })));
        }
    },

    async execute(interaction) {
        const { guild, channel, user, options, client } = interaction;
        const config = getGuildConfig(guild.id);
        const subcommandGroup = options.getSubcommandGroup();
        const subcommand = options.getSubcommand();

        // --- ROUTING ---

        // 1. TICKET OPERATIONS (ticket.js)
        if (!subcommandGroup && ['add', 'remove', 'close', 'claim', 'unclaim'].includes(subcommand)) {
             const ticket = getTicketByChannel(channel.id);
             if (!ticket) return replyError(interaction, 'Este comando solo se puede usar dentro de un canal de ticket.', true);

             const member = await guild.members.fetch(user.id);
             const isStaff = (config.staff_role_id && member.roles.cache.has(config.staff_role_id));
             const isAdmin = (config.admin_role_id && member.roles.cache.has(config.admin_role_id)) || member.permissions.has(PermissionFlagsBits.Administrator);

             if (subcommand === 'claim') return handleClaimTicket(interaction, ticket, user, isStaff, isAdmin);
             if (subcommand === 'unclaim') return handleUnclaimTicket(interaction, ticket, user, isStaff, isAdmin);
             
             if (subcommand === 'close') {
                 // Check permissions for close? handled in service or basic check here
                 processTicketClosure(interaction, ticket, user, options.getString('razon'));
                 return;
             }

             // Add/Remove User
             const targetUser = options.getUser('usuario');
             if (subcommand === 'add') {
                 if (!isStaff && !isAdmin && ticket.user_id !== user.id) return replyError(interaction, 'No tienes permiso.', true);
                 await channel.permissionOverwrites.create(targetUser, { ViewChannel: true, SendMessages: true });
                 return replySuccess(interaction, `Se ha añadido a ${targetUser} al ticket.`);
             }
             if (subcommand === 'remove') {
                 if (!isStaff && !isAdmin) return replyError(interaction, 'No tienes permiso.', true);
                 await channel.permissionOverwrites.delete(targetUser);
                 return replySuccess(interaction, `Se ha eliminado a ${targetUser} del ticket.`);
             }
        }

        // 1.5 TRANSCRIPT (TEST)
        if (subcommand === 'transcript') {
             if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                 return replyError(interaction, 'Necesitas permiso de Gestionar Mensajes para crear transcripts de prueba.', true);
             }
             
             await interaction.deferReply();
             try {
                const attachment = await generateTranscript(channel, {
                    limit: -1,
                    filename: `transcript-${channel.name}.html`
                });

                await interaction.editReply({ 
                    content: `📄 **Transcripción HTML Mejorada** generada para ${channel}`, 
                    files: [attachment] 
                });
             } catch (error) {
                logger.error(`Error generando transcript: ${error}`);
                await interaction.editReply({ content: '❌ Error al generar la transcripción.' });
             }
             return;
        }

        // 2. SETUP (setup-tickets.js)
        if (subcommand === 'setup') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return replyError(interaction, 'Permiso denegado.', true);
            if (!config.ticket_category_id) return replyError(interaction, 'Configura la categoría primero: `/tickets config categoria`', true);

            let departments = getDepartments(guild.id);
            if (departments.length === 0) {
                addDepartment(guild.id, 'Soporte General', '🛠️', 'Consultas generales');
                departments = getDepartments(guild.id);
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_department_select')
                .setPlaceholder('Despliega el menú y elige una categoría')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(departments.map(d => ({ label: d.name, value: String(d.id), description: d.description?.substring(0,100), emoji: d.emoji||'📩' })));

            const embed = buildEmbed(guild.id, 'panel', {});
            const msg = await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
            
            setPanelReference(guild.id, channel.id, msg.id);
            return replySuccess(interaction, 'Panel de tickets enviado.', true);
        }

        // 3. STATS
        if (subcommand === 'stats') {
             if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return replyError(interaction, 'Permiso denegado.', true);
             
             const stats = getTicketStats(guild.id);
             const embed = new EmbedBuilder()
                .setTitle('📊 Resumen de Actividad de Tickets')
                .setColor(COLORS.INFO)
                .setDescription(`**Desde el inicio de los registros**\n📂 **Total de Tickets Creados:** \`${stats.total}\`\n🔴 **Total de Tickets Cerrados:** \`${stats.closed}\``)
                .addFields(
                    { 
                        name: '🟢 Tickets Activos (Ahora mismo)', 
                        value: `> **Abiertos:** \`${stats.currentOpen}\`\n> **✋ En atención:** \`${stats.currentClaimed}\`\n> **🔓 Esperando:** \`${stats.currentUnclaimed}\``, 
                        inline: false 
                    },
                    { 
                        name: '📉 Histórico de Atención', 
                        value: `> **🙋 Alguna vez atendidos:** \`${stats.historicClaimed}\`\n> **👻 Nunca atendidos:** \`${stats.historicUnclaimed}\``, 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Tacoland Network | Sistema de Soporte' })
                .setTimestamp();

             return interaction.reply({ embeds: [embed] });
        }
        if (subcommand === 'staff-stats') {
             // Logic from staffstats.js
             if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return replyError(interaction, 'Permiso denegado.', true);
             
             const targetUser = options.getUser('usuario');
             const days = options.getInteger('dias');
             // Si se especifica un usuario distinto al propio, o si no se especifica usuario (Leaderboard global)
             // se requiere permiso de admin.
             // Excepción: Consultar tus propias estadísticas explícitamente es permitido.
             const isSelfQuery = targetUser && targetUser.id === interaction.user.id;
             const member = await guild.members.fetch(user.id);
             const isAdmin = (config.admin_role_id && member.roles.cache.has(config.admin_role_id)) || member.permissions.has(PermissionFlagsBits.Administrator);

             if (!targetUser && !isAdmin) {
                 return replyError(interaction, 'Ver el ranking global del staff requiere permisos de administrador.', true);
             }

             if (targetUser && !isSelfQuery && !isAdmin) {
                return replyError(interaction, 'Ver estadísticas de otros miembros del staff requiere permisos de administrador.', true);
             }

             // Caso 1: Usuario específico
             if (targetUser) {
                const stats = getStaffStats(guild.id, targetUser.id, days);
                const avgRating = stats.ratingAvg ? parseFloat(stats.ratingAvg).toFixed(1) : 'N/A';
                
                const embed = new EmbedBuilder()
                    .setTitle(`📊 Estadísticas de Staff: ${targetUser.username}`)
                    .setColor(COLORS.INFO)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: 'Tickets Reclamados', value: String(stats.claimed), inline: true },
                        { name: 'Tickets Cerrados', value: String(stats.closed), inline: true },
                        { name: 'Valoración Media', value: `${avgRating} ⭐ (${stats.ratingCount} votos)`, inline: true },
                        { name: 'Periodo', value: days ? `Últimos ${days} días` : 'Histórico completo', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Tacoland Network' });

                return interaction.reply({ embeds: [embed] });
             } else {
                // Caso 2: Todos los miembros del staff (Leaderboard)

                const allStats = getAllStaffStats(guild.id, days); // Devuelve array ordenado por claimed desc

                if (allStats.length === 0) {
                    return interaction.reply({ content: 'No hay datos de actividad del staff en el periodo seleccionado.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🏆 Ranking de Actividad del Staff`)
                    .setDescription(days ? `Actividad en los últimos ${days} días` : 'Histórico completo de actividad')
                    .setColor(COLORS.INFO)
                    .setTimestamp();

                // Top 10
                const top10 = allStats.slice(0, 10);
                let description = '';

                for (let i = 0; i < top10.length; i++) {
                    const stat = top10[i];
                    const position = i + 1;
                    let medal = '';
                    if (position === 1) medal = '🥇 ';
                    else if (position === 2) medal = '🥈 ';
                    else if (position === 3) medal = '🥉 ';
                    else medal = `#${position} `;

                    const avg = stat.ratingAvg ? parseFloat(stat.ratingAvg).toFixed(1) : '-';
                    
                    description += `**${medal}<@${stat.staffId}>**\n`;
                    description += `> 📨 Reclamados: \`${stat.claimed}\` | 🔒 Cerrados: \`${stat.closed}\`\n`;
                    description += `> ⭐ Valoración: \`${avg}\` (${stat.ratingCount} votos)\n\n`;
                }
                
                embed.setDescription(description || 'No hay datos.')
                    .setFooter({ text: 'Tacoland Network' });
                
                return interaction.reply({ embeds: [embed] });
             }
        }
        if (subcommand === 'ratings') {
             if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return replyError(interaction, 'Permiso denegado.', true);
             
             const limit = options.getInteger('limite') || 10;
             const specifiedUser = options.getUser('usuario');
             const targetUser = specifiedUser || interaction.user;
             
             // Verificar permisos si intenta ver ratings de OTRO usuario
             if (specifiedUser && specifiedUser.id !== interaction.user.id) {
                const member = await guild.members.fetch(user.id);
                const isAdmin = (config.admin_role_id && member.roles.cache.has(config.admin_role_id)) || member.permissions.has(PermissionFlagsBits.Administrator);

                if (!isAdmin) {
                    return replyError(interaction, 'Ver valoraciones de otros miembros del staff requiere permisos de administrador.', true);
                }
             }

             // Pasamos targetUser.id como tercer argumento para filtrar por staff específico
             const ratings = getLatestRatings(guild.id, limit, targetUser.id);

             if (!ratings || ratings.length === 0) {
                return interaction.reply({ content: `No hay valoraciones registradas para ${targetUser.username} aún.`, ephemeral: true });
             }

             const embed = new EmbedBuilder()
                .setTitle(`🌟 Últimas Valoraciones de ${targetUser.username}`)
                .setColor('#FFD700') // Gold color
                .setThumbnail(targetUser.displayAvatarURL())
                .setDescription(`Mostrando las últimas ${ratings.length} valoraciones.`)
                .setTimestamp();

             const fields = [];

             for (const ticket of ratings) {
                // Fetch user logic omitted for speed, displaying ID if username not cached or just simplified
                // We can fetch or just display "Usuario"
                
                const stars = '⭐'.repeat(ticket.rating);
                // closed_at might be string or Date object depending on DB driver. SQLite returns string.
                const timestamp = ticket.closed_at.endsWith('Z') ? ticket.closed_at : ticket.closed_at + 'Z';
                const date = new Date(timestamp).toLocaleDateString();
                
                let value = `**Fecha:** ${date}`;
                if (ticket.rating_comment) {
                    value += `\n**Comentario:** *${ticket.rating_comment}*`;
                }
                // Add userId for context
                value += `\n**Usuario ID:** ${ticket.user_id}`;

                fields.push({
                    name: `${stars} (Ticket #${ticket.ticket_id || ticket.id})`,
                    value: value,
                    inline: false
                });
             }

             embed.addFields(fields);
             embed.setFooter({ text: 'Tacoland Network' });
            
             return interaction.reply({ embeds: [embed] });
        }

        // 4. ADMIN
        if (subcommand === 'delete-history') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return replyError(interaction, 'Permiso denegado.', true);
            const confirmEmbed = new EmbedBuilder().setTitle('⚠️ BORRAR HISTORIAL').setDescription('Escribe `CONFIRMAR` para borrar todo el historial.').setColor(COLORS.DANGER);
            await interaction.reply({ embeds: [confirmEmbed], fetchReply: true });
            const collector = channel.createMessageCollector({ filter: m => m.author.id === user.id, time: 10000, max: 1 });
            collector.on('collect', async m => {
                if (m.content === 'CONFIRMAR') {
                    deleteTicketHistory(guild.id);
                    replySuccess(interaction, 'Historial borrado.', true);
                }
            });
            return;
        }

        // 5. CONFIG GROUP
        if (subcommandGroup === 'config') {
            if (!await requireLevel(interaction, config, 'op')) return;
            
            if (subcommand === 'ver') {
                const conf = getGuildConfig(guild.id);
                const departments = getDepartments(guild.id);

                const deptList = departments.length > 0
                    ? departments.map((d) => {
                        const emoji = d.emoji || '📂';
                        return `${emoji} **${d.name}** (ID: ${d.id})`;
                    }).join('\n')
                    : '*No hay departamentos configurados*';

                const embed = simpleEmbed(
                    '⚙️ Configuración Actual', 
                    'Aquí tienes el resumen de la configuración del sistema de tickets:', 
                    '#3b82f6'
                );
                
                embed.addFields(
                    { name: 'Rol Staff', value: conf.staff_role_id ? `<@&${conf.staff_role_id}>` : '*No configurado*', inline: true },
                    { name: 'Rol Admin', value: conf.admin_role_id ? `<@&${conf.admin_role_id}>` : '*No configurado*', inline: true },
                    { name: 'Canal de Logs', value: conf.log_channel_id ? `<#${conf.log_channel_id}>` : '*No configurado*', inline: true },
                    { name: 'Canal Transcripciones', value: conf.transcript_channel_id ? `<#${conf.transcript_channel_id}>` : '*No configurado*', inline: true },
                    { name: 'Categoría Tickets', value: conf.ticket_category_id ? `<#${conf.ticket_category_id}>` : '*No configurada*', inline: true },
                    { name: 'Tickets Máx/Usuario', value: String(conf.max_tickets_per_user ?? 1), inline: true },
                    { name: 'Tickets Creados globalmente', value: String(conf.ticket_counter ?? 0), inline: true },
                    { name: 'Modo Contador', value: conf.ticket_counter_mode === 'global' ? '🌍 Global' : '📂 Por categoría', inline: true },
                    { name: 'Departamentos', value: deptList, inline: false },
                );

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            if (subcommand === 'roles') {
                const s = options.getRole('staff'); const a = options.getRole('admin');
                if(s) updateGuildConfig(guild.id, 'staff_role_id', s.id);
                if(a) updateGuildConfig(guild.id, 'admin_role_id', a.id);
                return replySuccess(interaction, 'Roles actualizados.', true);
            }
            if (subcommand === 'logs') {
                updateGuildConfig(guild.id, 'log_channel_id', options.getChannel('canal').id);
                return replySuccess(interaction, 'Canal logs actualizado.', true);
            }
            if (subcommand === 'transcripciones') {
                updateGuildConfig(guild.id, 'transcript_channel_id', options.getChannel('canal').id);
                return replySuccess(interaction, 'Canal transcripciones actualizado.', true);
            }
            if (subcommand === 'categoria') {
                updateGuildConfig(guild.id, 'ticket_category_id', options.getChannel('categoria').id);
                return replySuccess(interaction, 'Categoría tickets actualizada.', true);
            }
            if (subcommand === 'mensaje') {
                setTicketMessage(guild.id, options.getString('tipo'), { 
                    title: options.getString('titulo'), 
                    description: options.getString('descripcion'), 
                    color: options.getString('color'), 
                    footer: options.getString('footer') 
                });
                if(options.getString('tipo')==='panel') updateLivePanel(client, guild.id);
                return replySuccess(interaction, 'Mensaje actualizado.', true);
            }
            if (subcommand === 'dept-add') {
                addDepartment(guild.id, options.getString('nombre'), options.getString('emoji'), options.getString('descripcion'));
                updateLivePanel(client, guild.id);
                return replySuccess(interaction, 'Departamento añadido.', true);
            }
            if (subcommand === 'dept-del') {
                removeDepartment(options.getInteger('id'), guild.id);
                updateLivePanel(client, guild.id);
                return replySuccess(interaction, 'Departamento eliminado.', true);
            }
            if (subcommand === 'contador') {
                const modo = options.getString('modo');
                updateGuildConfig(guild.id, 'ticket_counter_mode', modo);
                const modeLabel = modo === 'global' ? 'Global (un único contador compartido)' : 'Por categoría (contador independiente por departamento)';
                return replySuccess(interaction, `Modo de contador actualizado a **${modeLabel}**.`, true);
            }
            if (subcommand === 'max-tickets') {
                const limite = options.getInteger('limite');
                updateGuildConfig(guild.id, 'max_tickets_per_user', limite);
                return replySuccess(interaction, `Máximo de tickets por usuario actualizado a **${limite}**.`, true);
            }
            
            // PREGUNTAS (Flattened logic)
            if (subcommand.startsWith('preguntas-')) {
                const action = subcommand.split('-')[1]; // add, edit, del, list
                const deptId = options.getInteger('departamento');
                const dept = getDepartments(guild.id).find(d => d.id === deptId);
                if(!dept) return replyError(interaction, 'Departamento no encontrado.', true);

                let questions = [];
                try { if(dept.form_json) questions = JSON.parse(dept.form_json); } catch(e){}
                if (!Array.isArray(questions)) questions = questions.length ? [questions] : [];

                if(action === 'list') {
                    if(!questions.length) return replyInfo(interaction, 'Preguntas', 'No hay preguntas.', true);
                    return replyInfo(interaction, `Preguntas de ${dept.name}`, questions.map((q,i) => `${i+1}. ${q.label}`).join('\n'), true);
                }
                
                if(action === 'add') {
                    const modal = new ModalBuilder().setCustomId(`config_question_add_${deptId}`).setTitle('Añadir Pregunta');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('question_label').setLabel('Pregunta').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('question_placeholder').setLabel('Placeholder').setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('question_style').setLabel('Tipo (corto/largo)').setStyle(TextInputStyle.Short).setRequired(true))
                    );
                    return interaction.showModal(modal);
                }
                
                if(action === 'edit') {
                    const qId = options.getString('pregunta_id');
                    const q = questions.find(x => x.id === qId);
                    if(!q) return replyError(interaction, 'Pregunta no encontrada.', true);
                    
                    const modal = new ModalBuilder().setCustomId(`config_question_edit_${deptId}_${qId}`).setTitle('Editar Pregunta');
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('question_label').setLabel('Pregunta').setValue(q.label).setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('question_placeholder').setLabel('Placeholder').setValue(q.placeholder||'').setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('question_style').setLabel('Tipo').setValue(q.style===2?'largo':'corto').setStyle(TextInputStyle.Short).setRequired(true))
                    );
                    return interaction.showModal(modal);
                }

                if(action === 'del') {
                    const qId = options.getString('pregunta_id');
                    const newQs = questions.filter(x => x.id !== qId);
                    updateDepartmentForm(deptId, guild.id, JSON.stringify(newQs));
                    return replySuccess(interaction, 'Pregunta eliminada.', true);
                }
            }
        }
    }
};
