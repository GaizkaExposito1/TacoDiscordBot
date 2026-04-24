const {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require('discord.js');
const {
    getGuildConfig,
    getDepartments,
    getOpenTicketsByUser,
    createTicket,
    claimTicket,
    unclaimTicket,
    closeTicket: closeTicketDB,
    getTicketByChannel,
    getTicketById,
    setCloseAuditLogId,
    setTranscriptUrl,
    getDatabase,
    saveDatabaseSync,
    incrementDepartmentTicketCount,
    decrementDepartmentTicketCount,
    incrementTicketCounter,
    updateTicketRating,
    cacheUser,
    getTicketMessage,
} = require('../../../database/database');
const { buildEmbed, simpleEmbed } = require('../../../utils/embeds');
const { replyError, replyWarning, replySuccess, replyInfo } = require('../../../utils/responses');
const { logAudit } = require('../../../utils/audit');
const { generateTranscript } = require('../../../utils/transcript');
const { COLORS, AUDIT_ACTIONS } = require('../../../utils/constants');
const logger = require('../../../utils/logger');

/**
 * Reemplaza variables como {staff} o {user} en un texto.
 */
function applyVars(text, vars) {
    if (!text) return text;
    return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), text);
}

/**
 * Devuelve un EmbedBuilder usando el embed configurado en la BD para `key`,
 * con fallback a los parámetros por defecto.
 * @param {string} guildId
 * @param {string} key          - clave en ticket_messages (ej: 'ticket_claim')
 * @param {Object} vars         - variables a sustituir, ej: { staff: '<@123>' }
 * @param {string} defaultTitle
 * @param {string} defaultDescription
 * @param {string} defaultColor - color hex o COLORS.*
 */
function resolveDbEmbed(guildId, key, vars, defaultTitle, defaultDescription, defaultColor) {
    const stored = getTicketMessage(guildId, key);
    const title  = applyVars(stored?.title  || defaultTitle,       vars);
    const desc   = applyVars(stored?.description || defaultDescription, vars);
    const color  = stored?.color || defaultColor;
    const footer = stored?.footer || 'Tacoland Network';
    return simpleEmbed(title, desc, color).setFooter({ text: footer });
}

/**
 * Crea un ticket (canal privado) para el usuario.
 */
async function openTicket(interaction, departmentId, departmentName, answers) {
    const { guild, user, client } = interaction;
    const config = getGuildConfig(guild.id);

    // Compatibilidad si 'answers' llega como string (legacy)
    let finalAnswers = [];
    let mainSubject = 'Sin asunto';

    if (typeof answers === 'string') {
        mainSubject = answers;
        finalAnswers = [{ question: 'Asunto', answer: answers }];
    } else if (Array.isArray(answers) && answers.length > 0) {
        mainSubject = answers[0].answer; // Usar la primera respuesta como asunto principal
        finalAnswers = answers;
    }

    // Recortar subject para DB
    if (mainSubject.length > 255) mainSubject = mainSubject.substring(0, 252) + '...';

    // ─── Verificar límite de tickets ───
    const openTickets = getOpenTicketsByUser(guild.id, user.id);
    const maxTickets = config.max_tickets_per_user ?? 1;

    if (openTickets.length >= maxTickets) {
        return replyWarning(interaction, `Ya tienes **${openTickets.length}** ticket(s) abierto(s). El máximo es **${maxTickets}**.\nCierra tu ticket actual antes de abrir uno nuevo.`, true);
    }

    // ─── Verificar categoría configurada ───
    if (!config.ticket_category_id) {
        return replyError(interaction, 'No se ha configurado la categoría de tickets. Un administrador debe usar `/config tickets`.', true);
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // ─── Obtener Contador (global o por departamento) ───
        const counterMode = config.ticket_counter_mode ?? 'category';
        let ticketNumber;
        let preAssignedNumber = null;
        if (counterMode === 'global') {
            const globalCount = incrementTicketCounter(guild.id);
            preAssignedNumber = globalCount; // se pasa a createTicket para evitar doble incremento
            ticketNumber = String(globalCount).padStart(5, '0');
        } else {
            const deptStats = incrementDepartmentTicketCount(departmentId, guild.id);
            ticketNumber = String(deptStats.ticket_count).padStart(5, '0');
        }
        
        // Limpiar nombre del departamento para usarlo en el canal (quitar espacios y caracteres raros)
        const safeDeptName = departmentName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
        const channelName = `🟢〕${safeDeptName}-${ticketNumber}`;

        const permissionOverwrites = [
            // Denegar a @everyone
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            // Permitir al usuario
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
            // Permitir al bot
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
        ];

        // Permitir al staff role si existe
        if (config.staff_role_id) {
            permissionOverwrites.push({
                id: config.staff_role_id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
            });
        }

        // Permitir al admin role si existe
        if (config.admin_role_id) {
            permissionOverwrites.push({
                id: config.admin_role_id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.AttachFiles],
            });
        }

        // Permitir al rol silenciado hablar en su ticket aunque tenga SendMessages denegado globalmente
        if (config.silenciado_role_id) {
            permissionOverwrites.push({
                id: config.silenciado_role_id,
                allow: [PermissionFlagsBits.SendMessages],
            });
        }

        let channel;
        try {
            channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: config.ticket_category_id,
                topic: `Ticket #${ticketNumber} | Usuario: ${user.tag} | Departamento: ${departmentName}`,
                permissionOverwrites,
            });
        } catch (channelError) {
            if (counterMode !== 'global') {
                decrementDepartmentTicketCount(departmentId, guild.id);
            }
            throw channelError;
        }

        // ─── Registrar en DB ───
        // Nota: createTicket usa el contador global, pero visualmente usamos el del departamento.
        // No afecta la lógica interna, solo el nombre del canal.
        let ticket;
        try {
            ticket = createTicket(guild.id, channel.id, user.id, departmentId, mainSubject, preAssignedNumber);
        } catch (dbError) {
            // Rollback si falla la DB: borrar canal y decrementar
            decrementDepartmentTicketCount(departmentId, guild.id);
            if (channel) await channel.delete().catch(() => {});
            throw dbError;
        }

        // Cachear nombre del usuario para el panel web
        cacheUser(user.id, user.globalName ?? user.username, user.avatar ?? null);

        // ─── Embed de bienvenida ───
        const welcomeEmbed = buildEmbed(guild.id, 'ticket_welcome', {
            user: `<@${user.id}>`,
            userTag: user.tag,
            userId: user.id,
            ticketId: ticketNumber,
            department: departmentName,
            subject: mainSubject,
            server: guild.name,
        });

        // Añadir respuestas al embed
        finalAnswers.forEach(a => {
             // Limitar largo para no romper el embed
             const val = a.answer.length > 1000 ? a.answer.substring(0, 1000) + '...' : a.answer;
             welcomeEmbed.addFields({ name: `❓ ${a.question}`, value: val, inline: false });
        });

        // Añadir estado inicial al embed
        welcomeEmbed.addFields(
            { name: '✋ Reclamado por', value: 'Nadie (Sin asignar)', inline: true }
        );

        // Añadir mensaje final explicativo en los FIELDS
        welcomeEmbed.addFields({ 
            name: '\u200b', // Campo invisible para separador
            value: 'Un miembro del staff te atenderá pronto. Mientras tanto, describe tu problema con el mayor detalle posible.',
            inline: false 
        });

        // ─── Botones de acción ───
        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_claim')
                .setLabel('✋ Reclamar Ticket')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('🔒 Cerrar Ticket')
                .setStyle(ButtonStyle.Danger),
        );

        await channel.send({
            content: `<@${user.id}>${config.staff_role_id ? ` | <@&${config.staff_role_id}>` : ''}`,
            embeds: [welcomeEmbed],
            components: [actionRow],
        });

        // ─── Respuesta al usuario ───
        await replySuccess(interaction, `Tu ticket ha sido creado exitosamente en ${channel}.\n\n**Ticket:** #${ticketNumber}\n**Departamento:** ${departmentName}`, true);

        // ─── Log de auditoría ───
        await logAudit(
            client, guild.id,
            AUDIT_ACTIONS.TICKET_OPEN,
            user.id, null,
            `Ticket #${ticketNumber} abierto en ${departmentName} — Asunto: ${mainSubject}`
        );

    } catch (error) {
        logger.error('[Tickets] Error al crear ticket:', error);
        await replyError(interaction, 'No se pudo crear el ticket. Verifica que el bot tenga permisos suficientes y que la categoría exista.', true);
    }
}

/**
 * Reclama un ticket para un miembro del staff.
 */
async function handleClaimTicket(interaction) {
    const { guild, user, channel, client } = interaction;
    const config = getGuildConfig(guild.id);
    const ticket = getTicketByChannel(channel.id);

    if (!ticket) {
        return replyError(interaction, 'Este canal no es un ticket válido.', true);
    }

    // Verificar que es staff
    const member = await guild.members.fetch(user.id);
    const isStaff = (config.staff_role_id && member.roles.cache.has(config.staff_role_id))
        || (config.admin_role_id && member.roles.cache.has(config.admin_role_id))
        || member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isStaff) {
        return replyError(interaction, 'Solo el staff puede reclamar tickets.', true);
    }

    if (ticket.claimed_by) {
        return replyWarning(interaction, `Este ticket ya fue reclamado por <@${ticket.claimed_by}>.`, true);
    }

    // ─── Buscar mensaje inicial del ticket (Embed) ───
    let message = interaction.message;
    if (!message) {
        // Si no viene de un botón (ej: slash command), intentamos buscar el primer mensaje del bot en el canal
        const messages = await channel.messages.fetch({ limit: 10, after: '0' });
        message = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.components.length > 0);
    }

    if (!message) {
        return replyError(interaction, 'No se pudo encontrar el mensaje original del ticket para actualizarlo.', true);
    }

    // ─── Reclamar ───
    try {
        claimTicket(channel.id, user.id);
        cacheUser(user.id, user.globalName ?? user.username, user.avatar ?? null);
    } catch (error) {
        logger.error('[Ticket:Claim] DB Error:', error);
        return replyError(interaction, 'Error al guardar reclamación en base de datos.', true);
    }

    // Restringir acceso al ROL de Staff (Solo admin y el que reclama verán el canal)
    if (config.staff_role_id) {
        try {
            await channel.permissionOverwrites.edit(config.staff_role_id, {
                ViewChannel: false,
            });
        } catch {
            // Si falla, no es crítico
        }
    }

    // Asegurar que el claimer (usuario individual) pueda ver el canal
    await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        EmbedLinks: true,
    });

    // ─── Actualizar Embed Original ───
    const originalEmbed = EmbedBuilder.from(message.embeds[0]);
    // Buscamos el campo 'Reclamado por'
    const newFields = originalEmbed.data.fields?.map(field => {
        if (field.name.includes('Reclamado por')) {
            return { ...field, value: `<@${user.id}>` };
        }
        return field;
    }) || [];
    
    // Si no existía, lo añadimos
    if (!newFields.find(f => f.name.includes('Reclamado por'))) {
        newFields.push({ name: '✋ Reclamado por', value: `<@${user.id}>`, inline: true });
    }
    
    originalEmbed.setFields(newFields);
    originalEmbed.setColor(COLORS.WARNING); // Cambiar color a "En Progreso"

    // Actualizar botones
    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_unclaim')
            .setLabel('🔓 Liberar Ticket')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('🔒 Cerrar Ticket')
            .setStyle(ButtonStyle.Danger),
    );

    // Actualizamos el mensaje original
    try {
        await message.edit({
            embeds: [originalEmbed],
            components: [actionRow],
        });
    } catch (err) {
        logger.warn('[Ticket:Claim] No se pudo editar el mensaje original:', err);
    }

    // Respuesta a la interacción
    // Si es botón, usamos update/deferUpdate implícito al editar? No, update() actualiza el mensaje DEL BOTÓN.
    // Pero aquí ya editamos el mensaje explícitamente con `message.edit`.
    // Si es slash command, debemos usar reply.
    if (interaction.isButton && interaction.isButton()) {
        // Como ya editamos el mensaje arriba manualmente (para soportar caso de slash command),
        // aquí solo respondemos "vacío" o diferimos para quitar el spinner, o hacemos update si no lo editamos arriba.
        // Pero message.edit() funciona siempre.
        // Para evitar conflicto, hacemos deferUpdate si es botón.
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferUpdate().catch(() => {});
        }
    } else {
        // Slash command
        await replySuccess(interaction, `Has reclamado este ticket correctamente.`, true);
    }

    // Mensaje en el chat (visible para todos)
    await channel.send({
        embeds: [resolveDbEmbed(
            guild.id,
            'ticket_claim',
            { staff: `<@${user.id}>` },
            '✋ Ticket Reclamado',
            `Este ticket ha sido reclamado por <@${user.id}>. En breve te atenderá.`,
            COLORS.WARNING
        )]
    });

    // ─── Auditoría ───
    await logAudit(
        client, guild.id,
        AUDIT_ACTIONS.TICKET_CLAIM,
        user.id, ticket.user_id,
        `Ticket #${String(ticket.id).padStart(4, '0')} reclamado`
    );
}

/**
 * Libera un ticket reclamado.
 */
async function handleUnclaimTicket(interaction) {
    const { guild, user, channel, client } = interaction;
    const config = getGuildConfig(guild.id);
    const ticket = getTicketByChannel(channel.id);

    if (!ticket || !ticket.claimed_by) {
        return replyError(interaction, 'Este ticket no está reclamado.', true);
    }

    // Solo el que reclamó o un admin puede liberar
    const member = await guild.members.fetch(user.id);
    const isAdmin = (config.admin_role_id && member.roles.cache.has(config.admin_role_id))
        || member.permissions.has(PermissionFlagsBits.Administrator);
    const isClaimer = ticket.claimed_by === user.id;

    if (!isClaimer && !isAdmin) {
        return replyError(interaction, 'Solo quien reclamó el ticket o un admin puede liberarlo.', true);
    }

    // ─── Buscar mensaje inicial del ticket (Embed) ───
    let message = interaction.message;
    if (!message) {
        // En caso de Slash Command, buscar mensaje del bot
        const messages = await channel.messages.fetch({ limit: 10, after: '0' });
        message = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.components.length > 0);
    }

    if (!message) {
        return replyError(interaction, 'No se pudo encontrar el mensaje original del ticket para actualizarlo.', true);
    }

    // ─── Liberar ───
    unclaimTicket(channel.id);

    // Restaurar acceso al staff
    if (config.staff_role_id) {
        try {
            await channel.permissionOverwrites.edit(config.staff_role_id, {
                ViewChannel: true,
                SendMessages: true,
            });
        } catch {
            // no critical
        }
    }

    // ─── Actualizar Embed Original ───
    const originalEmbed = EmbedBuilder.from(message.embeds[0]);
    
    // Buscar campo 'Reclamado por' y resetearlo
    const newFields = originalEmbed.data.fields?.map(field => {
        if (field.name.includes('Reclamado por')) {
            return { ...field, value: 'Nadie (Sin asignar)' };
        }
        return field;
    }) || [];

    originalEmbed.setFields(newFields);
    originalEmbed.setColor(COLORS.SUCCESS); // Volver al color original (verde/abierto)

    const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('✋ Reclamar Ticket')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel('🔒 Cerrar Ticket')
            .setStyle(ButtonStyle.Danger),
    );

    // Actualizamos el mensaje original
    try {
        await message.edit({ 
            embeds: [originalEmbed],
            components: [actionRow] 
        });
    } catch (err) {
        logger.warn('[Ticket:Unclaim] No se pudo editar mensaje original:', err);
    }

    // Respuesta a la interacción
    if (interaction.isButton && interaction.isButton()) {
        if (!interaction.replied && !interaction.deferred) {
            await interaction.deferUpdate().catch(() => {});
        }
    } else {
        // Slash command
        await replySuccess(interaction, `Has liberado este ticket correctamente.`, true);
    }

    // Mensaje en el chat (visible para todos)
    await channel.send({
        embeds: [resolveDbEmbed(
            guild.id,
            'ticket_unclaim',
            { staff: `<@${user.id}>` },
            '🔓 Ticket Liberado',
            `<@${user.id}> ha liberado este ticket. Ahora otro miembro del staff puede reclamarlo.`,
            COLORS.INFO
        )]
    });

    await logAudit(
        client, guild.id,
        AUDIT_ACTIONS.TICKET_UNCLAIM,
        user.id, ticket.user_id,
        `Ticket #${String(ticket.id).padStart(4, '0')} liberado`
    );
}

/**
 * Cierra un ticket: genera transcripción, envía al DM y logs, elimina canal.
 */
async function processTicketClosure(interaction, reason = 'No especificada') {
    const { guild, user, channel, client } = interaction;
    const config = getGuildConfig(guild.id);
    const ticket = getTicketByChannel(channel.id);

    if (!ticket) {
        // Si es una interacción deferred, usamos editReply, si no reply
        const reply = interaction.deferred ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction);
        return reply({ content: 'Este canal no es un ticket válido.', ephemeral: true });
    }

    // Verificar permisos (usuario del ticket, staff o admin)
    const member = await guild.members.fetch(user.id);
    const isOwner = ticket.user_id === user.id;
    const isStaff = (config.staff_role_id && member.roles.cache.has(config.staff_role_id))
        || (config.admin_role_id && member.roles.cache.has(config.admin_role_id))
        || member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isStaff) {
        const reply = interaction.deferred ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction);
        return reply({ content: 'No tienes permisos para cerrar este ticket.', ephemeral: true });
    }
    
    // Si no estaba diferida, diferirla ahora (para operaciones largas)
    if (!interaction.deferred && !interaction.replied) {
        if (typeof interaction.deferUpdate === 'function') {
            await interaction.deferUpdate().catch(() => {});
        } else {
            // Para Slash Commands (no tienen deferUpdate)
            await interaction.deferReply({ ephemeral: true }).catch(() => {});
        }
    }

    const ticketNumber = String(ticket.id).padStart(4, '0');

    // ─── Cerrar en DB ───
    closeTicketDB(channel.id, user.id);

    // ─── Generar transcripción ───
    let transcript = null;
    try {
        const result = await generateTranscript(channel, { ticketId: ticketNumber });
        transcript = result.attachment;
        // Guardar URL local en DB de inmediato (para el panel web)
        if (result.localUrl) {
            setTranscriptUrl(channel.id, result.localUrl);
        }
    } catch (err) {
        logger.error('[Tickets] Error al generar transcripción:', err);
    }

    // ─── Embed de cierre ───
    const closeEmbed = buildEmbed(guild.id, 'ticket_close', {
        ticketId: ticketNumber,
        closer: `<@${user.id}>`,
    });

    // ─── Enviar transcripción al DM del usuario ───
    try {
        const ticketUser = await client.users.fetch(ticket.user_id);
        const dmEmbed = new EmbedBuilder()
            .setTitle('📄 Transcripción de Ticket')
            .setDescription(`Tu ticket **#${ticketNumber}** en **${guild.name}** ha sido cerrado.\nAdjuntamos la transcripción completa.`)
            .addFields({ name: '📝 Razón de cierre', value: reason || 'No especificada' })
            .setColor(COLORS.INFO)
            .setFooter({ text: 'Tacoland Network' })
            .setTimestamp();

        const dmPayload = { embeds: [dmEmbed] };
        if (transcript) dmPayload.files = [transcript];

        await ticketUser.send(dmPayload);

        // ─── Solicitar valoración ───
        const ratingEmbed = new EmbedBuilder()
            .setTitle('⭐ Valoración del Servicio')
            .setDescription('Por favor, califica la atención recibida en este ticket.\nTu opinión nos ayuda a mejorar.')
            .setColor(COLORS.WARNING)
            .setFooter({ text: 'Tacoland Network' });

        const ratingRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`ticket_rate_${ticket.id}_1`).setLabel('1').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`ticket_rate_${ticket.id}_2`).setLabel('2').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`ticket_rate_${ticket.id}_3`).setLabel('3').setEmoji('⭐').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`ticket_rate_${ticket.id}_4`).setLabel('4').setEmoji('⭐').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`ticket_rate_${ticket.id}_5`).setLabel('5').setEmoji('⭐').setStyle(ButtonStyle.Success),
        );

        await ticketUser.send({ embeds: [ratingEmbed], components: [ratingRow] });

    } catch (err) {
        // Usuario con DMs cerrados - no es crítico
        logger.warn(`[Tickets] No se pudo enviar DM a ${ticket.user_id}: ${err.message}`);
        await channel.send({
            embeds: [simpleEmbed(
                '⚠️ DMs Cerrados',
                `No se pudo enviar la transcripción al DM de <@${ticket.user_id}>. Es posible que tenga los DMs cerrados.`,
                COLORS.WARNING
            )],
        });
    }

    // ─── Enviar transcripción al canal (transcript_channel → log_channel como fallback) ───
    if (transcript) {
        // Intentar canales en orden: transcript primero, luego log como fallback
        const channelsToTry = [];
        if (config.transcript_channel_id) channelsToTry.push(config.transcript_channel_id);
        if (config.log_channel_id && config.log_channel_id !== config.transcript_channel_id) {
            channelsToTry.push(config.log_channel_id);
        }

        let transcriptSent = false;
        for (const channelId of channelsToTry) {
            if (transcriptSent) break;
            try {
                const targetChannel = await client.channels.fetch(channelId);
                if (targetChannel?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(`📄 Transcripción — Ticket #${ticketNumber}`)
                        .setDescription(`**Departamento:** ${ticket.department_name ?? 'Desconocido'}\n**Usuario:** <@${ticket.user_id}>\n**Cerrado por:** <@${user.id}>\n**Fecha:** <t:${Math.floor(Date.now() / 1000)}:f>`)
                        .setColor(COLORS.SUCCESS)
                        .setFooter({ text: 'Tacoland Network' })
                        .setTimestamp();
                    await targetChannel.send({ embeds: [logEmbed], files: [transcript] });
                    logger.info(`[Tickets] Transcripción enviada al canal ${channelId}`);
                    transcriptSent = true;
                }
            } catch (err) {
                logger.warn(`[Tickets] No se pudo enviar transcripción al canal ${channelId}: ${err.message}`);
            }
        }

        if (!transcriptSent && channelsToTry.length > 0) {
            logger.error('[Tickets] ⚠️ Ningún canal válido para transcripciones. Actualiza transcript_channel_id y/o log_channel_id en la configuración.');
        }
    }

    // ─── Auditoría ───
    const logDetails = {
        ticketId: ticketNumber,
        openerId: ticket.user_id,
        claimedBy: ticket.claimed_by,
        closerId: user.id,
        reason: reason
    };

    // Usamos el formato especial pasando un objeto en 'details'
    const logMessage = await logAudit(
        client, guild.id,
        AUDIT_ACTIONS.TICKET_CLOSE,
        user.id, ticket.user_id,
        logDetails, // Objeto con info estructurada
        [], // extraFields
        // Forzar envío al canal de TRANSCRIPCIONES si existe, en vez del de logs general
        config.transcript_channel_id || null // Argumento overrideChannelId
    );

    // Guardar referencia al message ID para poder editarlo después con la valoración
    if (logMessage) {
        setCloseAuditLogId(channel.id, logMessage.id);
    }

    // ─── Mensaje de cierre y eliminar canal ───
    await channel.send({ embeds: [closeEmbed] });
    await channel.send({
        embeds: [simpleEmbed('🗑️ Eliminación', 'Este canal se eliminará en **5 segundos**...', COLORS.DANGER)],
    });

    setTimeout(async () => {
        try {
            await channel.delete('Ticket cerrado');
        } catch (err) {
            logger.error('[Tickets] Error al eliminar canal:', err);
        }
    }, 5000);
}


/**
 * Helper to update audit log with rating
 */
async function updateAuditLogRating(client, ticketId, rating, feedback) {
    let logUpdated = false;
    try {
        const ticket = getTicketById(ticketId);
        
        if (ticket && ticket.guild_id && ticket.close_audit_log_id) {
            const config = getGuildConfig(ticket.guild_id);
            if (config && config.log_channel_id) {
                const logChannel = await client.channels.fetch(config.log_channel_id);
                if (logChannel) {
                    let logMessage;
                    try {
                        logMessage = await logChannel.messages.fetch(ticket.close_audit_log_id);
                    } catch (fetchErr) {
                        // El mensaje fue borrado (10008) u otro error — saltar actualización del log
                        if (fetchErr.code !== 10008) throw fetchErr;
                    }
                    if (logMessage && logMessage.embeds.length > 0) {
                        const originalEmbed = EmbedBuilder.from(logMessage.embeds[0]);
                        
                        const fields = originalEmbed.data.fields || [];
                        const ratingFieldIndex = fields.findIndex(f => f.name.includes('Valoración'));
                        
                        const newField = {
                            name: '⭐ Valoración',
                            value: `**Nota:** ${rating} / 5\n**Comentarios:** ${feedback || 'Ninguno'}`,
                            inline: false
                        };

                        if (ratingFieldIndex !== -1) {
                            fields[ratingFieldIndex] = newField;
                        } else {
                            fields.push(newField);
                        }
                        
                        originalEmbed.setFields(fields);
                        await logMessage.edit({ embeds: [originalEmbed] });
                        logUpdated = true;
                    }
                }
            }
        }
        
        if (!logUpdated && ticket && ticket.guild_id) {
                 await logAudit(
                    client, 
                    ticket.guild_id, 
                    AUDIT_ACTIONS.TICKET_RATE,
                    ticket.user_id, // executor (technically the user who rated)
                    ticket.user_id, // target
                    `Valoración: ${rating}⭐\nComentarios: ${feedback || 'Ninguno'}`
                 );
        }
    } catch (error) {
        logger.error('[Tickets] Error al actualizar log de auditoría con valoración:', error);
    }
}

/**
 * Maneja la valoración de un ticket (Estrellas).
 * Formato: ticket_rate_{id}_{rating}
 */
async function handleRating(interaction) {
    if (!interaction.isButton()) return;

    try {
        const parts = interaction.customId.split('_');
        // partes: ['ticket', 'rate', '12', '5']
        const ticketId = parseInt(parts[2]);
        const rating = parseInt(parts[3]);

        if (isNaN(ticketId) || isNaN(rating)) return;

        // Actualizar en DB
        updateTicketRating(ticketId, rating);

        // Actualizar Log de Auditoría inmediatamente
        await updateAuditLogRating(interaction.client, ticketId, rating, null);

        // Mostrar Modal para feedback opcional
        const modal = new ModalBuilder()
            .setCustomId(`ticket_feedback_${ticketId}_${rating}`)
            .setTitle('📝 Comentario Adicional');

        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedback_text')
            .setLabel('¿Algún comentario para mejorar? (Opcional)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Escribe aquí tu opinión...')
            .setRequired(false)
            .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(feedbackInput);
        modal.addComponents(row);

        await interaction.showModal(modal);

    } catch (error) {
        logger.error('[Tickets] Error al mostrar modal de feedback:', error);
        // Si falla mostrar modal (raro), al menos confirmamos la valoración
        await interaction.reply({ content: '¡Valoración recibida! Gracias.', ephemeral: true });
    }
}

/**
 * Maneja el submit del comentario de feedback.
 * Formato: ticket_feedback_{id}_{rating}
 */
async function handleRatingFeedback(interaction) {
    if (!interaction.isModalSubmit()) return;

    try {
        const parts = interaction.customId.split('_');
        const ticketId = parseInt(parts[2]);
        const rating = parseInt(parts[3]);

        const feedback = interaction.fields.getTextInputValue('feedback_text');

        // Guardar comentario en DB
        if (feedback) {
            updateTicketRating(ticketId, null, feedback); 
        }

        // Actualizar log con el feedback
        await updateAuditLogRating(interaction.client, ticketId, rating, feedback);

        // Editar el mensaje original del DM para quitar los botones y dar las gracias
        const embed = new EmbedBuilder()
            .setTitle('⭐ ¡Gracias por tu valoración!')
            .setDescription(`Has calificado nuestro servicio con **${rating} / 5 estrellas**.\n\n${feedback ? `**Comentario:**\n*${feedback}*` : '¡Agradecemos tu feedback!'}`)
            .setColor(COLORS.SUCCESS)
            .setFooter({ text: 'Tacoland Network' });

        // En contextos de ModalSubmit en DM, a veces `update` no funciona si el mensaje original no es referenciable fácilmente o si ha pasado tiempo.
        // Pero como el modal se abre desde el botón, podemos intentar responder o editar.
        // Discord API: Interaction response to a modal submit can update the message.
        
        await interaction.update({
            embeds: [embed],
            components: [], // Quitar botones
        });

        logger.info(`[Tickets] Feedback recibido. Ticket #${ticketId}. Rating: ${rating}. Comentario: ${feedback ? 'Sí' : 'No'}`);

    } catch (error) {
        logger.error('[Tickets] Error al procesar feedback:', error);
        await interaction.deferUpdate(); // Evitar error de interacción fallida si algo explota
    }
}

/**
 * Botón Cerrar: Muestra modal para pedir razón.
 */
async function handleCloseTicketButton(interaction) {
    // Check permissions before showing modal
    const { guild, user, channel } = interaction;
    const config = getGuildConfig(guild.id);
    const ticket = getTicketByChannel(channel.id);

    if (!ticket) return replyError(interaction, 'Ticket no válido.', true);

    const member = await guild.members.fetch(user.id);
    const isOwner = ticket.user_id === user.id;
    const isStaff = (config.staff_role_id && member.roles.cache.has(config.staff_role_id))
        || (config.admin_role_id && member.roles.cache.has(config.admin_role_id))
        || member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isStaff) {
        return replyError(interaction, 'No tienes permisos para cerrar este ticket.', true);
    }

    const modal = new ModalBuilder()
        .setCustomId('ticket_close_modal')
        .setTitle('🔒 Cerrar Ticket');

    const reasonInput = new TextInputBuilder()
        .setCustomId('close_reason')
        .setLabel('Razón del cierre (Opcional)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ej: Solucionado, Inactividad...')
        .setRequired(false)
        .setMaxLength(500);

    const row = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

/**
 * Modal Submit: Procesa el cierre con la razón.
 */
async function handleCloseTicketModal(interaction) {
    if (!interaction.isModalSubmit()) return;

    const reason = interaction.fields.getTextInputValue('close_reason') || 'No especificada';
    await processTicketClosure(interaction, reason);
}

/**
 * Cierra un ticket automáticamente por inactividad (llamado desde el checker).
 * No requiere interacción — trabaja directamente con el cliente y el canal.
 */
async function autoCloseTicket(client, ticket) {
    try {
        const guild = client.guilds.cache.get(ticket.guild_id);
        if (!guild) return;

        const channel = guild.channels.cache.get(ticket.channel_id);
        if (!channel) {
            // El canal ya no existe, solo cerramos en DB
            const db = require('../../../database/database');
            db.getDatabase().prepare("UPDATE tickets SET status = 'closed', closed_at = datetime('now'), closed_by = 'auto' WHERE channel_id = ?").run(ticket.channel_id);
            return;
        }

        const config = require('../../../database/database').getGuildConfig(ticket.guild_id);
        const ticketNumber = String(ticket.id).padStart(4, '0');

        logger.info(`[AutoClose] Cerrando ticket #${ticketNumber} por inactividad en ${guild.name}`);

        // Mensaje previo en el canal antes de cerrar
        await channel.send({
            embeds: [simpleEmbed(
                '⏰ Cierre automático por inactividad',
                `Este ticket (#${ticketNumber}) ha sido cerrado automáticamente por no tener actividad en las últimas **${config.ticket_autoclose_hours} horas**.`,
                COLORS.WARNING
            )]
        }).catch(() => {});

        // Construir un objeto fake de interaction mínimo para reutilizar processTicketClosure
        const fakeInteraction = {
            guild,
            channel,
            client,
            user: client.user,
            deferred: false,
            replied: false,
            isButton: () => false,
            deferReply: async () => {},
            editReply: async () => {},
            reply: async () => {},
        };

        await processTicketClosure(fakeInteraction, 'Cierre automático por inactividad');
    } catch (err) {
        logger.error(`[AutoClose] Error al cerrar ticket ${ticket.channel_id}:`, err);
    }
}

module.exports = {
    openTicket,
    handleClaimTicket,
    handleUnclaimTicket,
    processTicketClosure,
    handleCloseTicketButton,
    handleCloseTicketModal,
    handleRating,
    handleRatingFeedback,
    autoCloseTicket,
};
