-- ==============================================================================
-- SATA CORP - Script de Inicialización con RLS (Row Level Security) Activado
-- ==============================================================================
-- IMPORTANTE: Este script BORRARÁ los datos existentes si las tablas ya existen.
-- Se recomienda ejecutar esto en un entorno de desarrollo o en un proyecto nuevo.
-- ==============================================================================

-- 1. Eliminar tablas existentes (si las hay) para evitar conflictos
DROP TABLE IF EXISTS alert_logs CASCADE;
DROP TABLE IF EXISTS telegram_groups CASCADE;
DROP TABLE IF EXISTS scheduled_reports CASCADE;
DROP TABLE IF EXISTS prediction_settings CASCADE;
DROP TABLE IF EXISTS prediction_logs CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS farms CASCADE;

-- 2. Crear Tabla de Fincas / Empresas (Farms)
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    timezone TEXT DEFAULT 'America/Bogota',
    subscription_plan TEXT DEFAULT 'Free',
    payment_status TEXT DEFAULT 'Activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en farms" ON farms FOR ALL USING (true) WITH CHECK (true);

-- 2. Crear Tabla de Usuarios (Users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    role TEXT DEFAULT 'farm_user',
    status TEXT DEFAULT 'Pendiente',
    company_role TEXT,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en users" ON users FOR ALL USING (true) WITH CHECK (true);

-- 3. Crear Tabla de Contactos (Contacts)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en contacts" ON contacts FOR ALL USING (true) WITH CHECK (true);

-- 4. Crear Tabla de Activos / Dispositivos (Assets)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    dev_eui TEXT UNIQUE,
    location TEXT,
    component_type TEXT,
    battery_level NUMERIC DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en assets" ON assets FOR ALL USING (true) WITH CHECK (true);

-- 5. Crear Tabla de Reglas de Alertas (Alert Rules)
CREATE TABLE alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    threshold NUMERIC NOT NULL,
    contact_ids JSONB DEFAULT '[]'::JSONB,
    telegram_group_ids JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en alert_rules" ON alert_rules FOR ALL USING (true) WITH CHECK (true);

-- 6. Crear Tabla de Logs de Predicciones (Prediction Logs)
CREATE TABLE prediction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    disease_name TEXT,
    scientific_name TEXT,
    probability NUMERIC,
    risk_level TEXT,
    description TEXT,
    recommendation TEXT,
    affected_crops JSONB DEFAULT '[]'::JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE prediction_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en prediction_logs" ON prediction_logs FOR ALL USING (true) WITH CHECK (true);

-- 7. Crear Tabla de Configuraciones de Predicción (Prediction Settings)
CREATE TABLE prediction_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    immediate_alert_contact_ids JSONB DEFAULT '[]'::JSONB,
    daily_summary_contact_ids JSONB DEFAULT '[]'::JSONB,
    email_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE prediction_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en prediction_settings" ON prediction_settings FOR ALL USING (true) WITH CHECK (true);

-- 8. Crear Tabla de Reportes Programados (Scheduled Reports)
CREATE TABLE scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    contact_ids JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en scheduled_reports" ON scheduled_reports FOR ALL USING (true) WITH CHECK (true);

-- 9. Crear Tabla de Grupos de Telegram (Telegram Groups)
CREATE TABLE telegram_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    thread_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en telegram_groups" ON telegram_groups FOR ALL USING (true) WITH CHECK (true);

-- 10. Crear Tabla de Logs de Alertas (Alert Logs)
CREATE TABLE alert_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    type TEXT,
    message TEXT,
    severity TEXT,
    value NUMERIC,
    status TEXT DEFAULT 'Unresolved',
    contacts_notified JSONB DEFAULT '[]'::JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en alert_logs" ON alert_logs FOR ALL USING (true) WITH CHECK (true);

-- 11. Crear Tabla de Lecturas de Sensores Reales/Simulados (Sensor Readings)
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    temperature NUMERIC,
    humidity NUMERIC,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a todos en sensor_readings" ON sensor_readings FOR ALL USING (true) WITH CHECK (true);
