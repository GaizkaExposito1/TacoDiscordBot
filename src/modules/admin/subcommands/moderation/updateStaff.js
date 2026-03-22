const { EmbedBuilder, MessageFlags } = require('discord.js');
const logger = require('../../../../utils/logger.js');
const { COLORS } = require('../../../../utils/constants');
const { getGuildConfig } = require('../../../../database/database');
const { requireLevel } = require('../../../../utils/permCheck');

module.exports = {
    async execute(interaction) {
        const config = getGuildConfig(interaction.guild.id);
        if (!await requireLevel(interaction, config, 'op')) return;
        const usuario = interaction.options.getUser('usuario');
        const rangoStaff = interaction.options.getRole('rango_staff');
        const accion = interaction.options.getString('accion');
        const mencion = interaction.options.getString('mencion');
        const channel = interaction.options.getChannel('canal') || interaction.channel;

        let embedColor = COLORS.TICKET;
        let embedTitle = '📈 Staff Update'; // Título por defecto
        let mensaje = '';

        switch (accion) {
            case 'promote':
                embedColor = '#43b581'; // Green
                embedTitle = '📈 Staff Promotion';
                mensaje = `**Usuario:** ${usuario} (\`${usuario.username}\`)\n**Rol:** ${rangoStaff}\n**Acción:** Ha sido ascendido/a.`;
                break;
            case 'downgrade':
                embedColor = '#f04747'; // Red
                embedTitle = '📉 Staff Downgrade';
                mensaje = `**Usuario:** ${usuario} (\`${usuario.username}\`)\n**Rol:** ${rangoStaff}\n**Acción:** Ha sido degradado/a.`;
                break;
            case 'join':
                embedColor = '#5865F2'; // Blurple
                embedTitle = '👋 Staff Join';
                mensaje = `**Usuario:** ${usuario} (\`${usuario.username}\`)\n**Rol:** ${rangoStaff}\n**Acción:** Se ha unido al staff.`;
                break;
            case 'resign':
                embedColor = '#faa61a'; // Orange
                embedTitle = '🚪 Staff Resign';
                mensaje = `**Usuario:** ${usuario} (\`${usuario.username}\`)\n**Rol:** ${rangoStaff}\n**Acción:** Ha dejado el staff.`;
                break;
        }

        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(embedTitle)
            .setDescription(mensaje)
            .setFooter({ 
                text: 'Tacoland High Staff', 
                iconURL: interaction.guild.iconURL() 
            })
            .setTimestamp();

        const payload = { embeds: [embed] };
        
        // Solo añadir mención explicita si se seleccionó en el comando (ej: @here, @everyone)
        // La mención al usuario ya está dentro del embed (visual), si no se quiere ping, no se pone en content.
        if (mencion) {
            payload.content = mencion;
        }

        try {
            // 1. Enviar al canal
            await channel.send(payload);

            // 2. Intentar enviar MD al usuario
            try {
                await usuario.send({ 
                    content: `📢 **Actualización de Staff en ${interaction.guild.name}**`,
                    embeds: [embed] 
                });
            } catch (dmError) {
                logger.warn(`[UpdateStaff] No se pudo enviar MD a ${usuario.tag}: ${dmError.message}`);
                // No fallamos el comando si tiene DMs cerrados, solo logueamos
            }

            await interaction.reply({ 
                content: `✅ Update Staff enviado correctamente a ${channel}.`, 
                flags: MessageFlags.Ephemeral 
            });
        } catch (error) {
            logger.error('[UpdateStaff] Error enviar:', error);
            await interaction.reply({ content: 'Hubo un error al enviar el update de staff.', flags: MessageFlags.Ephemeral });
        }
    }
};
