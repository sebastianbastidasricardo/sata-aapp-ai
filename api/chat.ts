import { GoogleGenAI } from "@google/genai";
import type { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history } = req.body;
    
    const ai = new GoogleGenAI({
      apiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const contents = [];
    
    if (history && history.length > 0) {
        history.forEach((msg: any) => {
            contents.push({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.text }]
            });
        });
    }
    
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: `You are SATA's Virtual Assistant. 
SATA is the 'Sistema de Alerta Temprana Agrícola'.
Your role is to guide users to configure their SATA accounts, explain the process, and answer basic questions about the platform.
Keep your answers brief, friendly, and helpful. You do not have access to real-time database readings, so politely explain that if asked for sensor data.
Provide step by step instructions when helping with configurations like Telegram, Email, Rules, etc.
Respond in Spanish.`,
        temperature: 0.7,
      },
    });

    res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ error: "Ocurrió un error al procesar tu solicitud." });
  }
}
