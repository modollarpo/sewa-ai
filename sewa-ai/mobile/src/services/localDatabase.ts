// SEWA AI — mobile/src/services/localDatabase.ts
// Offline-first SQLite database for scans and findings in low-bandwidth areas
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'sewa_offline.db', location: 'default' });

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      patientId TEXT,
      patientName TEXT,
      modality TEXT,
      status TEXT,
      urgency TEXT,
      findings TEXT,
      createdAt TEXT,
      synced INTEGER DEFAULT 1
    );
  `);

  return db;
}

export async function saveScanLocally(scan: any, synced: boolean = true) {
  const database = await getDb();
  await database.executeSql(
    `INSERT OR REPLACE INTO scans (id, patientId, patientName, modality, status, urgency, findings, createdAt, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scan.id,
      scan.patientId,
      scan.patientName,
      scan.modality,
      scan.status,
      scan.urgency,
      JSON.stringify(scan.findings || []),
      scan.createdAt,
      synced ? 1 : 0
    ]
  );
}

export async function getOfflineScans() {
  const database = await getDb();
  const [results] = await database.executeSql('SELECT * FROM scans ORDER BY createdAt DESC');
  
  const scans = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    scans.push({
      ...row,
      findings: JSON.parse(row.findings),
      synced: row.synced === 1
    });
  }
  return scans;
}

export async function getUnsyncedScans() {
  const database = await getDb();
  const [results] = await database.executeSql('SELECT * FROM scans WHERE synced = 0');
  
  const scans = [];
  for (let i = 0; i < results.rows.length; i++) {
    const row = results.rows.item(i);
    scans.push({
      ...row,
      findings: JSON.parse(row.findings),
      synced: false
    });
  }
  return scans;
}

export async function markScanAsSynced(id: string) {
  const database = await getDb();
  await database.executeSql('UPDATE scans SET synced = 1 WHERE id = ?', [id]);
}
