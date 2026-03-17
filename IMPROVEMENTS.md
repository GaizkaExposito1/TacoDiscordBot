# Propuestas de Mejora para TacoManagment

Este documento recopila las áreas de mejora identificadas en el análisis del proyecto, clasificadas por prioridad e impacto en la estabilidad y escalabilidad del bot.

## � Completado

### ✅ 1. Migración de Base de Datos (`sql.js` → `better-sqlite3`)
- Migración confirmada.

### ✅ 3. Sistema de Logging Estructurado
- Implementado con **Winston** (existente).

### ✅ 2. Validación Centralizada de Entorno (`src/config/env.js`)
- Implementado con **envalid**.

### ✅ 4. Sistema de Estado Dinámico (Presence)
- Implementado en `src/events/ready.js`:
    - Cambia estado a "En Mantenimiento" en entornos Dev/Test.
    - Estado normal "Watching Tickets" en Producción.

## 🟡 Pendiente (Se necesitan re-aplicar)

### 4. Manejo Global de Errores
- Falta crear `src/handlers/processHandler.js`.
- Falta integrar en `src/client.js`.

### 5. Internacionalización (i18n)
- Falta implementar `i18next`.

### 7. Scripts de Utilidad & Docker
- Falta script de backup.
- Falta script de limpieza.
- Falta Dockerfile.

### 6. TypeScript (Largo Plazo)
- Pendiente.
