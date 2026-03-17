const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const NODE_ENV = process.env.NODE_ENV || 'Produccion';

const commands = [];
const modulesPath = path.join(__dirname, '..', 'src', 'modules');

if (fs.existsSync(modulesPath)) {
    const modules = fs.readdirSync(modulesPath).filter(f =>
        fs.statSync(path.join(modulesPath, f)).isDirectory()
    );

    for (const mod of modules) {
        const commandsPath = path.join(modulesPath, mod, 'commands');
        if (!fs.existsSync(commandsPath)) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(commandsPath, file));
            if (command.data) {
                const commandJSON = command.data.toJSON();
                
                // Si estamos en desarrollo, añadir el prefijo 'd'
                if (['development', 'test', 'Test', 'Desarrollo'].includes(NODE_ENV)) {
                    if (!commandJSON.name.startsWith('d')) {
                        commandJSON.name = `d${commandJSON.name}`;
                    }
                }
                
                commands.push(commandJSON);
                console.log(`[Register] Cargando comando: /${commandJSON.name}`);
            }
        }
    }
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`[Register] Iniciando el registro de ${commands.length} comandos...`);

        // Registrar en el servidor específico (Guild) para que sea instantáneo
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`[Register] ✔ Se han registrado correctamente ${data.length} comandos.`);
    } catch (error) {
        console.error('[Register] Error al registrar comandos:', error);
    }
})();