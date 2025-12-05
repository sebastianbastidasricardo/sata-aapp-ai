
import React from 'react';
import { User, Page } from '../types';
import { ICONS } from '../constants';

interface HeaderProps {
    currentPage: Page | string;
    user: User;
    onLogout: () => void;
    onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    contacts: 'Gestión de Contactos',
    rules: 'Gestión de Reglas de Alerta',
    reports: 'Generador de Reportes',
    logs: 'Log de Alertas Enviadas',
    users: 'Usuarios',
    settings: 'Configuración de la Empresa',
    predictions: 'Predicciones AI & Prevención',
    admin_dashboard: 'SATA Global Dashboard',
    user_management: 'SATA User Management',
    tech_dashboard: 'SATA Infrastructure Monitoring'
};

const Header: React.FC<HeaderProps> = ({ currentPage, user, onLogout, onMenuClick }) => {
    return (
        <header className="flex justify-between items-center py-4 px-6 bg-card border-b-2 border-border">
            <div className="flex items-center">
                <button onClick={onMenuClick} className="text-slate-400 focus:outline-none md:hidden">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6H20M4 12H20M4 18H11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1 className="text-2xl font-semibold text-slate-200 ml-4 md:ml-0">{pageTitles[currentPage]}</h1>
            </div>
             <div className="flex items-center">
                <span className="text-sm text-slate-300 mr-4">{user.name}</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded mr-4 capitalize">
                    {user.companyRole || user.role.replace('sata_', '')}
                </span>
                <button onClick={onLogout} className="text-slate-400 hover:text-white" title="Logout">
                    {ICONS.logout}
                </button>
            </div>
        </header>
    );
};

export default Header;
