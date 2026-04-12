import Database, { Database as SQLiteDatabase } from 'better-sqlite3';
import { config } from '../config/env.js';
import fs from 'fs';
import admin from 'firebase-admin';

let db: SQLiteDatabase | null = null;
let firestore: admin.firestore.Firestore | null = null;

const hasFirebaseFile = config.googleCredentials && fs.existsSync(config.googleCredentials);
const hasFirebaseJson = !!config.googleCredentialsJson;
const useFirebase = hasFirebaseFile || hasFirebaseJson;

export async function initDb() {
    if (useFirebase) {
        if (!admin.apps.length) {
            let credential;
            if (hasFirebaseJson) {
                try {
                    const parsed = JSON.parse(config.googleCredentialsJson as string);
                    credential = admin.credential.cert(parsed);
                } catch (e) {
                    console.error('Error al parsear GOOGLE_CREDENTIALS_JSON. Asegúrate de que sea un JSON válido.');
                    throw e;
                }
            } else {
                credential = admin.credential.cert(config.googleCredentials as string);
            }
            
            admin.initializeApp({ credential });
            firestore = admin.firestore();
            console.log('Firebase conectado. Usando la nube (Firestore) para la memoria.');
        }
    } else {
        if (!db) {
            db = new Database(config.dbPath);
            db.exec(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('Memoria local lista (SQLite). Archivo service-account.json no encontrado para Firebase.');
        }
    }
}

export async function saveMessage(userId: number, role: string, content: string) {
    if (useFirebase && firestore) {
        await firestore.collection('users').doc(userId.toString())
            .collection('messages').add({
                role,
                content,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
    } else if (db) {
        const stmt = db.prepare('INSERT INTO messages (userId, role, content) VALUES (?, ?, ?)');
        stmt.run(userId, role, content);
    }
}

export async function getHistory(userId: number, limit: number = 30) {
    if (useFirebase && firestore) {
        const snapshot = await firestore.collection('users').doc(userId.toString())
            .collection('messages')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
            
        const rows = snapshot.docs.map(doc => {
            const data = doc.data();
            return { role: data.role as string, content: data.content as string };
        });
        return rows.reverse();
    } else if (db) {
        const stmt = db.prepare('SELECT role, content FROM messages WHERE userId = ? ORDER BY timestamp DESC LIMIT ?');
        const rows = stmt.all(userId, limit) as { role: string; content: string }[];
        return rows.reverse();
    }
    return [];
}

export async function clearHistory(userId: number) {
    if (useFirebase && firestore) {
        const batch = firestore.batch();
        const snapshot = await firestore.collection('users').doc(userId.toString()).collection('messages').get();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
    } else if (db) {
        const stmt = db.prepare('DELETE FROM messages WHERE userId = ?');
        stmt.run(userId);
    }
}
