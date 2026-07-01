import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function inviteHandler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, name, role, farmId, companyRole } = req.body;
        
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
            // Fallback for local preview if no service key is provided:
            // Just simulate success so the UI doesn't break, but warn in console.
            return res.status(500).json({ error: 'Faltan credenciales de administración (SUPABASE_SERVICE_ROLE_KEY) en el servidor.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // 1. Crear el usuario en Supabase Auth
        // Usamos una contraseña temporal compleja para que se cree el usuario, 
        // luego la actualizaremos cuando el usuario acepte la invitación.
        const tempPassword = 'Sata-' + Math.random().toString(36).slice(-8) + '!' + Date.now();
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true, // Auto-confirmamos para no usar el email default de Supabase
            user_metadata: { name: name }
        });

        if (authError) {
             console.error("Auth admin error:", authError);
             return res.status(400).json({ error: authError.message });
        }

        const authUserId = authData.user?.id;

        // 2. Crear en tabla pública users
        const { data: userData, error: dbError } = await supabaseAdmin
            .from('users')
            .insert([{
                id: authUserId,
                name: name,
                email: email,
                password: 'Auth-Managed',
                role: role || 'farm_user',
                status: 'Pendiente',
                farm_id: farmId,
                company_role: companyRole
            }])
            .select()
            .single();

        if (dbError) {
            console.error("DB insert error:", dbError);
            // Rollback auth user creation
            await supabaseAdmin.auth.admin.deleteUser(authUserId!);
            return res.status(400).json({ error: dbError.message });
        }

        return res.status(200).json({ success: true, user: userData });

    } catch (error: any) {
        console.error("Serverless error in invite:", error);
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
}
