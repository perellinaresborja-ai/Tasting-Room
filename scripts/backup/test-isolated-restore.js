/**
 * Isolated Dry-Run Restoration Test Script
 * The Church Tasting Room - Backup Hardening Validation
 * 
 * Tests the complete backup, encryption, decryption, and integrity verification pipeline
 * completely offline in an isolated temporary sandbox.
 * DOES NOT touch production database, network, or real user data.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');

const SANDBOX_DIR = path.resolve(__dirname, 'sandbox_test_restore');
const TEST_PASSPHRASE = 'IsolatedTestPassphrase123456789!#$';

function findGpgExecutable() {
  // Check PATH first
  try {
    execSync('gpg --version', { stdio: 'ignore' });
    return 'gpg';
  } catch (e) {
    // Check standard Git for Windows path
    const gitGpg = 'C:\\Program Files\\Git\\usr\\bin\\gpg.exe';
    if (fs.existsSync(gitGpg)) {
      return gitGpg;
    }
  }
  return null;
}

function calculateSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function runIsolatedTest() {
  console.log('====================================================');
  console.log('🧪 THE CHURCH TASTING ROOM - ISOLATED RESTORATION TEST');
  console.log('====================================================\n');

  // Clean previous run if any
  if (fs.existsSync(SANDBOX_DIR)) {
    fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });

  const gpgBin = findGpgExecutable();
  console.log(`[1/7] GPG Tool Detection: ${gpgBin ? `FOUND (${gpgBin})` : 'NOT FOUND'}`);
  if (!gpgBin) {
    throw new Error('GPG executable not found in system or Git directories.');
  }

  // 1. Generate Synthetic Database SQL Dump (Public, Auth, Storage)
  console.log('[2/7] Generating synthetic database schema and data...');
  const mockSql = `
-- Synthetic SQL Dump for The Church Tasting Room Backup Verification
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS storage;

-- Mock Auth Users
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO auth.users (id, email, encrypted_password)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'test-admin@tastingroom.es', '$2a$10$syntheticHashAdminTest01'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'test-client@example.com', '$2a$10$syntheticHashClientTest02');

-- Mock Public Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  role TEXT DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.profiles (id, full_name, role)
VALUES 
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Borja Test Admin', 'admin'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'Alice Test Customer', 'client');

-- Mock Tastings
CREATE TABLE public.tastings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INT NOT NULL,
  available_seats INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'active'
);

INSERT INTO public.tastings (title, date, start_time, end_time, capacity, available_seats, price, status)
VALUES 
  ('{"es": "Cata Gran Reserva", "en": "Gran Reserva Tasting"}', '2026-11-15', '20:00:00', '22:00:00', 16, 8, 45.00, 'active');

-- Mock Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tasting_id UUID REFERENCES public.tastings(id),
  customer_email TEXT,
  seats INT,
  total_amount NUMERIC(10,2),
  status TEXT DEFAULT 'confirmed'
);

-- Mock Communications
CREATE TABLE public.communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  dispatch_status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
  `.trim();

  const sourceWorkdir = path.join(SANDBOX_DIR, 'source_backup');
  fs.mkdirSync(sourceWorkdir, { recursive: true });
  fs.writeFileSync(path.join(sourceWorkdir, 'database.sql'), mockSql, 'utf8');

  // 2. Generate Synthetic Storage Files and Manifest
  console.log('[3/7] Generating synthetic storage assets & SHA-256 manifest...');
  const storageDir = path.join(sourceWorkdir, 'storage_backup', 'tastings');
  fs.mkdirSync(storageDir, { recursive: true });

  const mockFile1 = Buffer.from('MOCK_IMAGE_JPEG_HEADER_THE_CHURCH_COVER_DATA_123456');
  const mockFile2 = Buffer.from('MOCK_IMAGE_PNG_HEADER_THE_CHURCH_GALLERY_DATA_789012');

  fs.writeFileSync(path.join(storageDir, 'sample-cata-cover.jpg'), mockFile1);
  fs.writeFileSync(path.join(storageDir, 'sample-wine-glass.png'), mockFile2);

  const manifest = {
    backupDate: new Date().toISOString(),
    totalBuckets: 1,
    buckets: [
      {
        name: 'tastings',
        public: true,
        fileCount: 2,
        files: [
          {
            path: 'sample-cata-cover.jpg',
            sizeBytes: mockFile1.length,
            sha256: calculateSha256(mockFile1),
            contentType: 'image/jpeg'
          },
          {
            path: 'sample-wine-glass.png',
            sizeBytes: mockFile2.length,
            sha256: calculateSha256(mockFile2),
            contentType: 'image/png'
          }
        ]
      }
    ]
  };

  fs.writeFileSync(
    path.join(sourceWorkdir, 'storage_backup', 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // 3. Compress into TAR.GZ
  console.log('[4/7] Packaging into unencrypted TAR archive...');
  const unencryptedTar = path.join(SANDBOX_DIR, 'unencrypted.tar.gz');
  // Use tar command (cross-platform with Windows tar or Git tar)
  execSync(`tar -czf "${unencryptedTar}" -C "${sourceWorkdir}" database.sql storage_backup`);
  const rawSha256 = calculateSha256(fs.readFileSync(unencryptedTar));
  console.log(`   Pre-encryption archive SHA-256: ${rawSha256}`);

  // 4. Encrypt with GPG (AES256)
  console.log('[5/7] Encrypting archive with GPG AES-256 (Hardened S2K)...');
  const encryptedArchive = path.join(SANDBOX_DIR, 'backup_encrypted.tar.gz.gpg');
  execFileSync(gpgBin, [
    '--symmetric',
    '--cipher-algo', 'AES256',
    '--digest-algo', 'SHA512',
    '--s2k-mode', '3',
    '--s2k-count', '65011712',
    '--s2k-digest-algo', 'SHA512',
    '--batch',
    '--passphrase', TEST_PASSPHRASE,
    '-o', encryptedArchive,
    unencryptedTar
  ]);
  console.log(`   Encrypted file size: ${fs.statSync(encryptedArchive).size} bytes`);

  // Verify wrong passphrase failure test (Fail-Safe verification)
  console.log('   Testing fail-safe behavior with invalid passphrase...');
  let failedAsExpected = false;
  try {
    execFileSync(gpgBin, [
      '--decrypt',
      '--batch',
      '--passphrase', 'IncorrectPassphraseTest',
      encryptedArchive
    ], { stdio: 'pipe' });
  } catch (err) {
    failedAsExpected = true;
  }
  if (!failedAsExpected) {
    throw new Error('FAIL: GPG decrypted archive with an invalid passphrase!');
  }
  console.log('   ✔ Correctly rejected unauthorized decryption attempt.');

  // 5. Decrypt and Unpack to Clean Destination
  console.log('[6/7] Decrypting archive and restoring content to isolated destination...');
  const restoreDir = path.join(SANDBOX_DIR, 'restored_target');
  fs.mkdirSync(restoreDir, { recursive: true });

  const decryptedTar = path.join(SANDBOX_DIR, 'decrypted.tar.gz');
  execFileSync(gpgBin, [
    '--decrypt',
    '--batch',
    '--passphrase', TEST_PASSPHRASE,
    '-o', decryptedTar,
    encryptedArchive
  ]);

  const decryptedSha256 = calculateSha256(fs.readFileSync(decryptedTar));
  if (decryptedSha256 !== rawSha256) {
    throw new Error(`Checksum mismatch between original tar (${rawSha256}) and decrypted tar (${decryptedSha256})`);
  }
  console.log('   ✔ Cryptographic archive match verified (Decrypted SHA-256 matches pre-encryption SHA-256).');

  execSync(`tar -xzf "${decryptedTar}" -C "${restoreDir}"`);

  // 6. Verify Restored Files and Data Integrity
  console.log('[7/7] Validating restored SQL and Storage asset checksums...');
  const restoredSql = fs.readFileSync(path.join(restoreDir, 'database.sql'), 'utf8');
  if (!restoredSql.includes('auth.users') || !restoredSql.includes('public.tastings')) {
    throw new Error('Restored database.sql is missing essential schemas.');
  }

  const restoredManifest = JSON.parse(
    fs.readFileSync(path.join(restoreDir, 'storage_backup', 'manifest.json'), 'utf8')
  );

  for (const bucket of restoredManifest.buckets) {
    for (const file of bucket.files) {
      const restoredFilePath = path.join(restoreDir, 'storage_backup', bucket.name, file.path);
      if (!fs.existsSync(restoredFilePath)) {
        throw new Error(`Restored storage file not found: ${restoredFilePath}`);
      }
      const restoredFileHash = calculateSha256(fs.readFileSync(restoredFilePath));
      if (restoredFileHash !== file.sha256) {
        throw new Error(`Hash mismatch for ${file.path}: expected ${file.sha256}, got ${restoredFileHash}`);
      }
      console.log(`   ✔ Restored asset [${restoredFileHash.substring(0, 8)}] ${file.path} verified.`);
    }
  }

  // Clean-up sandbox
  fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
  console.log('\n✔ Sandbox cleaned up.');
  console.log('\n====================================================');
  console.log('🎉 ALL ISOLATED RESTORATION CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runIsolatedTest().catch(err => {
  console.error('\n❌ ISOLATED TEST FAILED:', err);
  if (fs.existsSync(SANDBOX_DIR)) {
    fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
  }
  process.exit(1);
});
