# 🚀 Guía de Despliegue en VPS Linux (Versión Estable 1.0.0)

Esta guía detalla los pasos para subir y ejecutar la primera versión estable de `TacoManagment` en un servidor de producción Linux (Ubuntu/Debian).

## 1. Requisitos Previos

- **Servidor VPS Linux:** Ubuntu 20.04 LTS o superior (recomendado).
- **Acceso Root/Sudo:** Permisos para instalar paquetes.
- **Node.js:** Versión 18.x o superior.
- **Bot de Discord:** Token y Client ID listos desde el [Developer Portal](https://discord.com/developers/applications).

## 2. Preparación del Entorno

Conéctate a tu VPS mediante SSH:
```bash
ssh usuario@tu-ip-servidor
```

### Instalar Node.js y NPM
Si no tienes Node.js instalado:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verifica la instalación:
```bash
node -v
# v18.x.x o superior
npm -v
```

### Instalar PM2 (Gestor de Procesos)
PM2 mantendrá el bot activo 24/7 y lo reiniciará automáticamente ante fallos.
```bash
sudo npm install -g pm2
```

## 3. Subir el Código al Servidor

### Opción A: Usando Git (Recomendado)
Es la forma más fácil de mantener el bot actualizado.
1. Sube tu código a un repositorio privado en GitHub/GitLab.
2. Clona el repositorio en tu VPS:
   ```bash
   git clone https://github.com/tu-usuario/taco-managment.git
   cd taco-managment/bot
   ```

### Opción B: Usando SFTP (FileZilla / WinSCP)
Si no usas Git, sube manualmente la carpeta del proyecto.
**IMPORTANTE:** Asegúrate de subir la estructura completa:
```
/taco-managment
├── bot/       (código fuente)
└── data/      (base de datos, fuera del bot)
```
Excluye `node_modules`.

## 4. Instalación y Configuración

1. **Instalar dependencias**:
   Asegúrate de estar dentro de la carpeta `bot`:
   ```bash
   cd ~/taco-managment/bot
   npm install --production
   ```
   *Usamos `--production` para instalar solo lo necesario para ejecutar el bot, ahorrando espacio.*

2. **Configurar Variables de Entorno (.env)**:
   Crea el archivo de configuración copiando el ejemplo dentro de la carpeta `bot`:
   ```bash
   cp .env.example .env
   nano .env
   ```
   **Contenido recomendado para Producción:**
   ```env
   # Credenciales de Discord
   DISCORD_TOKEN=tu_token_aqui
   CLIENT_ID=tu_client_id_aqui
   GUILD_ID=tu_servidor_id_aqui

   # Configuración de Entorno
   NODE_ENV=Produccion
   ```
   *Nota: `NODE_ENV=Produccion` activará el estado "Watching Tickets" en el bot y optimizará el logging.*

   Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`.

3. **Verificar directorio de datos**:
   El bot buscará la carpeta `data` un nivel por encima de su ubicación. Asegúrate de que exista en la raíz del proyecto:
   ```bash
   cd ~/taco-managment
   mkdir -p data
   # Vuelve a la carpeta del bot para seguir
   cd bot
   ```

## 5. Despliegue de Comandos

Antes de iniciar el bot por primera vez, registra los comandos (Slash Commands) en Discord (desde la carpeta `bot`):

```bash
npm run deploy
```
*Si ves un error, verifica que tu archivo `.env` tenga el `DISCORD_TOKEN`, `CLIENT_ID` y `GUILD_ID` correctos.*

## 6. Iniciar el Bot con PM2

Para iniciar el bot en segundo plano:

```bash
pm2 start src/index.js --name "taco-bot"
```

### Comandos de Mantenimiento
- **Ver logs:** `pm2 logs taco-bot`
- **Ver estado:** `pm2 status`
- **Reiniciar:** `pm2 restart taco-bot`
- **Detener:** `pm2 stop taco-bot`

## 7. Persistencia (Inicio Automático)

Para que el bot se inicie automáticamente si el servidor se reinicia:

1. Genera el script de inicio:
   ```bash
   pm2 startup
   ```
2. Copia y ejecuta el comando que te mostrará la terminal.
3. Guarda la lista de procesos actuales:
   ```bash
   pm2 save
   ```

## 8. Cómo Actualizar el Bot

Cuando lances una nueva versión (ej. de v1.0.0 a v1.1.0), sigue este flujo de trabajo:

### Paso 1: En tu ordenador (Local)
1. Modifica el código y prueba que funcione (`npm run start:test`).
2. Actualiza la versión en `package.json` (opcional).
3. Sube los cambios a GitHub/GitLab:
   ```bash
   git add .
   git commit -m "Actualización: Nueva funcionalidad X"
   git push origin main
   ```

### Paso 2: En el servidor (VPS)

Conéctate por SSH y ejecuta:

1. **Descargar los cambios:**
   ```bash
   cd taco-managment
   git pull
   ```
2. **Actualizar dependencias** (solo si instalaste nuevas librerías):
   ```bash
   npm install --production
   ```
3. **Actualizar comandos** (solo si creaste o modificaste comandos):
   ```bash
   npm run deploy
   ```
4. **Reiniciar el bot** para aplicar los cambios:
   ```bash
   pm2 restart taco-bot
   ```
   *Verifica que todo esté bien con `pm2 logs taco-bot`*

### Método Alternativo: Si subes archivos manualmente (SFTP)
1. Detén el bot: `pm2 stop taco-bot`
2. Sube los nuevos archivos reemplazando los anteriores.
   > **⚠️ ¡CUIDADO!** No sobrescribas la carpeta `data/` (donde está la base de datos) ni el archivo `.env`.
3. Ejecuta `npm install --production` si añadiste dependencias.
4. Ejecuta `npm run deploy` si hay nuevos comandos.
5. Inicia de nuevo: `pm2 start taco-bot`

## 9. Backups Automáticos de la Base de Datos

Desde la versión 1.1.0, el bot realiza **backups automáticos** de la base de datos SQLite:

- **Al arrancar el bot** y **cada 6 horas** mientras está encendido.
- Los backups se guardan en:
  ```
  /taco-managment/data/backups/YYYY-MM-DD.db
  ```
- El sistema elimina automáticamente los backups de más de 7 días para ahorrar espacio.

**No necesitas configurar nada extra:**
- Si restauras el bot en un nuevo servidor, puedes copiar el backup más reciente a `/taco-managment/data/taco.db` para recuperar todos los datos.

---
**¡Listo!** Tu bot TacoManagment está desplegado y funcionando en producción. 🌮🚀
   ```
2. Copia y pega el comando que te muestre la terminal.
3. Guarda la lista de procesos actual:
   ```bash
   pm2 save
   ```

---

¡Listo! Tu bot ahora está operando en la nube 24/7.
