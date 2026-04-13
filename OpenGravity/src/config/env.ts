import dotenv from 'dotenv';
dotenv.config();

export const config = {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    allowedUsers: (process.env.ALLOWED_USERS || '').split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id)),
    
    defaultBrain: process.env.DEFAULT_BRAIN || 'ollama',
    
    ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    localModel: process.env.LOCAL_MODEL || 'llama3.1',
    
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openrouterModel: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-70b-instruct',
    
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || '',
    
    dbType: process.env.DB_TYPE || 'local_db',
    port: parseInt(process.env.PORT || '8080', 10),
    isMacStudio: process.env.MAC_STUDIO_MODE === 'true'
};

if (!config.telegramBotToken) {
    console.warn('⚠️ ADVERTENCIA: TELEGRAM_BOT_TOKEN no definido en .env');
}
