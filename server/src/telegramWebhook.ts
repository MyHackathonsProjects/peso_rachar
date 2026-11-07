import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN as string;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET as string;
const WEBHOOK_URL = 'https://pesorachar-server.ionlab.dev/8080'; 
const TELEGRAM_API_URL = 'https://api.telegram.org';

export const initializeTelegramWebhook = async (): Promise<void> => {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET) {
    console.error('❌ Telegram Webhook initialization failed: Missing environment variables in .env');
    return;
  }

  const endpointString = [
    TELEGRAM_API_URL,
    '/bot',
    TELEGRAM_BOT_TOKEN,
    '/setWebhook'
  ].join('');
  

  try {
    const response = await axios.post(endpointString, {
      url: WEBHOOK_URL,
      secret_token: TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'edited_message'],
    });

    if (response.data.ok) {
      console.log('✅ Telegram Webhook registered successfully:', response.data.description);
    } else {
      console.warn('⚠️ Telegram Webhook responded with failure:', response.data);
    }
  } catch (error: any) {
    console.error(
      '❌ Failed to set Telegram webhook:',
      error.response?.data?.description || error.response?.data || error.message
    );
  }
};
