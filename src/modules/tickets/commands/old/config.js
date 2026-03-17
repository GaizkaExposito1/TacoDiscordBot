const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const {
    getGuildConfig,
    updateGuildConfig,
    setTicketMessage,
    addDepartment,
    removeDepartment,
    updateDepartmentForm,
    getDepartments,
    getPanelReference,
} = require('../../../database/database');
const { replyError, replySuccess, replyInfo, replyWarning } = require('../../../utils/responses');
const { buildEmbed, simpleEmbed } = require('../../../utils/embeds');
const { logAudit } = require('../../../utils/audit');
const { AUDIT_ACTIONS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');    


/**
 * Actualiza el embed del panel en vivo (si existe).
 */
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
        .setName('config')
        .setDescription('Configura los ajustes del bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ─── Subcomando: roles ───
        .addSubcommand(sub => sub
            .setName('roles')
            .setDescription('Configura los roles de staff y admin.')
            .addRoleOption(opt => opt.setName('staff').setDescription('Rol del equipo de soporte').setRequired(false))
            .addRoleOption(opt => opt.setName('admin').setDescription('Rol de administrador').setRequired(false))
        )

        // ─── Subcomando: canal de logs ───
        .addSubcommand(sub => sub
            .setName('logs')
            .setDescription('Configura el canal de logs de auditoría.')
            .addChannelOption(opt => opt
                .setName('canal')
                .setDescription('Canal donde se enviarán los logs')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        )
        
        // ─── Subcomando: canal de transcripciones ───
        .addSubcommand(sub => sub
            .setName('transcripciones')
            .setDescription('Configura el canal para guardar transcripciones HTML.')
            .addChannelOption(opt => opt
                .setName('canal')
                .setDescription('Canal donde se enviarán las transcripciones')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        )

        // ─── Subcomando: categoría de tickets ───
        .addSubcommand(sub => sub
            .setName('categoria')
            .setDescription('Configura la categoría donde se crean los tickets.')
            .addChannelOption(opt => opt
                .setName('categoria')
                .setDescription('Categoría para los canales de tickets')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true))
        )

        // ─── Subcomando: mensajes personalizados ───
        .addSubcommand(sub => sub
            .setName('mensaje')
            .setDescription('Personaliza los mensajes de los tickets.')
            .addStringOption(opt => opt
                .setName('tipo')
                .setDescription('Tipo de mensaje a personalizar')
                .setRequired(true)
                .addChoices(
                    { name: 'Panel de Tickets', value: 'panel' },
                    { name: 'Bienvenida del Ticket', value: 'ticket_welcome' },
                    { name: 'Ticket Cerrado', value: 'ticket_close' },
                    { name: 'Ticket Reclamado', value: 'ticket_claimed' },
                ))
            .addStringOption(opt => opt.setName('titulo').setDescription('Título del embed').setRequired(false))
            .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del embed (soporta placeholders)').setRequired(false))
            .addStringOption(opt => opt.setName('color').setDescription('Color hex (ej: #FF5733)').setRequired(false))
            .addStringOption(opt => opt.setName('footer').setDescription('Texto del footer').setRequired(false))
        )

        // ─── Subcomando: añadir departamento ───
        .addSubcommand(sub => sub
            .setName('departamento-añadir')
            .setDescription('Añade un departamento de tickets.')
            .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del departamento').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Emoji del departamento').setRequired(false))
            .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del departamento').setRequired(false))
        )

        // ─── Subcomando: eliminar departamento ───
        .addSubcommand(sub => sub
            .setName('departamento-eliminar')
            .setDescription('Elimina un departamento de tickets.')
            .addIntegerOption(opt => opt.setName('id').setDescription('ID del departamento a eliminar').setRequired(true))
        )

        // ─── Subcomando: preguntas (Grupo) ───
        .addSubcommandGroup(group => group
            .setName('preguntas')
            .setDescription('Gestiona las preguntas del formulario de tickets.')
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('Añade una nueva pregunta a un departamento via Modal.')
                .addIntegerOption(opt => opt
                    .setName('departamento')
                    .setDescription('El departamento al que añadir la pregunta')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('edit')
                .setDescription('Edita una pregunta existente.')
                .addIntegerOption(opt => opt
                    .setName('departamento')
                    .setDescription('El departamento')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(opt => opt
                    .setName('pregunta_id')
                    .setDescription('ID de la pregunta a editar')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(opt => opt.setName('nuevo_texto').setDescription('Nuevo texto de la pregunta').setRequired(false))
                .addStringOption(opt => opt.setName('nuevo_placeholder').setDescription('Nuevo placeholder').setRequired(false))
                .addBooleanOption(opt => opt.setName('multilinea').setDescription('Si es verdadero, permite escribir varias líneas.').setRequired(false))
            )
            .addSubcommand(sub => sub
                .setName('delete')
                .setDescription('Elimina una pregunta de un departamento.')
                .addIntegerOption(opt => opt
                    .setName('departamento')
                    .setDescription('El departamento')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
                .addStringOption(opt => opt
                    .setName('pregunta_id')
                    .setDescription('ID de la pregunta a eliminar')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('list')
                .setDescription('Lista las preguntas configuradas para un departamento.')
                .addIntegerOption(opt => opt
                    .setName('departamento')
                    .setDescription('El departamento')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
        )

        // ─── Subcomando: ver configuración ───
        .addSubcommand(sub => sub
            .setName('ver')
            .setDescription('Muestra la configuración actual del bot.')
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
            
            await interaction.respond(
                filtered.slice(0, 25).map(dept => ({ name: `${dept.emoji || '📂'} ${dept.name}`, value: dept.id }))
            );
        }

        if (focusedOption.name === 'pregunta_id') {
            // Nota: Para que esto funcione, el usuario debe haber seleccionado primero el departamento.
            const departmentId = interaction.options.getInteger('departamento');
            
            // Si no se ha seleccionado departamento, devolvemos una opción informativa o nada
            if (!departmentId) {
                return await interaction.respond([{ name: '⚠️ Primero selecciona un departamento', value: 'error_no_dept' }]);
            }

            const departments = getDepartments(guildId);
            const dept = departments.find(d => d.id === departmentId);
            
            if (!dept || !dept.form_json) {
                return await interaction.respond([{ name: 'ℹ️ Este departamento no tiene preguntas', value: 'error_no_questions' }]);
            }

            let questions = [];
            try {
                const parsed = JSON.parse(dept.form_json);
                if (Array.isArray(parsed)) {
                    questions = parsed;
                } else if (typeof parsed === 'object') {
                    // Legacy object support
                    questions = [{ id: 'legacy_question', label: parsed.label }];
                }
            } catch (e) {
                return await interaction.respond([]);
            }

            const value = focusedOption.value.toLowerCase();
            const filtered = questions.filter(q => 
                (q.label && q.label.toLowerCase().includes(value)) ||
                (q.id && q.id.toLowerCase().includes(value))
            );

            await interaction.respond(
                filtered.slice(0, 25).map(q => ({ 
                    name: (q.label || 'Pregunta sin texto').substring(0, 100), 
                    value: q.id || 'legacy_question' 
                }))
            );
        }
    },

    async execute(interaction) {
        const { guild, user, client } = interaction;
        const subcommandGroup = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (subcommandGroup === 'preguntas') {
            const departmentId = interaction.options.getInteger('departamento');
            const departments = getDepartments(guild.id);
            const dept = departments.find(d => d.id === departmentId);

            if (!dept) {
                return replyError(interaction, 'Departamento no encontrado.', true);
            }

            let questions = [];
            try {
                if (dept.form_json) {
                    const parsed = JSON.parse(dept.form_json);
                    questions = Array.isArray(parsed) ? parsed : [parsed];
                    // Ensure IDs
                    questions = questions.map((q, idx) => ({ ...q, id: q.id || `q_${Date.now()}_${idx}` }));
                }
            } catch(e) { /* ignore */ }

            if (subcommand === 'list') {
                if (questions.length === 0) {
                    return replyInfo(interaction, 'ℹ️ Sin Preguntas', `El departamento **${dept.name}** no tiene preguntas configuradas.`, true);
                }
                const description = questions.map((q, i) => 
                    `**${i + 1}.** ${q.label}\n> *ID: ${q.id} | ${q.style === 2 ? 'Párrafo' : 'Corto'} | ${q.required !== false ? 'Obligatorio' : 'Opcional'}*`
                ).join('\n\n');

                return replyInfo(interaction, `📋 Preguntas de ${dept.name}`, description, true);
            }

            if (subcommand === 'add') {
                // MODAL para añadir pregunta
                const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                
                const modal = new ModalBuilder()
                    .setCustomId(`config_question_add_${dept.id}`)
                    .setTitle(`Añadir Pregunta a ${dept.name.substring(0, 15)}`);

                const labelInput = new TextInputBuilder()
                    .setCustomId('question_label')
                    .setLabel('¿Qué quieres preguntar?')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(45)
                    .setRequired(true);
                
                const placeholderInput = new TextInputBuilder()
                    .setCustomId('question_placeholder')
                    .setLabel('Placeholder (ejemplo de respuesta)')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(100)
                    .setRequired(false);

                const styleInput = new TextInputBuilder() // Simulamos select con texto
                    .setCustomId('question_style')
                    .setLabel('Tipo (corto/largo)')
                    .setPlaceholder('Escribe "corto" o "largo"')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(labelInput), 
                    new ActionRowBuilder().addComponents(placeholderInput),
                    new ActionRowBuilder().addComponents(styleInput)
                );

                await interaction.showModal(modal);
                return; // Termina aquí, el modal handler hará el resto
            }

            if (subcommand === 'edit') {
                 // MODAL para editar pregunta
                 const qId = interaction.options.getString('pregunta_id');
                 const question = questions.find(q => q.id === qId);
                 
                 if (!question) {
                     return replyError(interaction, 'Pregunta no encontrada.', true);
                 }

                 const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                
                 const modal = new ModalBuilder()
                     .setCustomId(`config_question_edit_${dept.id}_${qId}`)
                     .setTitle(`Editar Pregunta`);
 
                 const labelInput = new TextInputBuilder()
                     .setCustomId('question_label')
                     .setLabel('Pregunta')
                     .setValue(question.label)
                     .setStyle(TextInputStyle.Short)
                     .setRequired(true);
                 
                 const placeholderInput = new TextInputBuilder()
                     .setCustomId('question_placeholder')
                     .setLabel('Placeholder')
                     .setValue(question.placeholder || '')
                     .setStyle(TextInputStyle.Short)
                     .setRequired(false);
 
                 const styleInput = new TextInputBuilder()
                     .setCustomId('question_style')
                     .setLabel('Tipo (corto/largo)')
                     .setValue(question.style === 2 ? 'largo' : 'corto')
                     .setStyle(TextInputStyle.Short)
                     .setRequired(true);
 
                 modal.addComponents(
                     new ActionRowBuilder().addComponents(labelInput), 
                     new ActionRowBuilder().addComponents(placeholderInput),
                     new ActionRowBuilder().addComponents(styleInput)
                 );
 
                 await interaction.showModal(modal);
                 return;
            }

            if (subcommand === 'delete') {
                const qId = interaction.options.getString('pregunta_id');
                const newConfig = questions.filter(q => q.id !== qId);
                
                if (newConfig.length === questions.length) {
                    return replyError(interaction, 'Pregunta no encontrada.', true);
                }

                updateDepartmentForm(dept.id, guild.id, JSON.stringify(newConfig));
                
                await replySuccess(interaction, `La pregunta ha sido eliminada del departamento **${dept.name}**.`, true);
                return;
            }
        }
        
        switch (subcommand) {
            case 'roles': {
                const staffRole = interaction.options.getRole('staff');
                const adminRole = interaction.options.getRole('admin');
                const changes = [];

                if (staffRole) {
                    updateGuildConfig(guild.id, 'staff_role_id', staffRole.id);
                    changes.push(`**Staff:** ${staffRole}`);
                }
                if (adminRole) {
                    updateGuildConfig(guild.id, 'admin_role_id', adminRole.id);
                    changes.push(`**Admin:** ${adminRole}`);
                }

                if (changes.length === 0) {
                    return replyError(interaction, 'Debes especificar al menos un rol.', true);
                }

                await replySuccess(interaction, changes.join('\n'), true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.CONFIG_UPDATE, user.id, null, `Roles actualizados: ${changes.join(', ')}`);
                break;
            }

            case 'logs': {
                const canal = interaction.options.getChannel('canal');
                updateGuildConfig(guild.id, 'log_channel_id', canal.id);

                await replySuccess(interaction, `Los logs se enviarán a ${canal}.`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.CONFIG_UPDATE, user.id, null, `Canal de logs: #${canal.name}`);
                break;
            }

            case 'transcripciones': {
                const canal = interaction.options.getChannel('canal');
                updateGuildConfig(guild.id, 'transcript_channel_id', canal.id);

                await replySuccess(interaction, `Las transcripciones HTML se guardarán en ${canal}.`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.CONFIG_UPDATE, user.id, null, `Canal de transcripciones: #${canal.name}`);
                break;
            }

            case 'categoria': {
                const categoria = interaction.options.getChannel('categoria');
                updateGuildConfig(guild.id, 'ticket_category_id', categoria.id);

                await replySuccess(interaction, `Los tickets se crearán en la categoría **${categoria.name}**.`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.CONFIG_UPDATE, user.id, null, `Categoría de tickets: ${categoria.name}`);
                break;
            }

            case 'mensaje': {
                const tipo = interaction.options.getString('tipo');
                const titulo = interaction.options.getString('titulo');
                const descripcion = interaction.options.getString('descripcion');
                const color = interaction.options.getString('color');
                const footer = interaction.options.getString('footer');

                if (!titulo && !descripcion && !color && !footer) {
                    return replyWarning(interaction, 'Debes especificar al menos un campo para actualizar.', true);
                }

                // Validar color hex
                if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
                    return replyError(interaction, 'El color debe ser un código hex válido (ej: `#FF5733`).', true);
                }

                setTicketMessage(guild.id, tipo, { title: titulo, description: descripcion, color, footer });

                // Si es el panel, actualizar el embed en vivo
                if (tipo === 'panel') {
                    await updateLivePanel(client, guild.id);
                }

                const placeholdersInfo = tipo.includes('ticket')
                    ? '\n\n**Placeholders disponibles:**\n`{user}` `{ticket_id}` `{department}` `{subject}` `{staff}` `{closer}` `{server}` `{date}` `{time}`'
                    : '';

                const liveNote = tipo === 'panel' ? '\n✏️ El panel ha sido actualizado en vivo.' : '';

                await replySuccess(interaction, `El mensaje de tipo **${tipo}** ha sido actualizado correctamente.${liveNote}${placeholdersInfo}`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.CONFIG_UPDATE, user.id, null, `Mensaje '${tipo}' personalizado`);
                break;
            }

            case 'departamento-añadir': {
                const nombre = interaction.options.getString('nombre');
                const emoji = interaction.options.getString('emoji') ?? '📩';
                const descripcion = interaction.options.getString('descripcion') ?? 'Sin descripción';

                const dept = addDepartment(guild.id, nombre, emoji, descripcion);

                // Actualizar panel en vivo
                await updateLivePanel(client, guild.id);

                await replySuccess(interaction, `**${emoji} ${nombre}** (ID: ${dept.id})\n${descripcion}\n✏️ El panel ha sido actualizado automáticamente.`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.DEPARTMENT_ADD, user.id, null, `Departamento: ${nombre}`);
                break;
            }

            case 'departamento-eliminar': {
                const id = interaction.options.getInteger('id');
                removeDepartment(id, guild.id);

                // Actualizar panel en vivo
                await updateLivePanel(client, guild.id);

                await replySuccess(interaction, `El departamento con ID **${id}** ha sido eliminado.\n✏️ El panel ha sido actualizado automáticamente.`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.DEPARTMENT_REMOVE, user.id, null, `Departamento ID: ${id}`);
                break;
            }

            case 'departamento-formulario': {
                const id = interaction.options.getInteger('id');
                const pregunta = interaction.options.getString('pregunta');
                const placeholder = interaction.options.getString('placeholder') ?? '';
                const multilinea = interaction.options.getBoolean('multilinea') ?? true;

                // Construir config simple (se podría expandir a array de preguntas en el futuro)
                const formConfig = {
                    label: pregunta,
                    placeholder: placeholder,
                    style: multilinea ? 2 : 1 // 1: Short, 2: Paragraph
                };

                // Verificar si existe el departamento
                const depts = getDepartments(guild.id);
                const targetDept = depts.find(d => d.id === id);

                if (!targetDept) {
                    return replyError(interaction, 'No existe un departamento con ese ID.', true);
                }

                updateDepartmentForm(id, guild.id, JSON.stringify(formConfig));

                await replySuccess(interaction, `El departamento **${targetDept.name}** ahora preguntará:\n**"${pregunta}"**`, true);

                await logAudit(client, guild.id, AUDIT_ACTIONS.CONFIG_UPDATE, user.id, null, `Formulario Dep. ${id}: ${pregunta}`);
                break;
            }

            case 'ver': {
                const config = getGuildConfig(guild.id);
                // Si la función devuelve un objeto con getter vacío o nulo
                
                const departments = getDepartments(guild.id);


                const deptList = departments.length > 0
                    ? departments.map((d) => {
                        const emoji = d.emoji || '📂'; // Fallback por si acaso
                        return `${emoji} **${d.name}** (ID: ${d.id})`;
                    }).join('\n')
                    : '*No hay departamentos configurados*';

                // Añadimos una descripción válida para evitar el error de length
                const embed = simpleEmbed(
                    '⚙️ Configuración Actual', 
                    'Aquí tienes el resumen de la configuración del sistema de tickets:', 
                    '#3b82f6'
                );
                
                embed.addFields(
                    { name: 'Rol Staff', value: config.staff_role_id ? `<@&${config.staff_role_id}>` : '*No configurado*', inline: true },
                    { name: 'Rol Admin', value: config.admin_role_id ? `<@&${config.admin_role_id}>` : '*No configurado*', inline: true },
                    { name: 'Canal de Logs', value: config.log_channel_id ? `<#${config.log_channel_id}>` : '*No configurado*', inline: true },
                    { name: 'Canal Transcripciones', value: config.transcript_channel_id ? `<#${config.transcript_channel_id}>` : '*No configurado*', inline: true },
                    { name: 'Categoría Tickets', value: config.ticket_category_id ? `<#${config.ticket_category_id}>` : '*No configurada*', inline: true },
                    { name: 'Tickets Máx/Usuario', value: String(config.max_tickets_per_user ?? 1), inline: true },
                    { name: 'Tickets Creados globalmente', value: String(config.ticket_counter ?? 0), inline: true },
                    { name: 'Departamentos', value: deptList, inline: false },
                );

                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            }
        }
    },
};
