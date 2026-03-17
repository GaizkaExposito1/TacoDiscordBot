const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getTicketByChannel, getGuildConfig } = require('../../../database/database');
const { processTicketClosure, handleClaimTicket, handleUnclaimTicket } = require('../services/ticketService');
const { replyError, replySuccess, replyInfo, replyWarning } = require('../../../utils/responses');
const logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Comandos de gestión de tickets')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Añade a un usuario o miembro del staff a este ticket.')
                .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a añadir').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Elimina a un usuario de este ticket.')
                .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a eliminar').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Cierra el ticket actual.')
                .addStringOption(opt => opt.setName('razon').setDescription('La razón del cierre (opcional)'))
        )
        .addSubcommand(sub =>
            sub.setName('claim')
                .setDescription('Reclama este ticket para ti.')
        )
        .addSubcommand(sub =>
            sub.setName('unclaim')
                .setDescription('Libera este ticket (deja de reclamarlo).')
        ),

    async execute(interaction) {
        const { channel, options, user, guild } = interaction;
        const config = getGuildConfig(guild.id);
        const subcommand = options.getSubcommand();
        const targetUser = options.getUser('usuario');

        // Verificar que es un ticket real
        const ticket = getTicketByChannel(channel.id);
        if (!ticket) {
            return replyError(interaction, 'Este comando solo se puede usar dentro de un canal de ticket.', true);
        }

        // Verificar permisos (Solo Owner, Staff o Admin pueden gestionar miembros)
        const member = await guild.members.fetch(user.id);
        const isStaff = (config.staff_role_id && member.roles.cache.has(config.staff_role_id));
        const isAdmin = (config.admin_role_id && member.roles.cache.has(config.admin_role_id)) || member.permissions.has(PermissionFlagsBits.Administrator);
        const isOwner = ticket.user_id === user.id;

        // Quien reclamó el ticket también tiene permiso
        const isClaimer = ticket.claimed_by === user.id;

        // Regla: Solo Staff/Admin/Claimer pueden gestionar usuarios (add/remove).
        // El creador del ticket (Owner) NO tiene permiso para ninguna gestión de usuarios.
        // PERO para cerrar tickets, el owner sí puede.
        
        if (subcommand === 'close') {
            const reason = options.getString('razon') || 'No especificada';
            try {
               await processTicketClosure(interaction, reason);
            } catch (error) {
               logger.error('[Command:Ticket:Close]', error);
            }
            return;
        }

        if (subcommand === 'claim') {
            try {
                await handleClaimTicket(interaction);
            } catch (error) {
                logger.error('[Command:Ticket:Claim]', error);
            }
            return;
        }

        if (subcommand === 'unclaim') {
            try {
                await handleUnclaimTicket(interaction);
            } catch (error) {
                logger.error('[Command:Ticket:Unclaim]', error);
            }
            return;
        }

        if (!isStaff && !isAdmin && !isClaimer) {
            return replyError(interaction, 'Solo el staff puede gestionar usuarios en este ticket.', true);
        }

        switch (subcommand) {
            case 'add':
                try {
                    await channel.permissionOverwrites.create(targetUser.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        AttachFiles: true,
                        EmbedLinks: true
                    });

                    await replySuccess(interaction, `<@${targetUser.id}> ha sido añadido al ticket por <@${user.id}>.`, false);
                } catch (error) {
                    logger.error('[Ticket:Add] Error:', error);
                    await replyError(interaction, 'No se pudo añadir al usuario. Verifica mis permisos.', true);
                }
                break;

            case 'remove':
                // Evitar eliminar al dueño del ticket o al bot
                if (targetUser.id === ticket.user_id) {
                    return replyWarning(interaction, 'No puedes eliminar al creador del ticket.', true);
                }

                try {
                    await channel.permissionOverwrites.delete(targetUser.id);
                    // O explícitamente denegar si delete no basta (depende de roles)
                    await channel.permissionOverwrites.edit(targetUser.id, {
                        ViewChannel: false
                    });

                    await replyInfo(interaction, '📤 Usuario Eliminado', `<@${targetUser.id}> ha sido eliminado del ticket.`, false);
                } catch (error) {
                    logger.error('[Ticket:Remove] Error:', error);
                    await replyError(interaction, 'No se pudo eliminar al usuario.', true);
                }
                break;
        }
    }
};
