import React, { useState, useEffect } from 'react';
import { User } from './types';
import Login from './features/auth/Login';
import FarmView from './features/farm/FarmView';
import AdminDashboard from './features/sata_admin/AdminDashboard';
import TechDashboard from './features/sata_tech/TechDashboard';

const App: React.FC = () => {
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [invitationToken, setInvitationToken] = useState<string | null>(null);

    useEffect(() => {
        // 1. Check for invitation token in URL (Support both Query ? and Hash #)
        const params = new URLSearchParams(window.location.search);
        let token = params.get('token');

        // Fallback: Check Hash (Fix for Static Preview & Vercel SPA handling)
        // This handles links like domain.com/#token=...
        if (!token && window.location.hash.includes('token=')) {
            const hashStr = window.location.hash.substring(1); // remove #
            const hashParams = new URLSearchParams(hashStr);
            token = hashParams.get('token');
        }

        if (token) {
            setInvitationToken(token);
            // Clean URL to avoid issues on reload, but keep the app state aware
            // We use replaceState to just clear the visible URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 2. Check for a logged-in user in session storage
        const storedUser = sessionStorage.getItem('loggedInUser');
        if (storedUser) {
            setLoggedInUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (user: User) => {
        sessionStorage.setItem('loggedInUser', JSON.stringify(user));
        setLoggedInUser(user);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('loggedInUser');
        setLoggedInUser(null);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
             <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
        </div>;
    }

    if (!loggedInUser) {
        return <Login onLogin={handleLogin} initialToken={invitationToken} />;
    }

    const renderUserView = () => {
        switch (loggedInUser.role) {
            case 'farm_user':
                return <FarmView user={loggedInUser} onLogout={handleLogout} />;
            case 'sata_admin':
                return <AdminDashboard user={loggedInUser} onLogout={handleLogout} />;
            case 'sata_tech':
                return <TechDashboard user={loggedInUser} onLogout={handleLogout} />;
            default:
                // Fallback to login if role is unknown
                handleLogout();
                return <Login onLogin={handleLogin} />;
        }
    };

    return <>{renderUserView()}</>;
};

export default App;