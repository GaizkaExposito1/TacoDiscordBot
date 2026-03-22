# Auditoría de Código y Plan de Mejoras (Actualizado)

## 🟢 Estado Actual de Correcciones y Mejoras
- ✅ **Spam de Errores Globales (`processHandler.js`)**: Solucionado. Prioriza `DEV_LOG_CHANNEL_ID`.
- ✅ **Mutación "ddping" (`commandHandler.js`)**: Solucionado.
- ✅ **Auditoría Modular**: Implementada.
- ✅ **Refactorización de Moderación (`moderation.js`)**: Modularizado en subcomandos.
- ✅ **Transcripts HTML Mejorados**: Implementado con imágenes incrustadas.
- ✅ **Optimización de Base de Datos**:
    - **WAL Mode Activado**: `db.pragma('journal_mode = WAL')` para evitar bloqueos y mejorar concurrencia.
    - **Caché de Configuración**: Implementado `configCache` (Map en memoria) en `database.js` para reducir lecturas a disco drásticamente.

---

## 🔴 Posibles Errores Críticos Restantes

### 1. Falta de Backups Automáticos
**Problema:**
Aunque WAL mejora la estabilidad, si el archivo `taco.db` se corrompe o se borra accidentalmente, no hay recuperación.
**Propuesta:** Un cronjob simple que cada 24h copie el archivo `.db` a una carpeta `/backups/YYYY-MM-DD.db` y borre los antiguos de más de 7 días.

---

## 🟡 Posibles Mejoras de Código (Refactorización)

### 1. Validación Robusta de Tiempos
**Actual:** El regex de `chat-clear` es básico y manual (`if (unit === 's')`).
**Mejora:** Usar librería `ms` para soportar formatos naturales como "1h 30m", "2 days" y simplificar el código.

---

### 2. Validación Robusta de Tiempos
**Actual:** El regex de `chat-clear` es básico y manual (`if (unit === 's')`).
**Mejora:** Usar librería `ms` para soportar formatos naturales como "1h 30m", "2 days" y simplificar el código.

---

## 💡 Nuevas Implementaciones Sugeridas

### 1. Sistema de Backups Automáticos (Crítico para SQLite)
Al ser un archivo local (`taco.db`), si se corrompe o borra, pierdes todo (tickets, configs, logs).
**Propuesta:** Un cronjob simple que cada 24h copie el archivo `.db` a una carpeta `/backups/YYYY-MM-DD.db` y borre los antiguos de más de 7 días.

### 2. Logs de Voz (`VoiceStateUpdate`)
Actualmente no auditas canales de voz.
**Feature:** Registrar acciones vitales para controlar salas públicas:
- Usuario se une/sale de voz.
- Usuario se mueve (drag & drop) o es movido.
- Usuario inicia transmisión (Go Live) o comparte cámara.
- Usuario silenciado/ensordecido (self o server).

### 3. Sistema de "Sticky Messages" (Mensajes Anclados)
Mensajes que se borran y reenvían automáticamente al final del chat para que siempre sean visibles.
**Uso:** Recordatorios de normas en canales de tickets ("No hagas ping al staff") o información vital en canales de bienvenida.

---

## 🛠️ Próximo Plan de Acción

1.  **Activar WAL Mode** en `database.js` para evitar bloqueos y corrupción de DB.
2.  **Implementar Backups** Automáticos (Backups Diarios + al iniciar).
3.  **Implementar Sticky Messages** para recordatorios en tickets.
4.  **Sistema de Logs de Voz** completo.
