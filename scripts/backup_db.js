const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_FILE = 'taco.db';
const MAX_BACKUP_DAYS = 5;

// Asegurar que existe el directorio de backups
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `taco_${timestamp}.db`;
    const sourcePath = path.join(DATA_DIR, DB_FILE);
    const destPath = path.join(BACKUP_DIR, backupFile);

    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ No se encontró la base de datos en: ${sourcePath}`);
        process.exit(1);
    }

    try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Backup creado exitosamente: ${backupFile}`);
        cleanOldBackups();
    } catch (err) {
        console.error('❌ Error al crear backup:', err.message);
        process.exit(1);
    }
}

function cleanOldBackups() {
    try {
        const now = Date.now();
        const maxAgeMs = MAX_BACKUP_DAYS * 24 * 60 * 60 * 1000;
        
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .map(f => {
                const filePath = path.join(BACKUP_DIR, f);
                const stats = fs.statSync(filePath);
                return {
                    name: f,
                    path: filePath,
                    time: stats.mtime.getTime()
                };
            });

        // Eliminar archivos más viejos de 5 días
        files.forEach(file => {
            if (now - file.time > maxAgeMs) {
                fs.unlinkSync(file.path);
                console.log(`🗑️ Eliminado backup antiguo (>5 días): ${file.name}`);
            }
        });

    } catch (err) {
        console.warn('⚠️ No se pudieron limpiar backups antiguos:', err.message);
    }
}

createBackup();
