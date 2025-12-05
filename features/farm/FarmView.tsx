
import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Dashboard from '../Dashboard';
import ContactManager from '../contacts/ContactManager';
import RuleManager from '../rules/RuleManager';
import ReportGenerator from '../reports/ReportGenerator';
import AlertLogViewer from '../logs/AlertLogViewer';
import SettingsManager from '../settings/SettingsManager';
import UserManager from '../users/UserManager';
import PredictionManager from '../predictions/PredictionManager';
import { User, Page } from '../../types';

interface FarmViewProps {
    user: User;
    onLogout: () => void;
}

const FarmView: React.FC<FarmViewProps> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState<Page | string>('dashboard');

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard currentUser={user} />;
            case 'contacts':
                return <ContactManager currentUser={user} />;
            case 'rules':
                return <RuleManager currentUser={user} />;
            case 'reports':
                return <ReportGenerator currentUser={user} />;
            case 'logs':
                return <AlertLogViewer currentUser={user} />;
            case 'users':
                return <UserManager currentUser={user} />;
            case 'settings':
                return <SettingsManager user={user} />;
            case 'predictions':
                return <PredictionManager currentUser={user} />;
            default:
                return <Dashboard currentUser={user} />;
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

export default FarmView;
