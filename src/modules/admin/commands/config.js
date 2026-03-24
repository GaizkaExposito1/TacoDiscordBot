const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, getDatabase } = require('../../../database/database');
const { requireLevel } = require('../../../utils/permCheck');
const { getAuditConfig } = require('../../audit/utils/auditDb');
const logger = require('../../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Muestra un resumen completo de toda la configuración del servidor. [Solo Op]')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const config = getGuildConfig(interaction.guild.id);

        // Sólo el nivel Op puede usar este comando
        if (!await requireLevel(interaction, config, 'op')) return;

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const db = getDatabase();
            const auditConfig = getAuditConfig(guild.id);

            // Helper para mostrar rol o "No configurado"
            const roleStr = (id) => id ? `<@&${id}>` : '`No configurado`';
            // Helper para mostrar canal o "No configurado"
            const chanStr = (id) => id ? `<#${id}>` : '`No configurado`';
            // Helper para On/Off
            const onOff = (val) => val ? '✅ Activado' : '❌ Desactivado';

            // ── Roles de moderación ──────────────────────────────
            const rolesSection = [
                `**Op / Directiva:** ${roleStr(config.op_min_role_id)}`,
                `**Admin (ban/unban):** ${roleStr(config.admin_min_role_id)}`,
                `**Mod (warn/timeout/kick):** ${roleStr(config.mod_min_role_id)}`,
                `**Staff:** ${roleStr(config.staff_role_id)}`,
                `**Admin (tickets):** ${roleStr(config.admin_role_id)}`,
                `**Silenciado:** ${roleStr(config.silenciado_role_id)}`,
            ].join('\n');

            // ── Canales ──────────────────────────────────────────
            const channelsSection = [
                `**Logs generales:** ${chanStr(config.log_channel_id)}`,
                `**Transcripciones:** ${chanStr(config.transcript_channel_id)}`,
                `**Bienvenida:** ${chanStr(config.welcome_channel_id)}`,
                `**Sugerencias:** ${chanStr(config.suggestions_channel_id)}`,
                `**✅ Sugerencias aceptadas:** ${chanStr(config.suggestions_accepted_id)}`,
                `**❌ Sugerencias denegadas:** ${chanStr(config.suggestions_denied_id)}`,
                `**📢 Updates:** ${chanStr(config.updates_channel_id)}`,
            ].join('\n');

            // ── Tickets ──────────────────────────────────────────
            const counterMode = config.ticket_counter_mode === 'global' ? 'Global' : 'Por categoría';
            const autoclose   = config.ticket_autoclose_hours > 0
                ? `${config.ticket_autoclose_hours}h sin actividad`
                : '❌ Desactivado';
            const ticketsSection = [
                `**Categoría:** ${config.ticket_category_id ? `\`${config.ticket_category_id}\`` : '`No configurado`'}`,
                `**Panel:** ${config.panel_channel_id ? chanStr(config.panel_channel_id) : '`No configurado`'}`,
                `**Máx. tickets/usuario:** \`${config.max_tickets_per_user ?? 1}\``,
                `**Contador:** \`${config.ticket_counter ?? 0}\` (modo: ${counterMode})`,
                `**Auto-cierre:** ${autoclose}`,
            ].join('\n');

            // ── Bienvenida ────────────────────────────────────────
            const welcomeSection = [
                `**Estado bienvenida:** ${onOff(config.welcome_enabled)}`,
                `**Estado despedida:** ${onOff(config.goodbye_enabled)}`,
                `**Canal:** ${chanStr(config.welcome_channel_id)}`,
                `**Mensaje:** ${config.welcome_message ? `\`${config.welcome_message.slice(0, 60)}${config.welcome_message.length > 60 ? '…' : ''}\`` : '`Por defecto`'}`,
            ].join('\n');

            // ── Auto-roles de bienvenida ──────────────────────────
            const welcomeRoles = db.prepare('SELECT role_id FROM welcome_roles WHERE guild_id = ?').all(guild.id);
            const autoRolesStr = welcomeRoles.length > 0
                ? welcomeRoles.map(r => `<@&${r.role_id}>`).join(', ')
                : '`Ninguno`';

            // ── Warns ─────────────────────────────────────────────
            const warnAction   = config.warn_action ?? 'none';
            const warnThresh   = config.warn_threshold ?? 0;
            const warnDuration = config.warn_action_duration;
            const warnSection  = warnThresh === 0 || warnAction === 'none'
                ? '❌ Desactivado'
                : [
                    `**Umbral:** \`${warnThresh} warns\``,
                    `**Acción:** \`${warnAction.toUpperCase()}\`${warnDuration ? ` (${warnDuration})` : ''}`,
                ].join('\n');

            // ── Auditoría ─────────────────────────────────────────
            let auditSection = '`No configurado`';
            if (auditConfig) {
                const enabled = [
                    auditConfig.log_message_delete  && '🗑 msg delete',
                    auditConfig.log_message_edit     && '✏️ msg edit',
                    auditConfig.log_member_role_update && '👤 rol update',
                    auditConfig.log_member_update    && '👤 member update',
                    auditConfig.log_channel_create   && '📁 ch create',
                    auditConfig.log_channel_delete   && '📁 ch delete',
                    auditConfig.log_channel_update   && '📁 ch update',
                    auditConfig.log_role_create      && '🏷️ role create',
                    auditConfig.log_role_delete      && '🏷️ role delete',
                    auditConfig.log_role_update      && '🏷️ role update',
                ].filter(Boolean);

                auditSection = [
                    `**Canal:** ${chanStr(auditConfig.log_channel_id)}`,
                    `**Eventos activos:** ${enabled.length > 0 ? enabled.join(', ') : 'Ninguno'}`,
                ].join('\n');
            }

            // ── Construcción del embed ────────────────────────────
            const embed = new EmbedBuilder()
                .setTitle(`⚙️ Configuración de ${guild.name}`)
                .setThumbnail(guild.iconURL({ size: 128 }))
                .setColor('#5865F2')
                .setTimestamp()
                .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: '👥 Roles', value: rolesSection, inline: false },
                    { name: '📺 Canales', value: channelsSection, inline: false },
                    { name: '🎟️ Tickets', value: ticketsSection, inline: true },
                    { name: '👋 Bienvenida', value: welcomeSection, inline: true },
                    { name: '🤖 Auto-roles al entrar', value: autoRolesStr, inline: false },
                    { name: '⚠️ Auto-acción de Warns', value: warnSection, inline: true },
                    { name: '🔍 Auditoría', value: auditSection, inline: true },
                );

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            logger.error('[Config] Error generando panel de configuración:', error);
            return interaction.editReply({ content: '❌ Ocurrió un error al generar el panel de configuración.' });
        }
    },
};
