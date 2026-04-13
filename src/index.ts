import { Bot, InputFile } from 'grammy';
import axios from 'axios';
import { config } from './config/env.js';
import { initDb, clearHistory, getDbStatus } from './db/index.js';
import { processUserMessage } from './agent/index.js';
import { transcribeAudio } from './llm/index.js';
import { generateSpeech } from './llm/tts.js';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import http from 'http';
import os from 'os';

// 0. Health Check Server for Anti-Sleep (Render/Koyeb)
const port = parseInt(process.env.PORT || '8080', 10);
console.log('--- INICIO DE ARRANQUE DE BETTY ---'); // v1.2.1 stability fix active
console.log(`PASO 0: Iniciando servidor de pulso en puerto ${port}...`);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Betty is alive! 🤖');
    res.end();
}).listen(port, '0.0.0.0', () => {
    console.log(`✅ Servidor de pulso escuchando en 0.0.0.0:${port}.`);
});

// 1. Initialize SQLite/Firebase Database
console.log('PASO 1: Inicializando Base de Datos (Firebase/SQLite)...');
await initDb();
console.log('✅ Base de Datos inicializada correctamente.');

// 2. Initialize Telegram Bot
const bot = new Bot(config.telegramBotToken);

// 3. Security Middleware: Whitelist Check
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (!userId || !config.telegramAllowedUserIds.includes(userId)) {
        console.warn(`[Security] Unauthorized access attempt from User ID: ${userId}`);
        // We do not respond to unauthorized users to avoid leakage
        return;
    }
    await next();
});

// 4. Command Handlers
bot.command('start', async (ctx) => {
    const userId = ctx.from!.id;
    await ctx.reply("Hello! I'm Betty, your personal AI agent running locally. How can I help you today?");
});

bot.command('clear', async (ctx) => {
    const userId = ctx.from!.id;
    await clearHistory(userId);
    await ctx.reply("Mi memoria sobre nuestra conversación ha sido borrada.");
});

bot.command('status', async (ctx) => {
    const userId = ctx.from!.id;
    const dbStatus = getDbStatus();
    const uptime = Math.floor(process.uptime());
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const statusMsg = `
🤖 *Betty Status Report*
--------------------------
✅ *Estado:* Operativa
🕒 *Uptime:* ${hours}h ${minutes}m
📦 *Entorno:* ${process.env.NODE_ENV || 'development'}
🖥️ *Host:* ${os.hostname()} (${os.platform()})
🗄️ *Base de Datos:* ${dbStatus.type}
📡 *Conexión DB:* ${dbStatus.isConnected ? 'Conectado ✅' : 'Error ❌'}
🎙️ *TTS:* ${config.elevenLabsApiKey ? 'Activo ✅' : 'Inactivo ❌'}
🧠 *Model:* ${config.openrouterModel || 'Llama-3.1-70B'}
--------------------------
ID Usuario: \`${userId}\`
    `;
    await ctx.reply(statusMsg, { parse_mode: 'Markdown' });
});

// 4.5 Helper function to handle audio
async function handleAudioMessage(ctx: any) {
    const userId = ctx.from.id;
    const voice = ctx.message.voice || ctx.message.audio;

    if (!voice) return;

    await ctx.replyWithChatAction('typing');

    try {
        // 1. Get file link from Telegram
        const file = await ctx.getFile();
        const url = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;

        // 2. Download to local disk
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const filePath = path.join(tempDir, `${file.file_id}.ogg`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al descargar el audio de Telegram');
        
        const fileStream = fs.createWriteStream(filePath);
        await pipeline(Readable.fromWeb(response.body as any), fileStream);

        // 3. Transcribe with Groq Whisper
        const text = await transcribeAudio(filePath);
        
        // 4. Clean up file
        fs.unlinkSync(filePath);

        if (!text || text.trim().length === 0) {
            await ctx.reply("He recibido tu audio, pero no he podido entender nada de lo que has dicho.");
            return;
        }

        console.log(`[Audio] Transcripción para ${userId}: ${text}`);
        
        // Optional: Inform the user what we understood
        // await ctx.reply(`_He entendido:_ "${text}"`, { parse_mode: 'Markdown' });

        // 5. Process as normal message
        const userName = ctx.from.first_name || 'Usuario';
        const role = config.telegramAdminIds.includes(userId.toString()) ? 'admin' : 'vip';
        const rawReply = await processUserMessage(userId, userName, role, text);
        
        // 6. Generate Voice Response (optional but recommended if ELEVENLABS_API_KEY is present)
        if (config.elevenLabsApiKey) {
            try {
                // Clean description for TTS
                let cleanReply = rawReply;
                if (rawReply.includes('IMAGEN_GENERADA:')) cleanReply = rawReply.split('IMAGEN_GENERADA:')[0].trim();
                else if (rawReply.includes('VIDEO_GENERADO:')) cleanReply = rawReply.split('VIDEO_GENERADO:')[0].trim();

                const responseAudioPath = path.join(tempDir, `reply_${file.file_id}.mp3`);
                await generateSpeech(cleanReply || "Aquí lo tienes.", responseAudioPath);
                
                await ctx.replyWithVoice(new InputFile(responseAudioPath));
                
                // Clean up response audio
                fs.unlinkSync(responseAudioPath);

                // Enviar el medio después de la voz si existe
                if (rawReply.includes('IMAGEN_GENERADA:') || rawReply.includes('VIDEO_GENERADO:')) {
                    await sendResponseWithMedia(ctx, rawReply);
                }
            } catch (ttsError: any) {
                console.error('Error generando voz:', ttsError);
                await sendResponseWithMedia(ctx, rawReply);
            }
        } else {
            await sendResponseWithMedia(ctx, rawReply);
        }

    } catch (error: any) {
        console.error('Error procesando audio:', error);
        await ctx.reply(`Lo siento, he tenido un problema al procesar tu audio: ${error.message}`);
    }
}

bot.on('message:voice', handleAudioMessage);
bot.on('message:audio', handleAudioMessage);

// Helper para descargar imágenes/vídeos y convertirlos en Buffer para Telegram
async function downloadMedia(url: string): Promise<Buffer | null> {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 15000 // Timeout de 15 segundos
        });
        return Buffer.from(response.data);
    } catch (err) {
        console.error(`Error descargando medio desde ${url}:`, err);
        return null;
    }
}

// 4.6 Helper to send response (handling text + possible media)
async function sendResponseWithMedia(ctx: any, response: string) {
    let cleanText = response;

    // Regex ultra-permisiva para detectar URLs de Pollinations o marcadores
    const imageRegex = /(?:IMAGEN_GENERADA:?\s*|https:\/\/pollinations\.ai\/p\/)(https?:\/\/[^\s|]+)/gi;
    const videoRegex = /(?:VIDEO_GENERADO:?\s*)(https?:\/\/[^\s|]+)/gi;

    const imageMatches = [...response.matchAll(imageRegex)];
    const videoMatches = [...response.matchAll(videoRegex)];

    // Limpieza agresiva de texto
    cleanText = cleanText.replace(/IMAGEN_GENERADA:[^|\n]+(\|[^|\n]*)?/gi, '');
    cleanText = cleanText.replace(/VIDEO_GENERADO:[^|\n]+(\|[^|\n]*)?/gi, '');
    cleanText = cleanText.replace(/\[V\d+\][^\n]+/g, '');
    cleanText = cleanText.trim();

    if (cleanText) {
        await ctx.reply(cleanText);
    }

    // Enviar Imágenes como Álbum (Media Group) si hay más de una
    if (imageMatches.length > 0) {
        await ctx.replyWithChatAction('upload_photo');
        try {
            const mediaGroup: any[] = [];
            for (const match of imageMatches) {
                const buffer = await downloadMedia(match[1]);
                if (buffer) {
                    mediaGroup.push({
                        type: 'photo' as const,
                        media: new InputFile(buffer)
                    });
                }
            }

            if (mediaGroup.length === 1) {
                await ctx.replyWithPhoto(mediaGroup[0].media);
            } else if (mediaGroup.length > 1) {
                await ctx.replyWithMediaGroup(mediaGroup);
            } else {
                throw new Error("No se pudo descargar ninguna imagen.");
            }
        } catch (err) {
            console.error('Error enviando álbum/foto:', err);
            await ctx.reply('⚠️ Betty intentó enviarte las fotos, pero Telegram rechazó los enlaces. Probablemente el servidor de imágenes está saturado. Inténtalo de nuevo en unos segundos.');
        }
    }

    // Enviar Vídeos individualmente
    for (const match of videoMatches) {
        const buffer = await downloadMedia(match[1]);
        if (buffer) {
            try {
                await ctx.replyWithVideo(new InputFile(buffer));
            } catch (err) {
                console.error(`Error enviando vídeo:`, err);
            }
        }
    }

    return cleanText;
}

// 5. Message Handler
bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    console.log(`[Text] Recibido mensaje de ${userId}: "${userMessage}"`);

    // Send typing indicator
    await ctx.replyWithChatAction('typing');

    try {
        const userName = ctx.from.first_name || 'Usuario';
        const role = config.telegramAdminIds.includes(userId.toString()) ? 'admin' : 'vip';
        console.log(`[Agent] Procesando como rol: ${role} para el usuario: ${userName}`);
        
        let response = await processUserMessage(userId, userName, role, userMessage);
        
        console.log(`[Agent] Enviando respuesta a ${userId}`);
        await sendResponseWithMedia(ctx, response);
    } catch (error: any) {
        console.error('Error processing message:', error);
        await ctx.reply(`Sorry, I encountered an error: ${error.message}`);
    }
});

// 6. Start the Bot (Long Polling)
bot.start({
    onStart: (botInfo) => {
        console.log(`Betty bot (@${botInfo.username}) started successfully.`);
        console.log(`Allowed Users: ${config.telegramAllowedUserIds.join(', ')}`);
    }
});

// Error handling to prevent crashes
bot.catch((err) => {
    console.error(`Bot Error: ${err.message}`);
});

// Handle graceful shutdown
let isShuttingDown = false;
const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`\n--- APAGANDO BETTY (${signal}) ---`);
    
    // Safety timeout: force exit if it takes too long
    const forceExitTimeout = setTimeout(() => {
        console.log('⚠️ Apagado forzado tras tiempo de espera.');
        process.exit(0);
    }, 3000);

    try {
        await bot.stop();
        server.close();
        console.log('✅ Betty se ha despedido correctamente.');
    } catch (err) {
        console.error('Error durante el apagado:', err);
    } finally {
        clearTimeout(forceExitTimeout);
        process.exit(0);
    }
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
