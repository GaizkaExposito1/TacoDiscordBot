const { EmbedBuilder } = require('discord.js');
const {
    getGuildConfig,
    updateGuildConfig,
    getWelcomeRoles,
    addWelcomeRole,
    removeWelcomeRole,
    clearWelcomeRoles,
} = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');
const { replacePlaceholders } = require('../../../../utils/placeholders');
const { COLORS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

// ─── Subhandlers ────────────────────────────────────────────────────────────

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('canal');
    updateGuildConfig(interaction.guild.id, 'welcome_channel_id', channel.id);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('✅ Canal configurado')
            .setDescription(`Los mensajes de bienvenida y despedida se enviarán en ${channel}.`)
            .setColor(COLORS.SUCCESS)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

async function handleMensaje(interaction) {
    const tipo  = interaction.options.getString('tipo');
    const texto = interaction.options.getString('texto');
    const field = tipo === 'welcome' ? 'welcome_message' : 'goodbye_message';
    const label = tipo === 'welcome' ? 'bienvenida' : 'despedida';

    updateGuildConfig(interaction.guild.id, field, texto);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`✅ Mensaje de ${label} actualizado`)
            .setDescription(`**Nuevo mensaje:**\n${texto}`)
            .addFields({ name: 'Placeholders disponibles', value: '`{user}` · `{username}` · `{server}` · `{member_count}`' })
            .setColor(COLORS.SUCCESS)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

async function handleEstado(interaction) {
    const tipo   = interaction.options.getString('tipo');
    const valor  = interaction.options.getString('valor');
    const field  = tipo === 'welcome' ? 'welcome_enabled' : 'goodbye_enabled';
    const label  = tipo === 'welcome' ? 'Bienvenida' : 'Despedida';
    const active = valor === '1';

    updateGuildConfig(interaction.guild.id, field, active ? 1 : 0);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle(`${active ? '✅' : '🔕'} ${label} ${active ? 'activada' : 'desactivada'}`)
            .setColor(active ? COLORS.SUCCESS : COLORS.DANGER)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

async function handleRolAdd(interaction) {
    const rol = interaction.options.getRole('rol');
    const added = addWelcomeRole(interaction.guild.id, rol.id);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle(added ? '✅ Rol añadido' : '⚠️ Rol ya configurado')
            .setDescription(added
                ? `${rol} se asignará automáticamente a los nuevos miembros.`
                : `${rol} ya estaba en la lista de roles de bienvenida.`)
            .setColor(added ? COLORS.SUCCESS : COLORS.WARNING)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

async function handleRolRemove(interaction) {
    const rol = interaction.options.getRole('rol');
    const removed = removeWelcomeRole(interaction.guild.id, rol.id);

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle(removed ? '✅ Rol eliminado' : '❌ Rol no encontrado')
            .setDescription(removed
                ? `${rol} ya no se asignará a los nuevos miembros.`
                : `${rol} no estaba en la lista de roles de bienvenida.`)
            .setColor(removed ? COLORS.SUCCESS : COLORS.DANGER)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

async function handleRolLista(interaction) {
    const roles = getWelcomeRoles(interaction.guild.id);
    const list  = roles.length > 0
        ? roles.map(r => `<@&${r.role_id}>`).join('\n')
        : '*Ninguno configurado*';

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('🎭 Roles de bienvenida automáticos')
            .setDescription(list)
            .setColor(COLORS.PRIMARY)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

async function handleVista(interaction) {
    const config = getGuildConfig(interaction.guild.id);
    const data   = {
        user: `<@${interaction.user.id}>`,
        username: interaction.user.username,
        userTag: interaction.user.tag,
        userId: interaction.user.id,
        server: interaction.guild.name,
        memberCount: interaction.guild.memberCount,
    };

    const welcomeText = config?.welcome_message || '¡Bienvenido/a {user} a **{server}**! Esperamos que lo pases genial 🎉';
    const goodbyeText = config?.goodbye_message || 'Adiós, **{username}**. Gracias por ser parte de **{server}** 👋';

    const welcomeEmbed = new EmbedBuilder()
        .setTitle('Bienvenido')
        .setDescription(replacePlaceholders(welcomeText, data))
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setColor(0x57F287)
        .setFooter({ text: `${interaction.guild.name} · Miembro #${interaction.guild.memberCount}`, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp();

    const goodbyeEmbed = new EmbedBuilder()
        .setTitle('Adiós')
        .setDescription(replacePlaceholders(goodbyeText, data))
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setColor(0xED4245)
        .setFooter({ text: `${interaction.guild.name} · Ahora somos ${interaction.guild.memberCount} miembros`, iconURL: interaction.guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp();

    await interaction.reply({
        content: '-# Vista previa — así se verán los mensajes:',
        embeds: [welcomeEmbed, goodbyeEmbed],
        ephemeral: true,
    });
}

async function handleInfo(interaction) {
    const config  = getGuildConfig(interaction.guild.id);
    const roles   = getWelcomeRoles(interaction.guild.id);
    const channel = config?.welcome_channel_id ? `<#${config.welcome_channel_id}>` : '❌ No configurado';
    const roleList = roles.length > 0 ? roles.map(r => `<@&${r.role_id}>`).join(' ') : '*Ninguno*';

    await interaction.reply({
        embeds: [new EmbedBuilder()
            .setTitle('⚙️ Configuración de Bienvenida y Despedida')
            .addFields(
                { name: '📢 Canal', value: channel, inline: false },
                { name: '✅ Bienvenida', value: (config?.welcome_enabled ?? 1) ? '🟢 Activa' : '🔴 Inactiva', inline: true },
                { name: '👋 Despedida',  value: (config?.goodbye_enabled ?? 1)  ? '🟢 Activa' : '🔴 Inactiva', inline: true },
                { name: '🎭 Roles auto', value: roleList, inline: false },
                { name: '💬 Mensaje bienvenida', value: config?.welcome_message || '*(por defecto)*' },
                { name: '💬 Mensaje despedida',  value: config?.goodbye_message  || '*(por defecto)*' },
                { name: 'Placeholders', value: '`{user}` · `{username}` · `{server}` · `{member_count}`' },
            )
            .setColor(COLORS.PRIMARY)
            .setTimestamp()
        ],
        ephemeral: true,
    });
}

// ─── Dispatcher ─────────────────────────────────────────────────────────────

module.exports = {
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const config = getGuildConfig(interaction.guild.id);
        if (!await requireLevel(interaction, config, 'op')) return;
        try {
            switch (sub) {
                case 'bienvenida-setup':       return await handleSetup(interaction);
                case 'bienvenida-mensaje':     return await handleMensaje(interaction);
                case 'bienvenida-estado':      return await handleEstado(interaction);
                case 'bienvenida-rol-add':     return await handleRolAdd(interaction);
                case 'bienvenida-rol-remove':  return await handleRolRemove(interaction);
                case 'bienvenida-rol-lista':   return await handleRolLista(interaction);
                case 'bienvenida-vista':       return await handleVista(interaction);
                case 'bienvenida-info':        return await handleInfo(interaction);
            }
        } catch (error) {
            logger.error(`[BienvenidaConfig] Error en subcomando ${sub}:`, error);
            const reply = { content: '❌ Ocurrió un error al ejecutar el comando.', ephemeral: true };
            if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
            else await interaction.reply(reply);
        }
    },
};
