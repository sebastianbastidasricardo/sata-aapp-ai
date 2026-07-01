import { Request, Response } from 'express';

export default async function emailHandler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { to, subject, html } = req.body;
        const resendApiKey = process.env.VITE_RESEND_API_KEY;
        const senderEmail = process.env.VITE_SENDER_EMAIL || 'no-reply@agrosata.online';

        if (!resendApiKey) {
            console.error('Falta la API Key de Resend en el servidor');
            return res.status(500).json({ error: 'Falta la API Key de Resend en el servidor.' });
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: senderEmail,
                to,
                subject,
                html,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Correo enviado exitosamente vía Resend:', data);
            return res.status(200).json({ success: true, message: 'Correo enviado exitosamente.', data });
        } else {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: await response.text() };
            }
            
            const errorMessage = errorData.message || errorData.name || JSON.stringify(errorData);
            
            if (errorMessage.includes("own email address")) {
                console.warn('⚠️ Limitación Resend (Modo Prueba):', errorMessage);
                return res.status(400).json({ 
                    success: false, 
                    error: "Modo Prueba: Solo puedes enviar correos a tu propio email registrado. Para enviar a otros, verifica un dominio en Resend." 
                });
            }
            
            console.error('❌ Error API Resend:', JSON.stringify(errorData, null, 2));
            return res.status(500).json({ success: false, error: `Error Resend: ${errorMessage}` });
        }
    } catch (error: any) {
        console.error('Error Crítico al enviar email:', error);
        return res.status(500).json({ success: false, error: `Error de conexión: ${error.message || 'Desconocido'}` });
    }
}
