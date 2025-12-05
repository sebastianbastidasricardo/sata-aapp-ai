
import { SystemSettings } from '../types';

// Helper to get settings directly to avoid circular dependency with api.ts
const getLocalSystemSettings = (): SystemSettings => {
    try {
        const item = localStorage.getItem('sata_system_settings');
        const stored = item ? JSON.parse(item) : {};
        return { 
            resendApiKey: stored.resendApiKey || 're_fbHZWATr_3ZjLYDg1pHnteKfE6ypo9zzV', 
            senderEmail: stored.senderEmail || 'onboarding@resend.dev' 
        };
    } catch (e) {
        return { resendApiKey: 're_fbHZWATr_3ZjLYDg1pHnteKfE6ypo9zzV', senderEmail: 'onboarding@resend.dev' };
    }
};

interface EmailPayload {
    to: string[];
    subject: string;
    html: string;
}

export const sendEmailViaResend = async (payload: EmailPayload): Promise<{ success: boolean; message: string }> => {
    const settings = getLocalSystemSettings();

    if (!settings.resendApiKey) {
        console.error('Falta la API Key de Resend');
        return { success: false, message: 'Falta la API Key de Resend.' };
    }

    console.log(`[Email Service] Intentando enviar a: ${payload.to.join(', ')}`);

    try {
        // SOLUCIÓN CORS: Usamos corsproxy.io para permitir la petición desde el navegador
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://api.resend.com/emails');
        
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.resendApiKey}`,
            },
            body: JSON.stringify({
                from: settings.senderEmail,
                to: payload.to,
                subject: payload.subject,
                html: payload.html,
            }),
        });

        if (res.ok) {
            const data = await res.json();
            console.log('✅ Correo enviado exitosamente vía Resend:', data);
            return { success: true, message: 'Correo enviado exitosamente.' };
        } else {
            let errorData;
            try {
                // Try parsing JSON first
                errorData = await res.json();
            } catch (e) {
                // Fallback to text if response isn't JSON
                errorData = { message: await res.text() };
            }
            
            // Check for specific Resend Sandbox Restriction
            const errorMessage = errorData.message || errorData.name || JSON.stringify(errorData);
            
            if (errorMessage.includes("own email address")) {
                console.warn('⚠️ Limitación Resend (Modo Prueba):', errorMessage);
                return { 
                    success: false, 
                    message: "Modo Prueba: Solo puedes enviar correos a tu propio email registrado. Para enviar a otros, verifica un dominio en Resend." 
                };
            }
            
            console.error('❌ Error API Resend:', JSON.stringify(errorData, null, 2));

            return { success: false, message: `Error Resend: ${errorMessage}` };
        }
    } catch (error: any) {
        console.error('Error Crítico de Red:', error);
        return { 
            success: false, 
            message: `Error de conexión: ${error.message || 'Desconocido'}` 
        };
    }
};

export const generateAuthEmailHTML = (title: string, message: string, actionLink: string, actionText: string) => {
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 25px; text-align: center;">
            <h1 style="color: #22c55e; margin: 0; font-size: 28px; letter-spacing: 2px;">SATA</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">${title}</h2>
            <p style="color: #64748b; line-height: 1.6;">${message}</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${actionLink}" target="_blank" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; cursor: pointer;">
                    ${actionText}
                </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e2e8f0; text-align: center;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 5px;">¿El botón no funciona? Copia y pega el siguiente enlace en tu navegador:</p>
                <div style="background-color: #f1f5f9; padding: 8px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 11px; color: #475569;">
                    ${actionLink}
                </div>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                Si no solicitaste este correo, puedes ignorarlo de manera segura.<br>
                SATA - Sistema de Alerta Temprana Agrícola
            </p>
        </div>
    </div>
    `;
};

export const generateInternalInviteHTML = (name: string, role: string, link: string) => {
    const roleName = role === 'sata_admin' ? 'Administrador Global' : 'Soporte Técnico';
    return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #0f172a; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 30px; text-align: center;">
            <h1 style="color: #3b82f6; margin: 0; font-size: 32px; letter-spacing: 2px;">SATA <span style="color:white; font-size:16px;">CORP</span></h1>
        </div>
        <div style="padding: 40px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 22px;">Bienvenido al Equipo</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                Hola <strong>${name}</strong>,<br><br>
                Has sido seleccionado para unirte al equipo interno de SATA con el rol de:
            </p>
            <div style="background-color: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                <strong style="color: #0f172a; font-size: 18px;">${roleName}</strong>
            </div>
            <p style="color: #64748b;">Haz clic a continuación para configurar tus credenciales de acceso seguro.</p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${link}" target="_blank" style="background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; cursor: pointer;">
                    Activar Cuenta Corporativa
                </a>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e2e8f0; text-align: center;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Enlace manual:</p>
                <div style="background-color: #f1f5f9; padding: 8px; border-radius: 4px; word-break: break-all; font-family: monospace; font-size: 11px; color: #475569;">
                    ${link}
                </div>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
            SATA Internal Systems • Confidential
        </div>
    </div>
    `;
};

export const generateReportHTML = (title: string, dataSummary: any) => {
    return `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #22c55e; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">SATA Reporte</h1>
        </div>
        <div style="padding: 20px; background-color: #f9fafb;">
            <h2 style="color: #0f172a; margin-top: 0;">${title}</h2>
            <p>Se ha generado un nuevo reporte automático desde su plataforma SATA.</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0; color: #475569;">Resumen de Datos</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Temperatura Promedio:</strong> ${dataSummary.avgTemp}°C</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Humedad Promedio:</strong> ${dataSummary.avgHum}%</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;"><strong>Temperatura Máxima:</strong> ${dataSummary.maxTemp}°C</li>
                    <li style="padding: 8px 0;"><strong>Temperatura Mínima:</strong> ${dataSummary.minTemp}°C</li>
                </ul>
            </div>

            <p style="font-size: 12px; color: #64748b; text-align: center;">
                Este es un mensaje automático generado por SATA - Sistema de Alerta Temprana Agrícola.
            </p>
        </div>
    </div>
    `;
};
