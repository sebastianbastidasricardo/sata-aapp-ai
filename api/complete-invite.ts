import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export default async function completeInviteHandler(req: Request, res: Response) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;
        
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return res.status(500).json({ error: 'Faltan credenciales de administración en el servidor.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Find user by email in public users table
        const { data: userData, error: findError } = await supabaseAdmin
            .from('users')
            .select('id, name, email, role, status, farm_id, company_role')
            .eq('email', email)
            .single();

        if (findError || !userData) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Update password in Auth
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userData.id, {
            password: password
        });

        if (authError) {
             return res.status(400).json({ error: authError.message });
        }

        // Update status in public users table
        const { data: updatedUser, error: dbError } = await supabaseAdmin
            .from('users')
            .update({ status: 'Activo', password: 'Auth-Managed' })
            .eq('email', email)
            .select()
            .single();

        if (dbError) {
            return res.status(400).json({ error: dbError.message });
        }

        return res.status(200).json({ success: true, user: updatedUser });

    } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Error interno' });
    }
}
