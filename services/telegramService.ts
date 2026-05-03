
import { SystemSettings } from '../types';

const getLocalSystemSettings = (): SystemSettings => {
    try {
        const item = localStorage.getItem('sata_system_settings');
        const stored = item ? JSON.parse(item) : {};
        return { 
            resendApiKey: stored.resendApiKey || '', 
            senderEmail: stored.senderEmail || '',
            telegramBotToken: stored.telegramBotToken || ''
        };
    } catch (e) {
        return { resendApiKey: '', senderEmail: '', telegramBotToken: '' };
    }
};

export const sendTelegramMessage = async (chatId: string, message: string): Promise<{ success: boolean; message: string }> => {
    const settings = getLocalSystemSettings();

    if (!settings.telegramBotToken) {
        console.error('Falta el Token del Bot de Telegram');
        return { success: false, message: 'Falta el Token del Bot de Telegram en Configuración.' };
    }

    console.log(`[Telegram Service] Intentando enviar a Chat ID: ${chatId}`);

    try {
        const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            }),
        });

        if (res.ok) {
            const data = await res.json();
            console.log('✅ Mensaje de Telegram enviado:', data);
            return { success: true, message: 'Mensaje enviado exitosamente.' };
        } else {
            const errorData = await res.json();
            console.error('❌ Error API Telegram:', errorData);
            return { success: false, message: `Error Telegram: ${errorData.description || 'Desconocido'}` };
        }
    } catch (error: any) {
        console.error('Error Crítico de Red (Telegram):', error);
        return { 
            success: false, 
            message: `Error de conexión: ${error.message || 'Desconocido'}` 
        };
    }
};
