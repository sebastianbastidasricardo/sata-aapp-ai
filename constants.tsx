import React from 'react';
import { Contact, Greenhouse, AlertRule, AlertType, AlertLog, User, Farm, SensorData, PredictionLog } from './types';

// Mock Data
export const MOCK_FARMS: Farm[] = [
    { id: 'f1', name: 'Sede Principal - Bogota', timezone: 'America/Bogota' },
    { id: 'f2', name: 'Planta Producción - Tocancipá', timezone: 'America/Bogota' },
    { id: 'f3', name: 'Centro de Acopio - Medellín', timezone: 'America/Bogota' },
];

export const MOCK_CONTACTS: Contact[] = [
    { id: 'c1', name: 'Juan Pérez', phone: '+525512345678', email: 'juan.perez@empresa.com' },
    { id: 'c2', name: 'Maria García', phone: '+525587654321', email: 'maria.garcia@empresa.com' },
    { id: 'c3', name: 'Carlos Sanchez', phone: '+525511223344', email: 'carlos.sanchez@empresa.com' },
];

export const MOCK_GREENHOUSES: Greenhouse[] = [
    { id: 'g1', name: 'Activo Zona Principal', farmId: 'f1', assetType: 'Invernadero', devEUI: 'A1B2C3D4E5F60001', location: 'Norte' },
    { id: 'g2', name: 'Silo Principal', farmId: 'f2', assetType: 'Silo', devEUI: 'A1B2C3D4E5F60002', location: 'Centro' },
    { id: 'g3', name: 'Bodega de Secado', farmId: 'f3', assetType: 'Otro', customType: 'Bodega', devEUI: 'A1B2C3D4E5F60003', location: 'Sur' },
];

export const MOCK_RULES: AlertRule[] = [
    { id: 'r1', greenhouseId: 'g1', type: AlertType.TEMP_MAX, threshold: 30, contactIds: ['c1', 'c2'] },
    { id: 'r2', greenhouseId: 'g1', type: AlertType.TEMP_MIN, threshold: 10, contactIds: ['c1'] },
    { id: 'r3', greenhouseId: 'g2', type: AlertType.HUMIDITY_MAX, threshold: 85, contactIds: ['c2', 'c3'] },
];

export const MOCK_ALERT_LOGS: AlertLog[] = [
    { id: 'l1', timestamp: new Date('2023-10-27T14:30:00Z'), greenhouseId: 'g1', alertType: AlertType.TEMP_MAX, value: 31.2, notifiedContacts: ['Juan Pérez', 'Maria García'] },
    { id: 'l2', timestamp: new Date('2023-10-27T08:15:00Z'), greenhouseId: 'g2', alertType: AlertType.HUMIDITY_MAX, value: 87, notifiedContacts: ['Maria García', 'Carlos Sanchez'] },
    { id: 'l3', timestamp: new Date('2023-10-26T23:05:00Z'), greenhouseId: 'g1', alertType: AlertType.TEMP_MIN, value: 9.5, notifiedContacts: ['Juan Pérez'] },
    { id: 'l4', timestamp: new Date('2023-10-26T15:00:00Z'), greenhouseId: 'g3', alertType: AlertType.TEMP_MAX, value: 32, notifiedContacts: ['Carlos Sanchez'] },
];

export const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Admin SATA', email: 'admin@sata.com', password: 'password', status: 'Activo', role: 'sata_admin' },
    { id: 'u2', name: 'Técnico Monitoreo', email: 'tech@sata.com', password: 'password', status: 'Activo', role: 'sata_tech' },
    { id: 'u3', name: 'Gerente Propietario', email: 'gerente@empresa.com', password: 'password', status: 'Activo', role: 'farm_user', farmId: 'f1', companyRole: 'owner' },
    { id: 'u4', name: 'Admin Operativo', email: 'admin@empresa.com', password: 'password', status: 'Activo', role: 'farm_user', farmId: 'f1', companyRole: 'admin' },
    { id: 'u5', name: 'Miembro Visualizador', email: 'miembro@empresa.com', password: 'password', status: 'Activo', role: 'farm_user', farmId: 'f1', companyRole: 'member' },
];

export const MOCK_PREDICTION_HISTORY: PredictionLog[] = [
    { 
        id: 'pred_001', 
        assetId: 'g1', 
        farmId: 'f1',
        diseaseName: 'Moho Gris (Botrytis)',
        scientificName: 'Botrytis cinerea',
        probability: 88, 
        riskLevel: 'Critical',
        description: 'Alta humedad persistente detectada en la madrugada.',
        recommendation: 'Ventilar inmediatamente.',
        affectedCrops: ['Fresas'],
        timestamp: new Date(Date.now() - 86400000).toISOString() // Yesterday
    },
    { 
        id: 'pred_002', 
        assetId: 'g2', 
        farmId: 'f2',
        diseaseName: 'Riesgo de Aflatoxinas',
        scientificName: 'Aspergillus flavus',
        probability: 72, 
        riskLevel: 'High',
        description: 'Temperatura en silo superior a 25°C.',
        recommendation: 'Activar aireación.',
        affectedCrops: ['Maíz'],
        timestamp: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
];

export const MOCK_SENSOR_DATA: {[key: string]: SensorData[]} = {
    g1: Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, '0')}:00`,
        temperature: 18 + Math.sin(i / 3) * 10 + Math.random() * 2,
        humidity: 60 + Math.cos(i / 4) * 15 + Math.random() * 5,
    })),
    g2: Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, '0')}:00`,
        temperature: 20 + Math.sin(i / 3.5) * 8 + Math.random() * 2.5,
        humidity: 70 + Math.cos(i / 3) * 10 + Math.random() * 4,
    })),
    g3: Array.from({ length: 24 }, (_, i) => ({
        time: `${String(i).padStart(2, '0')}:00`,
        temperature: 22 + Math.sin(i / 2.5) * 9 + Math.random() * 1.5,
        humidity: 65 + Math.cos(i / 5) * 12 + Math.random() * 6,
    })),
};

// Icons
export const ICONS = {
    // ANIMATED BRAND LOGO: Elegant color shift - TEXT ONLY
    logo: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 50" fill="none">
        <defs>
            <linearGradient id="brand-gradient-anim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#22c55e">
                    <animate attributeName="stop-color" values="#22c55e; #3b82f6; #0ea5e9; #22c55e" dur="8s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#3b82f6">
                    <animate attributeName="stop-color" values="#3b82f6; #10b981; #6366f1; #3b82f6" dur="8s" repeatCount="indefinite" />
                </stop>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        
        {/* SATA Text - Centered */}
        <text x="50%" y="38" textAnchor="middle" fontFamily="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" fontWeight="900" fontSize="42" fill="url(#brand-gradient-anim)" letterSpacing="2" filter="url(#glow)">SATA</text>
    </svg>,
    
    dashboard: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    contacts: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><rect width="18" height="18" x="3" y="4" rx="2"/><circle cx="12" cy="10" r="2"/><line x1="8" x2="8" y1="2" y2="4"/><line x1="16" x2="16" y1="2" y2="4"/></svg>,
    rules: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>,
    reports: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13h-2.5V9"/><path d="M8 17h8"/></svg>,
    logs: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18h.01"/><path d="M12 13v3"/></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    plus: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>,
    edit: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>,
    trash: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    leaf: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 4 13V8a5 5 0 0 1 10 0v5a7 7 0 0 1-7 7Zm0 0v-5"/><path d="M12.5 8c3 0 5-2 5-5s-2-5-5-5-5 2-5 5c0 1.44 1.9 3.25 3 4s2 2 2 2Z"/></svg>,
    close: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
    logout: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
    users: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    server: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>,
    globe: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>,
    brain: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
    bell: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
    download: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>,
};
