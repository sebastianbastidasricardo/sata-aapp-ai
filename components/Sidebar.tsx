
import React from 'react';
import { ICONS } from '../constants';
import { UserRole, Page } from '../types';

interface NavItem {
    page: Page | string;
    label: string;
    icon: React.ReactNode;
}

const farmNavItems: NavItem[] = [
    { page: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard },
    { page: 'contacts', label: 'Contactos', icon: ICONS.contacts },
    { page: 'rules', label: 'Reglas de Alerta', icon: ICONS.rules },
    { page: 'reports', label: 'Reportes', icon: ICONS.reports },
    { page: 'predictions', label: 'Predicciones AI', icon: ICONS.brain },
    { page: 'logs', label: 'Log de Alertas', icon: ICONS.logs },
    { page: 'users', label: 'Usuarios', icon: ICONS.users },
    { page: 'settings', label: 'Configuración', icon: ICONS.settings },
];

const adminNavItems: NavItem[] = [
    { page: 'admin_dashboard', label: 'Global Dashboard', icon: ICONS.globe },
    { page: 'user_management', label: 'Manage Users', icon: ICONS.users },
];

const techNavItems: NavItem[] = [
    { page: 'tech_dashboard', label: 'Infra Monitoring', icon: ICONS.server },
];

interface SidebarProps {
    currentPage: Page | string;
    setCurrentPage: (page: Page | string) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    role: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isOpen, setIsOpen, role }) => {
    
    let navItems: NavItem[] = farmNavItems;
    if (role === 'sata_admin') navItems = adminNavItems;
    if (role === 'sata_tech') navItems = techNavItems;

    const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
        const isActive = currentPage === item.page;
        const baseClasses = "flex items-center px-4 py-3 text-slate-300 transition-colors duration-200 transform rounded-lg";
        const activeClasses = "bg-primary text-white";
        const inactiveClasses = "hover:bg-slate-700 hover:text-slate-100";
        
        return (
            <a
                href="#"
                className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(item.page);
                    if (window.innerWidth < 768) {
                       setIsOpen(false);
                    }
                }}
            >
                {item.icon}
                <span className="mx-4 font-medium">{item.label}</span>
            </a>
        );
    };

    return (
        <>
        <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>
        <div className={`fixed inset-y-0 left-0 w-64 bg-card text-white transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-30 border-r border-border`}>
            {/* BRAND HEADER */}
            <div className="flex items-center justify-center mt-8 mb-8">
                <div className="h-12 w-48 flex items-center justify-center">
                    {ICONS.logo}
                </div>
            </div>

            <nav className="px-2 space-y-2">
                {navItems.map(item => (
                    <NavLink key={item.page} item={item} />
                ))}
            </nav>
        </div>
        </>
    );
};

export default Sidebar;