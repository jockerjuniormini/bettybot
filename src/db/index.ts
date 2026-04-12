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
                    let jsonContent = (config.googleCredentialsJson as string).trim();
                    // Eliminar posibles comillas accidentales al principio/final si se pegó mal
                    if (jsonContent.startsWith('"') && jsonContent.endsWith('"')) {
                        jsonContent = jsonContent.substring(1, jsonContent.length - 1);
                    }
                    // Intenta parsear directamente, si falla intenta Base64
                    try {
                        const parsed = JSON.parse(jsonContent);
                        credential = admin.credential.cert(parsed);
                    } catch (jsonErr) {
                        try {
                            const decoded = Buffer.from(jsonContent, 'base64').toString('utf-8');
                            const parsed = JSON.parse(decoded);
                            credential = admin.credential.cert(parsed);
                            console.log('Credenciales de Firebase cargadas correctamente desde Base64.');
                        } catch (b64Err) {
                            console.error('Error: El contenido de GOOGLE_CREDENTIALS_JSON no es un JSON válido ni una cadena Base64 válida.');
                            throw jsonErr; // Lanza el error original de JSON.parse para el log
                        }
                    }
                } catch (e) {
                    console.error('Error al procesar GOOGLE_CREDENTIALS_JSON. Revisa el formato.');
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

export function getDbStatus() {
    return {
        type: useFirebase ? 'Firebase Firestore (Cloud)' : 'SQLite (Local)',
        isConnected: useFirebase ? (!!firestore) : (!!db),
        path: useFirebase ? 'cloud' : config.dbPath
    };
}
