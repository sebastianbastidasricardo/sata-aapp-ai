
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { User, Page } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    currentPage: Page | string;
    setCurrentPage: (page: Page | string) => void;
    user: User;
    onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, setCurrentPage, user, onLogout }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    return (
        <div className="flex h-screen bg-background">
            <Sidebar 
                currentPage={currentPage} 
                setCurrentPage={setCurrentPage} 
                isOpen={sidebarOpen} 
                setIsOpen={setSidebarOpen}
                role={user.role}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    currentPage={currentPage} 
                    user={user}
                    onLogout={onLogout}
                    onMenuClick={() => setSidebarOpen(true)} 
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
                    <div className="container mx-auto px-3 py-4 md:px-6 md:py-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
