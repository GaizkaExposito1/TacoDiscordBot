const { PermissionFlagsBits } = require('discord.js');

const LEVEL_ORDER = ['user', 'mod', 'admin', 'op'];

const LEVEL_LABELS = {
    mod:   'Moderación',
    admin: 'Administración',
    op:    'Operador/Directiva',
};

/**
 * Devuelve el nivel del miembro: 'op', 'admin', 'mod' o 'user'.
 * La jerarquía es jerárquica: si tienes un rol >= al configurado, tienes ese nivel o superior.
 */
function getMemberLevel(member, config) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return 'op';

    const check = (roleId) => {
        if (!roleId) return false;
        const role = member.guild.roles.cache.get(roleId);
        return role && member.roles.highest.comparePositionTo(role) >= 0;
    };

    if (check(config?.op_min_role_id))    return 'op';
    if (check(config?.admin_min_role_id)) return 'admin';
    if (check(config?.mod_min_role_id))   return 'mod';
    return 'user';
}

function hasMinLevel(member, config, minLevel) {
    const level = getMemberLevel(member, config);
    return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(minLevel);
}

/**
 * Comprueba el nivel mínimo y responde con error si no lo cumple.
 * Devuelve true si pasa, false si fue rechazado.
 */
async function requireLevel(interaction, config, minLevel) {
    if (!hasMinLevel(interaction.member, config, minLevel)) {
        await interaction.reply({
            content: `❌ Necesitas el rango de **${LEVEL_LABELS[minLevel]}** para usar este comando.`,
            ephemeral: true,
        });
        return false;
    }
    return true;
}

module.exports = { getMemberLevel, hasMinLevel, requireLevel, LEVEL_LABELS };
