# 🤖 Documentación Oficial del Bot

Este bot de Discord es un sistema avanzado de gestión de tickets, diseñado para ser modular y configurable.

## 🛠️ Comandos Disponibles

### ⚙️ Configuración (`/config`)
Comando principal para configurar el sistema. Requiere permisos de Administrador.

- **/config roles staff [role]**: Asigna el rol que podrá ver y gestionar los tickets.
- **/config roles admin [role]**: Asigna el rol de super-administrador.
- **/config logs [canal]**: Establece dónde se enviarán los registros de auditoría generales.
- **/config transcripciones [canal]**: Establece un canal exclusivo para guardar las transcripciones HTML de los tickets cerrados.
- **/config tickets categoria [id]**: Define en qué categoría de Discord se crearán los tickets nuevos.
- **/config tickets limite [numero]**: Establece el máximo de tickets simultáneos por usuario.
- **/config departamentos agregar [nombre] [emoji] [descripcion]**: Crea un nuevo departamento.
- **/config departamentos eliminar [id]**: Elimina un departamento existente.
- **/config departamento-formulario [id] [pregunta] [placeholder] [multilinea]**: Personaliza la pregunta del formulario para un departamento específico.
- **/config ver**: Muestra la configuración actual y la lista de departamentos.

### 📩 Configuración del Panel (`/setup-tickets`)
Requiere permisos de Administrador.
- **/setup-tickets**: Envía el panel de creación al canal actual. Este panel incluye un **menú desplegable** con los departamentos configurados.

### 🎫 Gestión de Tickets (`/ticket`)
Comandos para gestionar usuarios dentro de un ticket activo. Solo funciona dentro de canales de ticket.

- **/ticket add [usuario]**: Añade a un usuario o staff al ticket actual (le da permisos de ver y enviar mensajes).
- **/ticket remove [usuario]**: Elimina a un usuario del ticket actual.

> **Nota:** El comando `/close` ha sido eliminado en favor del botón "Cerrar Ticket" dentro del canal.

---

## 🚦 Flujo de Gestión de Tickets

1. **Creación**:
   El usuario selecciona una categoría en el **menú desplegable** -> Rellena el Formulario (Modal) -> Se crea el canal `ticket-####`.
   - **Estado:** Abierto
   - **Visibilidad:** Usuario creador + Rol Staff + Rol Admin.
   - **Mensaje:** "Reclamado por: Nadie".

2. **Reclamación (Claim)**:
   Un miembro del staff pulsa el botón **"✋ Reclamar Ticket"**.
   - **Acción:**
     - El **Rol de Staff (Global)** pierde el acceso al canal (para limpiar su lista de canales).
     - El staff que reclamó obtiene acceso individual.
     - El usuario creador y los Admins mantienen acceso.
   - **Mensaje:** Se actualiza el embed principal a "Reclamado por: @Staff" y cambia a color Naranja. Se envía un aviso en el chat.

3. **Gestión de Participantes**:
   El staff encargado puede usar `/ticket add @usuario` para invitar a otros miembros del equipo o usuarios al ticket si necesita ayuda específica, sin tener que liberar el ticket para todos.

4. **Liberación (Unclaim)**:
   El staff encargado (o un admin) pulsa **"🔓 Liberar Ticket"**.
   - **Acción:** El **Rol de Staff (Global)** recupera el acceso al canal.
   - **Mensaje:** Se actualiza a "Reclamado por: Nadie" y color Verde. Se envía un aviso en el chat.

5. **Cierre**:
   Cualquiera con permisos pulsa **"🔒 Cerrar Ticket"**.
   - **Acción:**
     - Se genera una transcripción (HTML).
     - Se envía al DM del usuario.
     - Se envía al **Canal de Transcripciones** (si está configurado) o al de Logs.
     - El ticket se elimina tras 5 segundos.

---

## 📂 Estructura de Base de Datos
El bot utiliza SQLite (`data/taco.db`).

- **guild_config**: Configuración general (roles, canales, límites).
- **departments**: Departamentos activos y su configuración de formulario (`form_json`).
- **tickets**: Registro de tickets creados, usuarios, estado y staff asignado.
