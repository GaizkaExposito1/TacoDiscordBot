# 📋 Guía de Configuración de Formularios Dinámicos

Este bot permite personalizar la pregunta que aparece en el formulario (Modal) cuando un usuario abre un ticket. Puedes configurar una pregunta diferente para cada departamento (Soporte, Pagos, Bugs, etc.).

## 🚀 Pasos para configurar un formulario

### 1. Obtener el ID del Departamento
Primero necesitas saber el ID del departamento al que quieres cambiarle la pregunta.
ejecuta el comando:
```
/config ver
```
Verás una lista de departamentos con sus IDs, por ejemplo:
> 🛒 **Ventas** (ID: 1)
> 🛠️ **Soporte** (ID: 2)

### 2. Configurar la Pregunta
Usa el comando `/config departamento-formulario` para establecer la pregunta personalizada.

**Parámetros:**
- `id`: El número del departamento (obtenido en el paso 1).
- `pregunta`: La etiqueta que aparecerá encima del campo de texto (Máx 45 caracteres).
- `placeholder`: (Opcional) Texto de ejemplo gris dentro del cuadro.
- `multilinea`: (Opcional) `True` para texto largo (párrafo), `False` para una sola línea (nombre de usuario, ID, etc.).

#### Ejemplos:

**Para un departamento de Minecraft (pedir usuario):**
```
/config departamento-formulario id:1 pregunta:¿Cuál es tu usuario de Minecraft? placeholder:Ej: Steve multilinea:False
```

**Para un departamento de Pagos (pedir ID de transacción):**
```
/config departamento-formulario id:2 pregunta:ID de Transacción / Comprobante placeholder:Copia y pega el ID aquí multilinea:False
```

**Para un departamento de Reportes (descripción detallada):**
```
/config departamento-formulario id:3 pregunta:Describe el bug detalladamente placeholder:Qué hacías cuando ocurrió... multilinea:True
```

### 3. Verificar
1. Ve al canal donde está el panel de tickets.
2. Selecciona el departamento que acabas de configurar.
3. Se abrirá una ventana modal con tu nueva pregunta.

---

## ⚠️ Notas Importantes
- Si no configuras nada, el formulario usará los valores por defecto ("¿Cuál es el motivo de tu ticket?").
- La pregunta no puede superar los **45 caracteres** (limitación de Discord).
- Si eliminas un departamento y creas uno nuevo, tendrás que configurarlo nuevamente.
