#!/usr/bin/env bash
# ==============================================================================
# The Church Tasting Room - Local Backup Decryption Tool
# Decrypts and unpacks a .tar.gz.gpg backup archive downloaded from GitHub Actions
# ==============================================================================

set -euo pipefail

ARCHIVE_FILE="${1:-}"

if [ -z "$ARCHIVE_FILE" ] || [ ! -f "$ARCHIVE_FILE" ]; then
  echo "Uso: ./decrypt-backup.sh <thechurch_backup_YYYY-MM-DD_HHMMSS.tar.gz.gpg> [directorio_destino]"
  exit 1
fi

TIMESTAMP=$(date +%s)
DEST_DIR="${2:-./restored_${TIMESTAMP}}"
mkdir -p "$DEST_DIR"

echo "=========================================="
echo "🔐 Descifrando copia de seguridad: $ARCHIVE_FILE"
echo "=========================================="

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo -n "Introduce la clave de cifrado (BACKUP_ENCRYPTION_KEY): "
  read -s BACKUP_ENCRYPTION_KEY
  echo ""
fi

# Decrypt using GPG and unpack
gpg --decrypt --batch --passphrase "$BACKUP_ENCRYPTION_KEY" "$ARCHIVE_FILE" | tar -xzf - -C "$DEST_DIR"

echo ""
echo "✔ Archivo descifrado y descomprimido correctamente en: $DEST_DIR"
echo ""
echo "Contenido restaurado:"
ls -lh "$DEST_DIR"
echo ""

if [ -f "$DEST_DIR/storage_backup/manifest.json" ]; then
  echo "✔ Manifiesto de Storage detectado. Total de buckets respaldados:"
  cat "$DEST_DIR/storage_backup/manifest.json" | grep '"name"' || true
  echo ""
fi

echo "=========================================="
echo "Instrucciones de Restauración:"
echo "=========================================="
echo "1. Para restaurar la Base de Datos (PostgreSQL):"
echo "   psql \"\$SUPABASE_DB_URL\" < \"$DEST_DIR/database.sql\""
echo ""
echo "2. Para restaurar archivos multimedia (Storage):"
echo "   Revisar \"$DEST_DIR/storage_backup/\" y cotejar con \"manifest.json\""
echo "=========================================="
