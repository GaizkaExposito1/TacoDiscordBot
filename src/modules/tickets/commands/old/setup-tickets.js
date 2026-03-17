const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const { getDepartments, getGuildConfig, addDepartment, setPanelReference } = require('../../../database/database');
const { buildEmbed } = require('../../../utils/embeds');
const { replyError, replySuccess } = require('../../../utils/responses');
const { logAudit } = require('../../../utils/audit');
const { AUDIT_ACTIONS } = require('../../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-tickets')
        .setDescription('Envía el panel de tickets con el menú desplegable.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { guild, channel, client, user } = interaction;
        const config = getGuildConfig(guild.id);

        if (!config.ticket_category_id) {
            return replyError(interaction, 'Debes configurar la categoría de tickets antes de usar este comando.\nUsa `/config tickets categoria` para establecerla.', true);
        }

        // Asegurarse de que existan departamentos por defecto
        let departments = getDepartments(guild.id);
        if (departments.length === 0) {
            addDepartment(guild.id, 'Soporte General', '🛠️', 'Ayuda técnica y consultas generales');
            addDepartment(guild.id, 'Ventas', '💰', 'Consultas sobre compras y pagos');
            departments = getDepartments(guild.id);
        }

        // ─── Menú Desplegable (Select Menu) ───
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_department_select')
            .setPlaceholder('Despliega el menú y elige una categoría')
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

        // ─── Embed del panel ───
        const panelEmbed = buildEmbed(guild.id, 'panel', {
            server: guild.name,
        });

        const panelMessage = await channel.send({
            embeds: [panelEmbed],
            components: [row],
        });

        // Guardar referencia del panel
        setPanelReference(guild.id, channel.id, panelMessage.id);

        await replySuccess(interaction, 'El panel ha sido actualizado con el menú desplegable.', true);

        await logAudit(
            client, guild.id,
            AUDIT_ACTIONS.PANEL_SETUP,
            user.id, null,
            `Panel de tickets (Menú) configurado en #${channel.name}`
        );
    },
};
