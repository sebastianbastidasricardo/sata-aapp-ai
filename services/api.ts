
import { Contact, Greenhouse, AlertRule, User, Farm, PredictionLog, PredictionSettings, ScheduledReport, SystemSettings, UserRole, CompanyRole, AssetType, AssetLocation, AlertType, TelegramGroup, AlertLog } from '../types';
import { MOCK_CONTACTS, MOCK_GREENHOUSES, MOCK_RULES, MOCK_USERS, MOCK_FARMS, MOCK_PREDICTION_HISTORY } from '../constants';
import { sendEmailViaResend, generateAuthEmailHTML, generateInternalInviteHTML } from './emailService';
import { getSupabaseClient } from './supabaseClient';

// In a real app, these would be API calls. Here we simulate them by using localStorage.
const apiDelay = 800; 

// Helper to manage localStorage data
const getStore = <T>(key: string, mockData: T[]): T[] => {
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : mockData;
    } catch (error) {
        console.log(error);
        return mockData;
    }
};

const setStore = <T>(key: string, data: T[]) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.log(error);
    }
};

// Initialize stores (Fallback)
if (!localStorage.getItem('sata_users')) {
    setStore('sata_users', MOCK_USERS);
    setStore('sata_contacts', MOCK_CONTACTS);
    setStore('sata_rules', MOCK_RULES);
    setStore('sata_greenhouses', MOCK_GREENHOUSES);
    setStore('sata_farms', MOCK_FARMS);
    setStore('sata_predictions', MOCK_PREDICTION_HISTORY);
}

const generateId = () => `id_${new Date().getTime()}_${Math.random()}`;

// --- SYSTEM SETTINGS ---
export const getSystemSettings = async (farmId?: string): Promise<SystemSettings> => {
    // 1. Get Supabase credentials from LocalStorage (Maestra)
    const item = localStorage.getItem('sata_system_settings');
    const stored = item ? JSON.parse(item) : {};
    
    const settings: SystemSettings = { 
        resendApiKey: '', 
        senderEmail: '',
        supabaseUrl: stored.supabaseUrl || '',
        supabaseKey: stored.supabaseKey || '',
        telegramBotToken: ''
    };

    // 2. Try to fetch API Keys from Supabase if we have a farmId
    if (farmId) {
        const supabase = await getSupabaseClient();
        if (supabase) {
            const { data, error } = await supabase
                .from('system_settings')
                .select('*')
                .eq('farm_id', farmId)
                .single();
            
            if (!error && data) {
                settings.resendApiKey = data.resend_api_key || '';
                settings.senderEmail = data.sender_email || '';
                settings.telegramBotToken = data.telegram_bot_token || '';
            }
        }
    }

    // 3. Fallback to LocalStorage if Supabase fetch failed or returned empty
    if (!settings.resendApiKey) settings.resendApiKey = stored.resendApiKey || 're_fbHZWATr_3ZjLYDg1pHnteKfE6ypo9zzV';
    if (!settings.senderEmail) settings.senderEmail = stored.senderEmail || 'onboarding@resend.dev';
    if (!settings.telegramBotToken) settings.telegramBotToken = stored.telegramBotToken || '';

    return new Promise(resolve => setTimeout(() => resolve(settings), 100)); 
};

export const saveSystemSettings = async (settings: SystemSettings, farmId?: string): Promise<void> => {
    // 1. Save Supabase credentials to LocalStorage (Always local)
    const localData = {
        supabaseUrl: settings.supabaseUrl,
        supabaseKey: settings.supabaseKey,
        resendApiKey: settings.resendApiKey, // Also keep local for quick access
        senderEmail: settings.senderEmail,
        telegramBotToken: settings.telegramBotToken
    };
    localStorage.setItem('sata_system_settings', JSON.stringify(localData));

    // 2. Save API Keys to Supabase for persistence across devices
    if (farmId) {
        const supabase = await getSupabaseClient();
        if (supabase) {
            const dbPayload = {
                farm_id: farmId,
                resend_api_key: settings.resendApiKey,
                sender_email: settings.senderEmail,
                telegram_bot_token: settings.telegramBotToken,
                updated_at: new Date().toISOString()
            };
            
            await supabase.from('system_settings').upsert(dbPayload);
        }
    }

    return new Promise(resolve => setTimeout(() => resolve(), apiDelay));
};


// --- SEEDING FUNCTION ---
const seedCompanyData = async (farmId: string) => {
    const supabase = await getSupabaseClient();
    console.log(`🌱 Seeding FULL ISOLATED data for Farm ID: ${farmId}`);
    
    const timestamp = new Date().getTime();
    const suffix = `${farmId.substring(0, 4)}_${timestamp}`;

    const assets = [
        { name: 'Invernadero Norte - Cultivo Principal', asset_type: 'Invernadero', location: 'Norte', dev_eui: `AA11${suffix.substring(0,4)}01` },
        { name: 'Silo Central - Maíz', asset_type: 'Silo', location: 'Centro', dev_eui: `AA11${suffix.substring(0,4)}02` },
        { name: 'Bodega Sur - Secado', asset_type: 'Otro', custom_type: 'Bodega', location: 'Sur', dev_eui: `AA11${suffix.substring(0,4)}03` }
    ];

    const contacts = [
        { name: 'Ing. Agrónomo Jefe', phone: '+573001234567', email: `agronomo.${suffix}@demo.com` },
        { name: 'Gerente de Planta', phone: '+573007654321', email: `gerente.${suffix}@demo.com` },
        { name: 'Supervisor de Turno', phone: '+573001112233', email: `supervisor.${suffix}@demo.com` }
    ];

    const teamUsers = [
        { 
            name: 'Admin Operativo', 
            email: `admin.${suffix}@empresa.com`, 
            password: 'password', 
            role: 'farm_user', 
            status: 'Activo', 
            company_role: 'admin' 
        },
        { 
            name: 'Miembro Visualizador', 
            email: `miembro.${suffix}@empresa.com`, 
            password: 'password', 
            role: 'farm_user', 
            status: 'Activo', 
            company_role: 'member' 
        }
    ];

    if (supabase) {
        const { data: createdAssets } = await supabase.from('assets').insert(
            assets.map(a => ({ ...a, farm_id: farmId }))
        ).select();

        const { data: createdContacts } = await supabase.from('contacts').insert(
            contacts.map(c => ({ ...c, farm_id: farmId }))
        ).select();

        await supabase.from('users').insert(
            teamUsers.map(u => ({ ...u, farm_id: farmId }))
        );

        if (createdAssets && createdContacts) {
            await supabase.from('alert_rules').insert([
                { asset_id: createdAssets[0].id, type: 'Temperatura Máxima', threshold: 30, contact_ids: [createdContacts[0].id, createdContacts[1].id] },
                { asset_id: createdAssets[0].id, type: 'Temperatura Mínima', threshold: 10, contact_ids: [createdContacts[0].id] },
                { asset_id: createdAssets[1].id, type: 'Humedad Máxima', threshold: 85, contact_ids: [createdContacts[0].id, createdContacts[2].id] }
            ]);

            const now = new Date();
            await supabase.from('prediction_logs').insert([
                { 
                    asset_id: createdAssets[0].id, 
                    farm_id: farmId,
                    disease_name: 'Moho Gris (Botrytis)', 
                    probability: 75, 
                    risk_level: 'High', 
                    description: 'Condiciones de alta humedad detectadas en la madrugada.',
                    recommendation: 'Ventilar zona norte y aplicar preventivo.',
                    affected_crops: ['Tomate', 'Fresa'],
                    timestamp: new Date().toISOString()
                },
                { 
                    asset_id: createdAssets[1].id, 
                    farm_id: farmId,
                    disease_name: 'Riesgo de Aflatoxinas', 
                    probability: 60, 
                    risk_level: 'Medium', 
                    description: 'Ligero aumento de temperatura en núcleo.',
                    recommendation: 'Monitorear ventilación.',
                    affected_crops: ['Maíz'],
                    timestamp: new Date(now.getTime() - 86400000).toISOString()
                }
            ]);

            await supabase.from('scheduled_reports').insert([
                {
                    asset_id: createdAssets[0].id,
                    farm_id: farmId,
                    frequency: 'Semanal',
                    start_date: new Date().toISOString(),
                    end_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    contact_ids: [createdContacts[0].id]
                }
            ]);
        }
    } else {
        // LocalStorage Fallback Seeding
        const newAssets = assets.map(a => ({ ...a, id: generateId(), farmId, assetType: a.asset_type as AssetType, customType: a.custom_type, devEUI: a.dev_eui, location: a.location as AssetLocation }));
        const currentAssets = getStore<Greenhouse>('sata_greenhouses', []);
        setStore('sata_greenhouses', [...currentAssets, ...newAssets]);

        const newContacts = contacts.map(c => ({ ...c, id: generateId(), farmId }));
        const currentContacts = getStore<Contact>('sata_contacts', []);
        setStore('sata_contacts', [...currentContacts, ...newContacts]);
        
        const newUsers = teamUsers.map(u => ({ ...u, id: generateId(), farmId, role: u.role as UserRole, companyRole: u.company_role as CompanyRole }));
        const currentUsers = getStore<User>('sata_users', []);
        setStore('sata_users', [...currentUsers, ...newUsers]);
    }
};


// --- AUTH API (HYBRID) ---

export const authenticateUser = async (email: string, password_provided: string): Promise<User | null> => {
    const supabase = await getSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();

    const checkStatus = (user: any) => {
        if (user.status === 'Bloqueado' || user.status === 'Inactivo') {
            throw new Error("Cuenta inactiva o bloqueada. Contacte al soporte SATA.");
        }
        if (user.status === 'Pendiente') return false;
        return true;
    };

    // 1. Try Supabase
    if (supabase) {
        console.log("☁️ Intentando login con Supabase DB...");
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .single();
        
        if (!error && data) {
            if (data.password === password_provided) {
                if (!checkStatus(data)) return null;
                
                return {
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    status: data.status,
                    farmId: data.farm_id,
                    companyRole: data.company_role
                };
            }
        }
        return null; 
    }

    // 2. Fallback to LocalStorage
    console.log("💾 Usando LocalStorage para login...");
    const users = getStore<User>('sata_users', []);
    const user = users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
    
    if (user && user.password === password_provided) {
        if (!checkStatus(user)) return null;
        const { password, ...userWithoutPassword } = user;
        return new Promise(resolve => setTimeout(() => resolve(userWithoutPassword), apiDelay));
    }
    return new Promise(resolve => setTimeout(() => resolve(null), apiDelay));
};

export const registerOwner = async (data: {name: string, email: string, password: string, companyName: string}): Promise<User> => {
    const supabase = await getSupabaseClient();
    const normalizedEmail = data.email.trim().toLowerCase();

    if (supabase) {
        const { data: farmData, error: farmError } = await supabase
            .from('farms')
            .insert([{ name: data.companyName, timezone: 'UTC' }])
            .select()
            .single();

        if (farmError) throw new Error("Error creando empresa: " + farmError.message);

        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{
                name: data.name,
                email: normalizedEmail,
                password: data.password,
                role: 'farm_user',
                status: 'Activo',
                farm_id: farmData.id,
                company_role: 'owner'
            }])
            .select()
            .single();
        
        if (userError) throw new Error("Error creando usuario: " + userError.message);

        await seedCompanyData(farmData.id);

        return {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            status: userData.status,
            farmId: userData.farm_id,
            companyRole: userData.company_role,
            companyName: farmData.name
        };
    }

    // Fallback LocalStorage
    const users = getStore<User>('sata_users', []);
    const farms = getStore<Farm>('sata_farms', []);

    if (users.find(u => u.email.toLowerCase() === normalizedEmail)) {
        throw new Error("El correo electrónico ya está registrado en SATA.");
    }

    const newFarmId = generateId();
    const newFarm: Farm = { id: newFarmId, name: data.companyName, timezone: 'UTC' };
    
    const newUser: User = {
        id: generateId(),
        name: data.name,
        email: normalizedEmail,
        password: data.password,
        status: 'Activo',
        role: 'farm_user',
        farmId: newFarmId,
        companyRole: 'owner',
        companyName: data.companyName
    };

    setStore('sata_farms', [...farms, newFarm]);
    setStore('sata_users', [...users, newUser]);
    
    await seedCompanyData(newFarmId);

    const { password, ...userWithoutPassword } = newUser;
    return new Promise(resolve => setTimeout(() => resolve(userWithoutPassword), apiDelay));
};

// --- COMPANY MANAGEMENT ---

export const deleteCompany = async (userId: string, passwordAttempt: string, farmId: string): Promise<boolean> => {
    const supabase = await getSupabaseClient();
    
    // 1. Validate User Password
    if (supabase) {
        const { data: user, error } = await supabase
            .from('users')
            .select('password, company_role')
            .eq('id', userId)
            .single();
            
        if (error || !user) throw new Error("Usuario no encontrado.");
        if (user.company_role !== 'owner') throw new Error("Solo el propietario puede eliminar la empresa.");
        if (user.password !== passwordAttempt) throw new Error("Contraseña incorrecta.");

        // 2. Delete Farm (Cascade will delete assets, contacts, logs, predictions)
        // Users table has ON DELETE SET NULL usually, so we must manually delete the users of this farm
        
        // A. Delete Users associated with farm
        const { error: usersDelError } = await supabase.from('users').delete().eq('farm_id', farmId);
        if (usersDelError) console.error("Error deleting users", usersDelError);

        // B. Delete Farm
        const { error: farmDelError } = await supabase.from('farms').delete().eq('id', farmId);
        if (farmDelError) throw new Error("Error al eliminar la empresa: " + farmDelError.message);

        return true;
    }

    // LocalStorage Fallback
    const users = getStore<User>('sata_users', []);
    const user = users.find(u => u.id === userId);
    
    if (!user || user.password !== passwordAttempt) throw new Error("Contraseña incorrecta.");
    if (user.companyRole !== 'owner') throw new Error("Solo el propietario puede eliminar la empresa.");

    // Filter out EVERYTHING related to this farm
    setStore('sata_farms', getStore<Farm>('sata_farms', []).filter(f => f.id !== farmId));
    setStore('sata_users', users.filter(u => u.farmId !== farmId));
    setStore('sata_greenhouses', getStore<Greenhouse>('sata_greenhouses', []).filter(g => g.farmId !== farmId));
    setStore('sata_contacts', getStore<Contact>('sata_contacts', []).filter(c => c.farmId !== farmId));
    // (Simulate cascade for others...)
    
    return true;
};

// ADMIN DELETE FORCE (No Password Required)
export const deleteAccountByAdmin = async (targetUserId: string): Promise<boolean> => {
    const supabase = await getSupabaseClient();
    
    if (supabase) {
        // Check if user is owner
        const { data: user } = await supabase.from('users').select('farm_id, company_role').eq('id', targetUserId).single();
        
        if (user) {
            if (user.company_role === 'owner' && user.farm_id) {
                // DELETE ENTIRE COMPANY
                await supabase.from('users').delete().eq('farm_id', user.farm_id);
                await supabase.from('farms').delete().eq('id', user.farm_id);
            } else {
                // DELETE SINGLE USER
                await supabase.from('users').delete().eq('id', targetUserId);
            }
            return true;
        }
    }

    // LocalStorage Fallback
    const users = getStore<User>('sata_users', []);
    const targetUser = users.find(u => u.id === targetUserId);
    if (targetUser) {
        if (targetUser.companyRole === 'owner' && targetUser.farmId) {
             setStore('sata_farms', getStore<Farm>('sata_farms', []).filter(f => f.id !== targetUser.farmId));
             setStore('sata_users', users.filter(u => u.farmId !== targetUser.farmId));
             setStore('sata_greenhouses', getStore<Greenhouse>('sata_greenhouses', []).filter(g => g.farmId !== targetUser.farmId));
        } else {
             setStore('sata_users', users.filter(u => u.id !== targetUserId));
        }
        return true;
    }
    return false;
};

export const updateUserStatus = async (userId: string, newStatus: 'Activo' | 'Bloqueado'): Promise<User> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const { data, error } = await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw new Error(error.message);
        return {
             id: data.id,
             name: data.name,
             email: data.email,
             role: data.role,
             status: data.status,
             farmId: data.farm_id,
             companyRole: data.company_role
        };
    }
    
    const users = getStore<User>('sata_users', []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
        users[idx].status = newStatus;
        setStore('sata_users', users);
        const { password, ...safeUser } = users[idx];
        return safeUser;
    }
    throw new Error("Usuario no encontrado");
};

// --- DB INITIALIZATION ---
export const initializeDatabase = async (): Promise<{success: boolean, message: string}> => {
    const supabase = await getSupabaseClient();
    if (!supabase) return { success: false, message: "No hay conexión a Supabase. Verifica la configuración." };

    try {
        const { data: existingAdmin } = await supabase.from('users').select('id').eq('email', 'admin@sata.com').single();
        if (existingAdmin) return { success: true, message: "El sistema ya está inicializado." };

        console.log("🌱 Sembrando base de datos...");

        const { error: adminError } = await supabase.from('users').insert([{
            name: 'Admin SATA',
            email: 'admin@sata.com',
            password: 'password',
            role: 'sata_admin',
            status: 'Activo',
            company_role: 'admin'
        }]);
        if (adminError) throw new Error("Error creando Admin: " + adminError.message);

        await supabase.from('users').insert([{
            name: 'Técnico Monitoreo',
            email: 'tech@sata.com',
            password: 'password',
            role: 'sata_tech',
            status: 'Activo',
            company_role: 'member'
        }]);

        const { data: farm } = await supabase.from('farms').insert([{ name: 'AgroIndustrias Demo', timezone: 'America/Bogota' }]).select().single();
        if (farm) {
            await supabase.from('users').insert([{
                name: 'Gerente Demo',
                email: 'gerente@empresa.com',
                password: 'password',
                role: 'farm_user',
                status: 'Activo',
                farm_id: farm.id,
                company_role: 'owner'
            }]);
            await seedCompanyData(farm.id);
        }

        return { success: true, message: "Sistema inicializado correctamente. Ahora puedes ingresar con admin@sata.com / password" };
    } catch (error: any) {
        return { success: false, message: error.message || "Error al inicializar" };
    }
};

// --- GET USERS ---
export const getUsers = async (farmId?: string): Promise<User[]> => {
    const supabase = await getSupabaseClient();
    
    if (supabase) {
        let query = supabase.from('users').select('*');
        if (farmId) {
            query = query.eq('farm_id', farmId);
        }

        const { data, error } = await query;
        if (!error && data) {
            return data.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                status: u.status,
                farmId: u.farm_id,
                companyRole: u.company_role,
                invitedAt: u.created_at // Assuming created_at is used as base for invitation time in Supabase logic for now
            }));
        }
    }

    const users = getStore<User>('sata_users', []);
    const filtered = farmId ? users.filter(u => u.farmId === farmId) : users;
    
    const usersWithoutPasswords = filtered.map(u => {
        const { password, ...user } = u;
        return user;
    });
    return new Promise(resolve => setTimeout(() => resolve([...usersWithoutPasswords]), apiDelay));
};


export const verify2FA = async (email: string, code: string): Promise<boolean> => {
    console.log(`Verifying 2FA for ${email} with code ${code}`);
    return new Promise(resolve => setTimeout(() => resolve(code === '123456'), apiDelay));
};

export const requestPasswordReset = async (email: string): Promise<void> => {
    const token = btoa(`${email}-${Date.now()}`);
    const link = `${window.location.origin}/?reset_token=${token}`;

    const html = generateAuthEmailHTML(
        'Restablecer Contraseña',
        'Hemos recibido una solicitud para restablecer tu contraseña en SATA. Haz clic en el botón de abajo para continuar.',
        link,
        'Restablecer mi Contraseña'
    );

    await sendEmailViaResend({
        to: [email],
        subject: 'Recuperar Contraseña - SATA',
        html: html
    });

    return new Promise(resolve => setTimeout(() => resolve(), apiDelay));
};

export const validateInvitation = async (token: string): Promise<{email: string, isValid: boolean, role?: string, companyName?: string}> => {
    try {
        const decoded = atob(token);
        const [email, timestamp, role, company] = decoded.split('|');
        const expiry = 24 * 60 * 60 * 1000; // 24 Hours Expiry
        const now = Date.now();
        if (now - Number(timestamp) > expiry) {
             return new Promise(resolve => setTimeout(() => resolve({ email: '', isValid: false }), apiDelay));
        }
        return new Promise(resolve => setTimeout(() => resolve({ email, isValid: true, role, companyName: company }), apiDelay));
    } catch (e) {
        // Try legacy format for backward compatibility or simple email-timestamp
        try {
             const decoded = atob(token);
             const [email, timestamp] = decoded.split('-');
             if (email && timestamp) {
                 const expiry = 24 * 60 * 60 * 1000;
                 if (Date.now() - Number(timestamp) > expiry) return { email: '', isValid: false };
                 return { email, isValid: true };
             }
        } catch(e2) {}
        return new Promise(resolve => setTimeout(() => resolve({ email: '', isValid: false }), apiDelay));
    }
};

export const completeInvitation = async (token: string, password: string): Promise<User> => {
     const { email, isValid } = await validateInvitation(token);
     if(!isValid) throw new Error("El enlace de invitación es inválido o ha expirado (24h).");

     const supabase = await getSupabaseClient();

     if (supabase) {
         const { data, error } = await supabase
            .from('users')
            .update({ password: password, status: 'Activo' })
            .eq('email', email)
            .select()
            .single();
         
         if (error || !data) throw new Error("Error al activar usuario en la nube.");
         
         return {
             id: data.id,
             name: data.name,
             email: data.email,
             role: data.role,
             status: data.status,
             farmId: data.farm_id,
             companyRole: data.company_role
         };
     }

     const users = getStore<User>('sata_users', []);
     const userIndex = users.findIndex(u => u.email === email);
     
     if (userIndex === -1) throw new Error("Usuario no encontrado en el sistema.");

     const updatedUser: User = { ...users[userIndex], password, status: 'Activo' };
     users[userIndex] = updatedUser;
     setStore('sata_users', users);

     const { password: _, ...userWithoutPassword } = updatedUser;
     return new Promise(resolve => setTimeout(() => resolve(userWithoutPassword), apiDelay));
}

// --- CONTACTS API ---
export const getContacts = async (farmId?: string): Promise<Contact[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('contacts').select('*');
        if (farmId) {
            query = query.eq('farm_id', farmId);
        }
        const { data, error } = await query;
        if (!error && data) {
            return data.map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                farmId: c.farm_id
            }));
        }
    }

    const contacts = getStore<Contact>('sata_contacts', []);
    return new Promise(resolve => {
        setTimeout(() => resolve(farmId ? contacts.filter(c => c.farmId === farmId) : [...contacts]), apiDelay);
    });
};

export const addContact = async (contact: Omit<Contact, 'id'>): Promise<Contact> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const payload = { 
            name: contact.name, 
            phone: contact.phone, 
            email: contact.email,
            farm_id: (contact as any).farmId 
        };
        const { data, error } = await supabase.from('contacts').insert([payload]).select().single();
        if (!error && data) return { id: data.id, name: data.name, phone: data.phone, email: data.email, farmId: data.farm_id };
    }

    const contacts = getStore<Contact>('sata_contacts', []);
    const newContact = { ...contact, id: generateId(), farmId: (contact as any).farmId };
    const updatedContacts = [...contacts, newContact];
    setStore('sata_contacts', updatedContacts);
    return new Promise(resolve => setTimeout(() => resolve(newContact), apiDelay));
};

export const updateContact = async (updatedContact: Contact): Promise<Contact> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const payload = { 
            name: updatedContact.name, 
            phone: updatedContact.phone, 
            email: updatedContact.email
        };
        const { error } = await supabase.from('contacts').update(payload).eq('id', updatedContact.id);
        if (!error) return updatedContact;
    }

    let contacts = getStore<Contact>('sata_contacts', []);
    contacts = contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
    setStore('sata_contacts', contacts);
    return new Promise(resolve => setTimeout(() => resolve(updatedContact), apiDelay));
};

export const deleteContact = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('contacts').delete().eq('id', id);
        return { id };
    }

    let contacts = getStore<Contact>('sata_contacts', []);
    contacts = contacts.filter(c => c.id !== id);
    setStore('sata_contacts', contacts);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};

// --- ASSETS (GREENHOUSES) API ---
export const getGreenhouses = async (farmId?: string): Promise<Greenhouse[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('assets').select('*');
        if (farmId) {
            query = query.eq('farm_id', farmId);
        }
        const { data, error } = await query;
        if (!error && data) {
            return data.map((g: any) => ({
                id: g.id,
                name: g.name,
                farmId: g.farm_id,
                assetType: g.asset_type as AssetType,
                customType: g.custom_type,
                devEUI: g.dev_eui,
                location: g.location as AssetLocation
            }));
        }
    }

    const greenhouses = getStore<Greenhouse>('sata_greenhouses', []);
    return new Promise(resolve => {
        setTimeout(() => resolve(farmId ? greenhouses.filter(g => g.farmId === farmId) : [...greenhouses]), apiDelay);
    });
};

export const addGreenhouse = async (greenhouse: Omit<Greenhouse, 'id'>): Promise<Greenhouse> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const dbPayload = {
            name: greenhouse.name,
            farm_id: greenhouse.farmId,
            asset_type: greenhouse.assetType,
            custom_type: greenhouse.customType,
            dev_eui: greenhouse.devEUI,
            location: greenhouse.location
        };
        const { data, error } = await supabase.from('assets').insert([dbPayload]).select().single();
        if (!error && data) {
             return {
                id: data.id,
                name: data.name,
                farmId: data.farm_id,
                assetType: data.asset_type,
                customType: data.custom_type,
                devEUI: data.dev_eui,
                location: data.location
            };
        }
    }

    const greenhouses = getStore<Greenhouse>('sata_greenhouses', []);
    const newGreenhouse = { ...greenhouse, id: generateId() };
    const updatedGreenhouses = [...greenhouses, newGreenhouse];
    setStore('sata_greenhouses', updatedGreenhouses);
    return new Promise(resolve => setTimeout(() => resolve(newGreenhouse), apiDelay));
};

export const updateGreenhouse = async (updatedGreenhouse: Greenhouse): Promise<Greenhouse> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
         const dbPayload = {
            name: updatedGreenhouse.name,
            farm_id: updatedGreenhouse.farmId,
            asset_type: updatedGreenhouse.assetType,
            custom_type: updatedGreenhouse.customType,
            dev_eui: updatedGreenhouse.devEUI,
            location: updatedGreenhouse.location
        };
        await supabase.from('assets').update(dbPayload).eq('id', updatedGreenhouse.id);
        return updatedGreenhouse;
    }

    let greenhouses = getStore<Greenhouse>('sata_greenhouses', []);
    greenhouses = greenhouses.map(g => g.id === updatedGreenhouse.id ? updatedGreenhouse : g);
    setStore('sata_greenhouses', greenhouses);
    return new Promise(resolve => setTimeout(() => resolve(updatedGreenhouse), apiDelay));
};

export const deleteGreenhouse = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('assets').delete().eq('id', id);
        return { id };
    }

    let greenhouses = getStore<Greenhouse>('sata_greenhouses', []);
    greenhouses = greenhouses.filter(g => g.id !== id);
    setStore('sata_greenhouses', greenhouses);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};

// --- RULES API ---
export const getRules = async (farmId?: string): Promise<AlertRule[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        // We use a join to filter by farm_id through the assets table
        let query = supabase.from('alert_rules').select('*, assets!inner(farm_id)');
        if (farmId) {
            query = query.eq('assets.farm_id', farmId);
        }
        const { data, error } = await query;
        if (error) {
            console.error("❌ Error fetching rules from Supabase:", error);
        } else if (data) {
            return data.map((r: any) => ({
                id: r.id,
                greenhouseId: r.asset_id,
                type: r.type as AlertType,
                threshold: r.threshold,
                contactIds: r.contact_ids || [],
                telegramGroupIds: r.telegram_group_ids || []
            }));
        }
    }

    console.warn("⚠️ Falling back to LocalStorage for rules");
    const rules = getStore<AlertRule>('sata_rules', []);
    return new Promise(resolve => setTimeout(() => resolve([...rules]), apiDelay));
};

export const addRule = async (rule: Omit<AlertRule, 'id'>): Promise<AlertRule> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const dbPayload = {
            asset_id: rule.greenhouseId,
            type: rule.type,
            threshold: rule.threshold,
            contact_ids: rule.contactIds,
            telegram_group_ids: rule.telegramGroupIds || []
        };
        const { data, error } = await supabase.from('alert_rules').insert([dbPayload]).select().single();
        if (error) {
            console.error("❌ Error adding rule to Supabase:", error);
            throw new Error(`Error al guardar la regla en la base de datos: ${error.message}`);
        }
        if (data) {
            return {
                id: data.id,
                greenhouseId: data.asset_id,
                type: data.type,
                threshold: data.threshold,
                contactIds: data.contact_ids,
                telegramGroupIds: data.telegram_group_ids || []
            };
        }
    }

    const rules = getStore<AlertRule>('sata_rules', []);
    const newRule: AlertRule = { ...rule, id: generateId(), telegramGroupIds: rule.telegramGroupIds || [] };
    const updatedRules = [...rules, newRule];
    setStore('sata_rules', updatedRules);
    return new Promise(resolve => setTimeout(() => resolve(newRule), apiDelay));
};

export const updateRule = async (updatedRule: AlertRule): Promise<AlertRule> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const dbPayload = {
            asset_id: updatedRule.greenhouseId,
            type: updatedRule.type,
            threshold: updatedRule.threshold,
            contact_ids: updatedRule.contactIds,
            telegram_group_ids: updatedRule.telegramGroupIds || []
        };
        const { error } = await supabase.from('alert_rules').update(dbPayload).eq('id', updatedRule.id);
        if (error) {
            console.error("❌ Error updating rule in Supabase:", error);
            throw new Error(`Error al actualizar la regla en la base de datos: ${error.message}`);
        }
        return updatedRule;
    }

    let rules = getStore<AlertRule>('sata_rules', []);
    rules = rules.map(r => r.id === updatedRule.id ? updatedRule : r);
    setStore('sata_rules', rules);
    return new Promise(resolve => setTimeout(() => resolve(updatedRule), apiDelay));
};

export const deleteRule = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('alert_rules').delete().eq('id', id);
        return { id };
    }

    let rules = getStore<AlertRule>('sata_rules', []);
    rules = rules.filter(r => r.id !== id);
    setStore('sata_rules', rules);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};


export const inviteUser = async (user: Omit<User, 'id' | 'status'> & { role?: UserRole }): Promise<{user: User, link: string, emailResult: {success: boolean, message: string}}> => {
    const supabase = await getSupabaseClient();
    const assignedRole = user.role || 'farm_user';
    const tempPassword = user.password || 'temp';
    const timestamp = Date.now();
    const tokenPayload = `${user.email}|${timestamp}|${user.companyRole}|Empresa`;
    const token = btoa(tokenPayload);
    
    // ROBUST LINK GENERATION FOR ALL ENVIRONMENTS (Preview, Vercel, Netlify)
    // 1. Get the current clean base URL (origin + pathname) without query/hash
    const baseUrl = window.location.href.split(/[?#]/)[0];
    
    // 2. Use HASH (#) strategy. This bypasses server-side 404s on static hosts because the server
    // only sees the base URL, and the client router picks up the token from the hash.
    const link = `${baseUrl}#token=${token}`;
    
    // Determine Company Name for Email
    let companyNameStr = "SATA";
    if (supabase && user.farmId) {
        const { data: farm } = await supabase.from('farms').select('name').eq('id', user.farmId).single();
        if (farm) companyNameStr = farm.name;
    }

    // CHECK IF USER EXISTS (RESEND LOGIC)
    let existingUser = null;
    if (supabase) {
        const { data } = await supabase.from('users').select('*').eq('email', user.email).single();
        existingUser = data;
    } else {
        const users = getStore<User>('sata_users', []);
        existingUser = users.find(u => u.email === user.email);
    }

    if (existingUser) {
        if (existingUser.status === 'Pendiente') {
            console.log("Resending invitation to existing pending user...");
        } else {
            throw new Error("El usuario ya está registrado y activo.");
        }
    }

    if (supabase) {
        if (!existingUser) {
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    name: user.name,
                    email: user.email,
                    password: tempPassword,
                    role: assignedRole,
                    status: 'Pendiente',
                    farm_id: user.farmId,
                    company_role: user.companyRole
                }])
                .select()
                .single();
            if (error) throw new Error("Error invitando usuario: " + error.message);
            existingUser = data;
        }
        
        let html, subject;
        if (assignedRole === 'sata_admin' || assignedRole === 'sata_tech') {
            subject = 'Bienvenido al Equipo - SATA CORP';
            html = generateInternalInviteHTML(user.name, assignedRole, link);
        } else {
            subject = `Invitación a Colaborar - ${companyNameStr}`;
            const roleName = user.companyRole === 'owner' ? 'PROPIETARIO' : user.companyRole === 'admin' ? 'ADMINISTRADOR' : 'MIEMBRO';
            html = generateAuthEmailHTML(
                `Te han invitado a ${companyNameStr}`, 
                `Hola ${user.name}, has sido invitado a formar parte de la empresa <strong>${companyNameStr}</strong> con el rol de <strong>${roleName}</strong>.`, 
                link, 
                'Aceptar Invitación y Crear Contraseña'
            );
        }

        const emailResult = await sendEmailViaResend({ to: [user.email], subject, html });

        return { 
            user: { ...existingUser, companyRole: user.companyRole, farmId: user.farmId, invitedAt: new Date(timestamp).toISOString() }, 
            link, 
            emailResult 
        };
    }

    // LOCAL STORAGE MOCK
    const users = getStore<User>('sata_users', []);
    let newUser = existingUser;
    
    if (!newUser) {
        newUser = { 
            ...user, 
            id: generateId(), 
            status: 'Pendiente' as 'Pendiente', 
            role: assignedRole,
            invitedAt: new Date(timestamp).toISOString()
        };
        const updatedUsers = [...users, newUser];
        setStore('sata_users', updatedUsers);
    }
    
    let html, subject;
     if (assignedRole === 'sata_admin' || assignedRole === 'sata_tech') {
        subject = 'Bienvenido al Equipo - SATA CORP';
        html = generateInternalInviteHTML(newUser.name, assignedRole, link);
    } else {
        subject = 'Invitación a Colaborar - SATA';
        const roleName = user.companyRole === 'owner' ? 'PROPIETARIO' : user.companyRole === 'admin' ? 'ADMINISTRADOR' : 'MIEMBRO';
        html = generateAuthEmailHTML('Te han invitado a SATA', `Hola ${newUser.name}, has sido invitado a colaborar en la plataforma SATA con el rol de ${roleName}.`, link, 'Aceptar Invitación');
    }

    const emailResult = await sendEmailViaResend({ to: [newUser.email], subject, html });
    return new Promise(resolve => setTimeout(() => resolve({ user: newUser, link, emailResult }), apiDelay));
};

export const deleteUser = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('users').delete().eq('id', id);
        return { id };
    }

    let users = getStore<User>('sata_users', []);
    users = users.filter(u => u.id !== id);
    setStore('sata_users', users);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};

// --- FARM (SEDE) DATA API ---
export const getFarms = async (farmId?: string): Promise<Farm[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('farms').select('*');
        if (farmId) {
            query = query.eq('id', farmId);
        }
        const { data, error } = await query;
        if (!error && data) return data;
    }

    const farms = getStore<Farm>('sata_farms', []);
    const filtered = farmId ? farms.filter(f => f.id === farmId) : farms;
    return new Promise(resolve => setTimeout(() => resolve([...filtered]), apiDelay));
};

export const addFarm = async (farm: Omit<Farm, 'id'>): Promise<Farm> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const { data, error } = await supabase.from('farms').insert([farm]).select().single();
        if (!error && data) return data;
    }

    const farms = getStore<Farm>('sata_farms', []);
    const newFarm = { ...farm, id: generateId() };
    const updatedFarms = [...farms, newFarm];
    setStore('sata_farms', updatedFarms);
    return new Promise(resolve => setTimeout(() => resolve(newFarm), apiDelay));
};
export const updateFarm = async (updatedFarm: Farm): Promise<Farm> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('farms').update(updatedFarm).eq('id', updatedFarm.id);
        return updatedFarm;
    }

    let farms = getStore<Farm>('sata_farms', []);
    farms = farms.map(f => f.id === updatedFarm.id ? updatedFarm : f);
    setStore('sata_farms', farms);
    return new Promise(resolve => setTimeout(() => resolve(updatedFarm), apiDelay));
};
export const deleteFarm = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('farms').delete().eq('id', id);
        return { id };
    }

    let farms = getStore<Farm>('sata_farms', []);
    farms = farms.filter(f => f.id !== id);
    setStore('sata_farms', farms);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};

// --- PREDICTION API ---
export const getPredictionHistory = async (farmId?: string): Promise<PredictionLog[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('prediction_logs').select('*');
        if (farmId) {
            query = query.eq('farm_id', farmId);
        }
        const { data } = await query;
        if (data) return data.map((d: any) => ({
             id: d.id,
             assetId: d.asset_id,
             farmId: d.farm_id,
             diseaseName: d.disease_name,
             scientificName: d.scientific_name,
             probability: d.probability,
             riskLevel: d.risk_level,
             description: d.description,
             recommendation: d.recommendation,
             affectedCrops: d.affected_crops,
             timestamp: d.timestamp
        }));
    }

    const logs = getStore<PredictionLog>('sata_predictions', []);
    return new Promise(resolve => {
        setTimeout(() => resolve(farmId ? logs.filter(l => l.farmId === farmId) : [...logs]), apiDelay);
    });
};

export const getPredictionSettings = async (): Promise<PredictionSettings> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const { data } = await supabase.from('prediction_settings').select('*').single();
        if (data) return {
            immediateAlertContactIds: data.immediate_alert_contact_ids || [],
            dailySummaryContactIds: data.daily_summary_contact_ids || [],
            emailEnabled: data.email_enabled
        };
    }

    const settings = localStorage.getItem('sata_pred_settings');
    const defaultSettings: PredictionSettings = {
        immediateAlertContactIds: [],
        dailySummaryContactIds: [],
        emailEnabled: false
    };
    return new Promise(resolve => 
        setTimeout(() => resolve(settings ? JSON.parse(settings) : defaultSettings), apiDelay)
    );
};

export const savePredictionSettings = async (settings: PredictionSettings): Promise<void> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        // Supabase implementation simplified
    }
    localStorage.setItem('sata_pred_settings', JSON.stringify(settings));
    return new Promise(resolve => setTimeout(() => resolve(), apiDelay));
};

// --- SCHEDULED REPORTS API ---
export const getScheduledReports = async (farmId?: string): Promise<ScheduledReport[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('scheduled_reports').select('*');
        if (farmId) {
            query = query.eq('farm_id', farmId);
        }
        const { data } = await query;
        if (data) return data.map((r: any) => ({
            id: r.id,
            assetId: r.asset_id,
            frequency: r.frequency,
            startDate: r.start_date,
            endDate: r.end_date,
            contactIds: r.contact_ids || [],
            createdAt: r.created_at
        }));
    }

    const reports = getStore<ScheduledReport>('sata_scheduled_reports', []);
    return new Promise(resolve => setTimeout(() => resolve([...reports]), apiDelay));
};

export const addScheduledReport = async (report: Omit<ScheduledReport, 'id' | 'createdAt'>): Promise<ScheduledReport> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
         const { data: asset } = await supabase.from('assets').select('farm_id').eq('id', report.assetId).single();
         if (asset) {
             const payload = {
                 asset_id: report.assetId,
                 farm_id: asset.farm_id,
                 frequency: report.frequency,
                 start_date: report.startDate,
                 end_date: report.endDate,
                 contact_ids: report.contactIds
             };
             const { data } = await supabase.from('scheduled_reports').insert([payload]).select().single();
             if(data) return {
                id: data.id,
                assetId: data.asset_id,
                frequency: data.frequency,
                startDate: data.start_date,
                endDate: data.end_date,
                contactIds: data.contact_ids,
                createdAt: data.created_at
             };
         }
    }

    const reports = getStore<ScheduledReport>('sata_scheduled_reports', []);
    const newReport: ScheduledReport = { ...report, id: generateId(), createdAt: new Date().toISOString() };
    const updatedReports = [...reports, newReport];
    setStore('sata_scheduled_reports', updatedReports);
    return new Promise(resolve => setTimeout(() => resolve(newReport), apiDelay));
};

export const deleteScheduledReport = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('scheduled_reports').delete().eq('id', id);
        return { id };
    }

    let reports = getStore<ScheduledReport>('sata_scheduled_reports', []);
    reports = reports.filter(r => r.id !== id);
    setStore('sata_scheduled_reports', reports);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};

// --- TELEGRAM GROUPS API ---
export const getTelegramGroups = async (farmId?: string): Promise<TelegramGroup[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('telegram_groups').select('*');
        if (farmId) {
            query = query.eq('farm_id', farmId);
        }
        const { data, error } = await query;
        if (!error && data) {
            return data.map((g: any) => ({
                id: g.id,
                chatId: g.chat_id,
                name: g.name,
                isActive: g.is_active,
                farmId: g.farm_id
            }));
        }
    }

    const groups = getStore<TelegramGroup>('sata_telegram_groups', []);
    return new Promise(resolve => {
        setTimeout(() => resolve(farmId ? groups.filter(g => g.farmId === farmId) : [...groups]), apiDelay);
    });
};

export const addTelegramGroup = async (group: Omit<TelegramGroup, 'id'>): Promise<TelegramGroup> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const payload = { 
            name: group.name, 
            chat_id: group.chatId, 
            is_active: group.isActive,
            farm_id: group.farmId 
        };
        const { data, error } = await supabase.from('telegram_groups').insert([payload]).select().single();
        if (!error && data) return { id: data.id, name: data.name, chatId: data.chat_id, isActive: data.is_active, farmId: data.farm_id };
    }

    const groups = getStore<TelegramGroup>('sata_telegram_groups', []);
    const newGroup = { ...group, id: generateId() };
    const updatedGroups = [...groups, newGroup];
    setStore('sata_telegram_groups', updatedGroups);
    return new Promise(resolve => setTimeout(() => resolve(newGroup), apiDelay));
};

export const updateTelegramGroup = async (updatedGroup: TelegramGroup): Promise<TelegramGroup> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        const payload = { 
            name: updatedGroup.name, 
            chat_id: updatedGroup.chatId, 
            is_active: updatedGroup.isActive
        };
        const { error } = await supabase.from('telegram_groups').update(payload).eq('id', updatedGroup.id);
        if (!error) return updatedGroup;
    }

    let groups = getStore<TelegramGroup>('sata_telegram_groups', []);
    groups = groups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    setStore('sata_telegram_groups', groups);
    return new Promise(resolve => setTimeout(() => resolve(updatedGroup), apiDelay));
};

export const deleteTelegramGroup = async (id: string): Promise<{ id: string }> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        await supabase.from('telegram_groups').delete().eq('id', id);
        return { id };
    }

    let groups = getStore<TelegramGroup>('sata_telegram_groups', []);
    groups = groups.filter(g => g.id !== id);
    setStore('sata_telegram_groups', groups);
    return new Promise(resolve => setTimeout(() => resolve({ id }), apiDelay));
};

// --- ALERT LOGS API ---
export const getAlertLogs = async (farmId?: string): Promise<AlertLog[]> => {
    const supabase = await getSupabaseClient();
    if (supabase) {
        let query = supabase.from('alert_logs').select('*, assets!inner(farm_id)');
        if (farmId) {
            query = query.eq('assets.farm_id', farmId);
        }
        const { data, error } = await query.order('timestamp', { ascending: false });
        if (!error && data) {
            return data.map((l: any) => ({
                id: l.id,
                greenhouseId: l.asset_id,
                alertType: l.alert_type,
                value: l.value,
                timestamp: l.timestamp,
                notifiedContacts: l.notified_contacts || []
            }));
        }
    }

    // Mock data for fallback
    const mockLogs: AlertLog[] = [
        { id: '1', greenhouseId: 'id_1', alertType: 'Temperatura Máxima', value: 32.5, timestamp: new Date().toISOString(), notifiedContacts: ['Admin', 'Jefe'] },
        { id: '2', greenhouseId: 'id_2', alertType: 'Humedad Máxima', value: 88.0, timestamp: new Date(Date.now() - 3600000).toISOString(), notifiedContacts: ['Gerente'] }
    ];
    
    return new Promise(resolve => setTimeout(() => resolve(mockLogs), apiDelay));
};
