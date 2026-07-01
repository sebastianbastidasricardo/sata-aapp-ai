

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  farmId?: string;
}

export type AssetType = 'Invernadero' | 'Silo' | 'Otro';
export type AssetLocation = 'Norte' | 'Centro' | 'Sur';

export interface Greenhouse {
  id: string;
  name: string;
  farmId: string;
  assetType: AssetType;
  customType?: string;
  devEUI: string;
  location: AssetLocation;
}

export enum AlertType {
  TEMP_MIN = 'Temperatura Mínima',
  TEMP_MAX = 'Temperatura Máxima',
  HUMIDITY_MAX = 'Humedad Máxima',
}

export interface AlertRule {
  id: string;
  greenhouseId: string;
  type: AlertType;
  threshold: number;
  contactIds: string[];
  telegramGroupIds?: string[];
}

export type UserRole = 'sata_admin' | 'sata_tech' | 'farm_user';
export type CompanyRole = 'owner' | 'admin' | 'member';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    status: 'Activo' | 'Pendiente' | 'Bloqueado' | 'Inactivo';
    role: UserRole;
    farmId?: string; // Associates a farm_user with a farm
    companyRole?: CompanyRole; // Specific role within the company
    companyName?: string; // Optional, used during registration
    invitedAt?: string; // ISO String for invitation timestamp
}

export interface Farm {
    id: string;
    name: string;
    timezone: string;
}

export interface SensorData {
    time: string;
    temperature: number;
    humidity: number;
}

export interface SensorReading {
    assetId: string;
    temperature: number;
    humidity: number;
    battery: number;
    history: { time: string; temp: number; hum: number }[];
}

export interface DbSensorReading {
    id: string;
    assetId: string;
    farmId: string;
    temperature: number;
    humidity: number;
    timestamp: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Prediction {
    id: string;
    assetId: string;
    diseaseName: string;
    scientificName?: string;
    probability: number; // 0-100
    riskLevel: RiskLevel;
    description: string;
    recommendation: string;
    affectedCrops: string[];
}

export interface PredictionLog extends Prediction {
    timestamp: string; // ISO String
    farmId: string;
}

export interface PredictionSettings {
    immediateAlertContactIds: string[];
    dailySummaryContactIds: string[];
    emailEnabled: boolean;
}

export interface ScheduledReport {
    id: string;
    assetId: string;
    frequency: 'Diario' | 'Semanal' | 'Mensual';
    startDate: string;
    endDate: string;
    contactIds: string[];
    createdAt: string;
}

export interface SystemSettings {
    resendApiKey: string;
    senderEmail: string; // e.g., 'no-reply@agrosata.online' or 'alerts@sata.com'
    supabaseUrl?: string;
    supabaseKey?: string;
    telegramBotToken?: string;
}

export interface AlertLog {
    id: string;
    greenhouseId: string;
    alertType: string;
    value: number;
    timestamp: string;
    notifiedContacts: string[];
    severity?: string;
    type?: string;
    message?: string;
}

export type Page = 'dashboard' | 'contacts' | 'rules' | 'reports' | 'users' | 'settings' | 'predictions' | 'notification_groups';

export interface TelegramGroup {
    id: string;
    chatId: string;
    name: string;
    isActive: boolean;
    farmId: string;
}
