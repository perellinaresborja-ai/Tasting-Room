# Manual de Recuperación ante Desastres (Disaster Recovery)
### The Church Tasting Room

Este documento define el procedimiento técnico para recuperar la base de datos, las cuentas de usuario, el almacenamiento multimedia y la configuración operativa del sistema a partir de las copias de seguridad generadas por GitHub Actions.

---

## 1. Parámetros Operativos y Objetivos Reales

* **Modo Actual de Ejecución:** Manual bajo demanda mediante `workflow_dispatch` (el cron programado se reactivará tras la primera prueba exitosa).
* **RPO (Recovery Point Objective):** Máximo 24 horas en régimen diario automático, o minutos si se ejecuta manualmente antes de una intervención sensible.
* **RTO (Recovery Time Objective):** Estimado de **10 a 30 minutos** para una recuperación integral (descarga, descifrado, importación SQL, verificación y reconexión).
* **Retención de copias:** 30 días en GitHub Actions con rotación y borrado automático sin coste.

---

## 2. Requisitos Previos para el Operador

Para ejecutar una restauración se requiere:
1. **GnuPG (`gpg`):** En Linux/macOS viene integrado. En Windows se puede utilizar Git Bash (`"C:\Program Files\Git\usr\bin\gpg.exe"`) o Gpg4win.
2. **Cliente PostgreSQL (`psql`):** Versión 15, 16 o 17.
3. **Clave de cifrado:** El valor configurado en el secreto `BACKUP_ENCRYPTION_KEY`.
4. **Cadena de conexión a PostgreSQL:** Debe utilizar obligatoriamente el **puerto 5432** (conexión directa o *Session pooler*). **NUNCA utilizar el puerto 6543** (*Transaction pooler*), ya que no admite transacciones de sesión ni importaciones masivas.

---

## 3. Procedimiento de Descarga y Descifrado

1. Acceder a GitHub Actions en el repositorio:
   👉 `https://github.com/perellinaresborja-ai/Tasting-Room/actions/workflows/backup.yml`
2. Seleccionar la última ejecución exitosa del flujo **Automated Encrypted Backup**.
3. En la sección inferior **Artifacts**, descargar el archivo:
   `thechurch_backup_YYYY-MM-DD_HHMMSS.tar.gz.gpg`
4. Descifrar el archivo en un entorno seguro:

```bash
# Opción A: Mediante el script automatizado
chmod +x scripts/backup/decrypt-backup.sh
export BACKUP_ENCRYPTION_KEY="tu-clave-secreta"
./scripts/backup/decrypt-backup.sh thechurch_backup_2026-11-02_030000.tar.gz.gpg

# Opción B: Mediante comando GPG estándar
gpg --decrypt --batch --passphrase "tu-clave-secreta" thechurch_backup_2026-11-02_030000.tar.gz.gpg | tar -xzf -
```

El contenido descomprimido se compone de:
* `database.sql`: Archivo SQL unificado y no destructivo:
  - Carga primero los registros de usuarios y credenciales en `auth.users` y `auth.identities` (en modo datos, sin alterar el esquema interno de autenticación de Supabase).
  - Recrea y carga el esquema `public` con todas las tablas de negocio, secuencias y claves foráneas.
* `storage_backup/`: Árbol de carpetas con los archivos multimedia reales y un archivo `manifest.json` con los hashes criptográficos SHA-256 de cada archivo.

---

## 4. Restauración de la Base de Datos (PostgreSQL)

### Caso 1: Restauración sobre la misma instancia de Supabase (Corrupción lógica o borrado accidental)
Si el proyecto de Supabase sigue existiendo pero se requiere recuperar un estado anterior:

```bash
# 1. Configurar la URL con puerto 5432
export SUPABASE_DB_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# 2. Restaurar el archivo SQL
psql "$SUPABASE_DB_URL" < database.sql
```

> [!NOTE]
> La sección del esquema `public` contiene instrucciones `--clean --if-exists`, lo que recreará las tablas de la aplicación respetando la integridad referencial.

### Caso 2: Restauración en una nueva instancia de Supabase (Desastre total o migración)
Si el proyecto anterior ya no existe o se crea un nuevo proyecto desde cero:

1. Crear el nuevo proyecto en Supabase (región *Frankfurt / eu-central-1* recomendada).
2. Aplicar las migraciones estructurales versionadas en el repositorio para preparar extensiones, roles y funciones:
   ```bash
   npx supabase link --project-ref nuevo-project-ref
   npx supabase db push
   ```
3. Importar los datos y cuentas de usuario desde `database.sql`:
   ```bash
   psql "$NUEVA_SUPABASE_DB_URL" < database.sql
   ```
   **Garantía de No Destrucción:**
   - No se destruye ni sobrescribe el esquema interno de Supabase Auth ni sus triggers del sistema.
   - No se alteran los roles internos del sistema (`anon`, `authenticated`, `service_role`, `supabase_admin`).
   - Los perfiles de `public.profiles` encuentran inmediatamente su `auth.users(id)` correspondiente.
   - Se restauran catas, reservas, comprobantes de pago de Stripe, tokens de pases QR, historial de check-ins y registros de comunicaciones.

---

## 5. Restauración de Almacenamiento (Supabase Storage)

1. En el nuevo proyecto de Supabase, asegurarse de que existen los buckets declarados en `storage_backup/manifest.json` (por ejemplo, `tastings`).
2. Marcar la visibilidad pública o privada correspondiente según lo especificado en el manifiesto.
3. Subir los archivos respaldados a sus respectivas carpetas y verificar que sus sumas SHA-256 coincidan con las registradas en `manifest.json`.
4. Las URLs de las imágenes almacenadas en la base de datos conservan sus nombres exactos y rutas UUID originales.

---

## 6. Reconexión de Vercel y Producción

Si la restauración se llevó a cabo en una nueva base de datos o instancia de Supabase:

1. Acceder al panel de Vercel:
   👉 **Project Settings -> Environment Variables**.
2. Actualizar las variables de conexión con los valores de la nueva instancia:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
3. Si cambió la base de datos:
   * Actualizar `SUPABASE_DB_URL` en los secretos de GitHub Actions si procede.
4. Desplegar un *Redeploy* en Vercel seleccionando la opción **Redeploy without cache**.

---

## 7. Protocolo de Validación y Certificación Post-Restauración

Comprobar metódicamente los siguientes 6 puntos antes de declarar restaurado el servicio:

1. **Catas y Portada:** Cargar `https://www.tastingroom.es/es` y `/en`, verificando que se listan las catas futuras y que las pasadas figuran en *Recuerdos*.
2. **Acceso Administrativo:** Iniciar sesión con una cuenta administradora en `/es/admin` para validar la autenticación de `auth.users` y el rol en `public.profiles`.
3. **Plazas y Reservas:** Abrir una cata en el panel de administración y comprobar que el aforo ocupado y las reservas existentes están íntegros.
4. **Validación de Pases QR:** Desde `/es/scanner`, comprobar que el escáner y la función RPC `record_partial_checkin` responden sin error.
5. **Módulo de Comunicaciones:** Verificar en el panel admin que las campañas históricas, destinatarios y bloqueos de despacho reflejan el estado correcto.
6. **Integridad de Imágenes:** Comprobar que los carteles y portadas de catas cargan con normalidad desde el bucket de Storage.
