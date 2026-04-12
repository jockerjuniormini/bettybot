import dotenv from 'dotenv';

dotenv.config();

function getEnv(key: string, required: boolean = true): string {
    const value = process.env[key];
    if (required && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || '';
}

export const config = {
    telegramBotToken: getEnv('TELEGRAM_BOT_TOKEN'),
    telegramAdminIds: getEnv('TELEGRAM_ADMIN_IDS').split(',').map(id => id.trim()).filter(id => id.length > 0),
    telegramVipIds: getEnv('TELEGRAM_VIP_IDS', false).split(',').map(id => id.trim()).filter(id => id.length > 0),
    get telegramAllowedUserIds() { return [...this.telegramAdminIds, ...this.telegramVipIds]; },
    groqApiKey: getEnv('GROQ_API_KEY'),
    openrouterApiKey: getEnv('OPENROUTER_API_KEY', false),
    openrouterModel: getEnv('OPENROUTER_MODEL', false) || 'openrouter/free',
    dbPath: getEnv('DB_PATH', false) || './memory.db',
    googleCredentials: getEnv('GOOGLE_APPLICATION_CREDENTIALS', false),
    googleCredentialsJson: getEnv('GOOGLE_CREDENTIALS_JSON', false),
    elevenLabsApiKey: getEnv('ELEVENLABS_API_KEY', false),
    elevenLabsVoiceId: getEnv('ELEVENLABS_VOICE_ID', false) || '21m00Tcm4lPqW24C5nsT'
};