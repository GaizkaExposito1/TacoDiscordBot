const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { setLogChannel, toggleAuditEvent, toggleAllAuditEvents, getAuditConfig } = require('../utils/auditDb');
const lookup = require('../subcommands/lookup/userLookup');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('audit')
        .setDescription('Sistema de logs y auditoría')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        // ------------------ SUBCOMANDO: LOOKUP ------------------
        .addSubcommand(sub =>
            sub.setName('lookup')
                .setDescription('Busca el historial de un usuario (Sanciones y Tickets)')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('El usuario a investigar')
                        .setRequired(true)))
        // ------------------ SUBCOMANDO: CHANNEL (Restringido) ------------------
        .addSubcommand(sub => 
            sub.setName('channel')
                .setDescription('Establece el canal donde se enviarán los logs')
                .addChannelOption(option => 
                    option.setName('canal')
                        .setDescription('Canal de texto para logs')
                        .setRequired(true)))
        // Toggle Specific Log
        .addSubcommand(sub => 
            sub.setName('toggle')
                .setDescription('Activa o desactiva un evento específico')
                .addStringOption(option => 
                    option.setName('evento')
                        .setDescription('El evento a configurar')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Mensajes Log (Borrado)', value: 'log_message_delete' },
                            { name: 'Mensajes Log (Edición)', value: 'log_message_edit' },
                            { name: 'Roles de Miembros (Update)', value: 'log_member_role_update' },
                            { name: 'Info Miembros (Nick/Avatar)', value: 'log_member_update' },
                            { name: 'Canales (Crear)', value: 'log_channel_create' },
                            { name: 'Canales (Borrar)', value: 'log_channel_delete' },
                            { name: 'Canales (Editar)', value: 'log_channel_update' },
                            { name: 'Roles (Crear)', value: 'log_role_create' },
                            { name: 'Roles (Borrar)', value: 'log_role_delete' },
                            { name: 'Roles (Editar)', value: 'log_role_update' }
                        ))
                .addStringOption(option => 
                    option.setName('estado')
                        .setDescription('On/Off')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Activado (ON)', value: 'on' },
                            { name: 'Desactivado (OFF)', value: 'off' }
                        )))
        // Toggle All
        .addSubcommand(sub => 
            sub.setName('toggle-all')
                .setDescription('Activa o desactiva TODOS los logs')
                .addStringOption(option => 
                    option.setName('estado')
                        .setDescription('On/Off')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Activar TODO', value: 'on' },
                            { name: 'Desactivar TODO', value: 'off' }
                        )))
        // Status
        .addSubcommand(sub => 
            sub.setName('status')
                .setDescription('Muestra la configuración actual')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'lookup') {
                return await lookup.execute(interaction);
            } else if (subcommand === 'channel') {
                // Solo administradores para configurar el canal
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '❌ Solo administradores pueden cambiar la configuración de los logs.', flags: MessageFlags.Ephemeral });
                }
                const channel = interaction.options.getChannel('canal');
                if (!channel.isTextBased()) {
                     return interaction.reply({ content: '❌ Debes seleccionar un canal de texto.', flags: MessageFlags.Ephemeral });
                }
                
                setLogChannel(guildId, channel.id);
                return interaction.reply({ content: `✅ Canal de logs configurado en ${channel}`, flags: MessageFlags.Ephemeral });
            
            } else if (subcommand === 'toggle') {
                const event = interaction.options.getString('evento');
                const state = interaction.options.getString('estado');
                const enabled = state === 'on';

                toggleAuditEvent(guildId, event, enabled);
                return interaction.reply({ content: `✅ **${event}** ahora está **${state.toUpperCase()}**`, flags: MessageFlags.Ephemeral });

            } else if (subcommand === 'toggle-all') {
                const state = interaction.options.getString('estado');
                const enabled = state === 'on';

                toggleAllAuditEvents(guildId, enabled);
                return interaction.reply({ content: `✅ **TODOS** los logs han sido **${state.toUpperCase()}**`, flags: MessageFlags.Ephemeral });

            } else if (subcommand === 'status') {
                const config = getAuditConfig(guildId);
                
                if (!config) {
                    return interaction.reply({ content: '⚠ No hay configuración de auditoría. Usa `/audit channel` primero.', flags: MessageFlags.Ephemeral });
                }

                const formatStatus = (val) => val ? '✅ ON' : '❌ OFF';
                
                const embed = new EmbedBuilder()
                    .setTitle('📊 Estado de Auditoría')
                    .setColor('#5865F2')
                    .addFields(
                        { name: 'Canal', value: config.log_channel_id ? `<#${config.log_channel_id}>` : 'No configurado', inline: false },
                        { name: 'Mensajes', value: `Delete: ${formatStatus(config.log_message_delete)}\nEdit: ${formatStatus(config.log_message_edit)}`, inline: true },
                        { name: 'Miembros', value: `Roles: ${formatStatus(config.log_member_role_update)}\nUpdate: ${formatStatus(config.log_member_update)}`, inline: true },
                        { name: 'Canales', value: `Create: ${formatStatus(config.log_channel_create)}\nDelete: ${formatStatus(config.log_channel_delete)}\nUpdate: ${formatStatus(config.log_channel_update)}`, inline: true },
                        { name: 'Roles', value: `Create: ${formatStatus(config.log_role_create)}\nDelete: ${formatStatus(config.log_role_delete)}\nUpdate: ${formatStatus(config.log_role_update)}`, inline: false }
                    );

                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Hubo un error al guardar la configuración.', flags: MessageFlags.Ephemeral });
        }
    }
};
