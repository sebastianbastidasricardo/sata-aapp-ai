
import { SystemSettings } from '../types';

// We use 'any' for the client here to avoid static type dependency issues 
// that can cause the app to fail loading if the module isn't resolved immediately.
let supabaseInstance: any | null = null;

// DEFAULT CREDENTIALS PROVIDED BY USER
const DEFAULT_URL = "https://stxgkuqskyvkmxrvbyhs.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0eGdrdXFza3l2a214cnZieWhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODg5NzMsImV4cCI6MjA3OTc2NDk3M30.TbJlIaiNt8r68M1660g34Zo1Ro6vT6Qn1or-6LhRjx8";

// Helper to get settings directly to avoid circular dependency with api.ts
const getLocalSettings = (): SystemSettings => {
    try {
        const item = localStorage.getItem('sata_system_settings');
        const stored = item ? JSON.parse(item) : {};
        return { 
            resendApiKey: stored.resendApiKey || 're_fbHZWATr_3ZjLYDg1pHnteKfE6ypo9zzV', 
            senderEmail: stored.senderEmail || 'onboarding@resend.dev',
            // Use stored values, or fall back to the hardcoded defaults
            supabaseUrl: stored.supabaseUrl || DEFAULT_URL,
            supabaseKey: stored.supabaseKey || DEFAULT_KEY
        };
    } catch (error) {
        return { 
            resendApiKey: 're_fbHZWATr_3ZjLYDg1pHnteKfE6ypo9zzV', 
            senderEmail: 'onboarding@resend.dev',
            supabaseUrl: DEFAULT_URL,
            supabaseKey: DEFAULT_KEY
        };
    }
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
                supabaseInstance = createClient(settings.supabaseUrl.trim(), settings.supabaseKey.trim());
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
