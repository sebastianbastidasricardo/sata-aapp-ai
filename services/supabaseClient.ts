
import { SystemSettings } from '../types';

// We use 'any' for the client here to avoid static type dependency issues 
// that can cause the app to fail loading if the module isn't resolved immediately.
let supabaseInstance: any | null = null;

// Helper to get settings directly to avoid circular dependency with api.ts
const getLocalSettings = (): SystemSettings => {
    return {
        resendApiKey: import.meta.env.VITE_RESEND_API_KEY || '',
        senderEmail: import.meta.env.VITE_SENDER_EMAIL || '',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        telegramBotToken: import.meta.env.VITE_TELEGRAM_BOT_TOKEN || ''
    };
};

export const getSupabaseClient = async (): Promise<any | null> => {
    if (supabaseInstance) return supabaseInstance;

    const settings = getLocalSettings();
    
    // Strict validation to prevent crashes
    if (settings.supabaseUrl && settings.supabaseKey && settings.supabaseUrl.startsWith('http')) {
        try {
            console.log("⏳ Loading Supabase Module dynamically...");
            
            // DYNAMIC IMPORT: This prevents the "White Screen of Death".
            // The app loads the UI first, then tries to load this library.
            const module: any = await import('@supabase/supabase-js');
            
            // Handle different ESM export structures (default vs named)
            const createClient = module.createClient || (module.default && module.default.createClient);

            if (!createClient) {
                console.error("❌ createClient function not found in loaded module", module);
                return null;
            }

            console.log("☁️ Connecting to Supabase...");
            try {
                // EXPLICIT FETCH: We pass the native window.fetch to prevent the library 
                // from trying to polyfill it or causing assignments to the read-only window.fetch property.
                supabaseInstance = createClient(settings.supabaseUrl.trim(), settings.supabaseKey.trim(), {
                    global: {
                        fetch: (...args: any[]) => window.fetch(...(args as [any, any]))
                    }
                });
                return supabaseInstance;
            } catch (clientError) {
                console.error("❌ Error during createClient execution:", clientError);
                return null;
            }
            
        } catch (error) {
            console.error("⚠️ Critical Error initializing Supabase:", error);
            console.warn("Falling back to LocalStorage mode.");
            // Return null so the app continues working in 'offline/local' mode
            return null;
        }
    } else {
        console.warn("❌ Invalid Supabase Configuration. Missing URL or Key.");
    }
    return null;
};
