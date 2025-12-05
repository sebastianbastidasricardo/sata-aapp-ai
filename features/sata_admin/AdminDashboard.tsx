import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { User } from '../../types';
import UserManagement from './UserManagement';
import GlobalDashboard from './GlobalDashboard';


const AdminDashboard: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState('admin_dashboard');

    const renderPage = () => {
        switch (currentPage) {
            case 'admin_dashboard':
                return <GlobalDashboard currentUser={user} />;
            case 'user_management':
                return <UserManagement />;
            default:
                return <GlobalDashboard currentUser={user} />;
        }
    };
    
    return (
        <Layout 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            user={user}
            onLogout={onLogout}
        >
            {renderPage()}
        </Layout>
    );
};

export default AdminDashboard;