import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import { User } from '../../types';

const generateLatencyData = () => ({
  time: new Date().toLocaleTimeString(),
  latency: 50 + Math.random() * 50,
});

const TechDashboard: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState('tech_dashboard');
    const [latencyData, setLatencyData] = useState(() => Array.from({ length: 10 }, generateLatencyData));
    const [serverLoad, setServerLoad] = useState(45);

    useEffect(() => {
        const interval = setInterval(() => {
            setLatencyData(prevData => [...prevData.slice(1), generateLatencyData()]);
            setServerLoad(20 + Math.random() * 60);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const services = [
        { name: 'API Gateway', status: 'Operational' },
        { name: 'Database Cluster', status: 'Operational' },
        { name: 'SMS Notification Service', status: 'Operational' },
        { name: 'Data Processing Workers', status: 'Operational' },
    ];
    
    return (
        <Layout 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            user={user}
            onLogout={onLogout}
        >
             <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Global Service Status" className="lg:col-span-1">
                        <ul className="space-y-3">
                            {services.map(service => (
                                <li key={service.name} className="flex justify-between items-center">
                                    <span className="text-slate-300">{service.name}</span>
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100/10 text-green-400">
                                        {service.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card title="Real-time Server Load" className="lg:col-span-2">
                         <div className="w-full bg-slate-700 rounded-full h-4 mb-4">
                            <div 
                                className="bg-primary h-4 rounded-full transition-all duration-500" 
                                style={{ width: `${serverLoad}%` }}
                            ></div>
                        </div>
                        <p className="text-center text-2xl font-semibold">{serverLoad.toFixed(1)}%</p>
                    </Card>
                </div>
                <Card title="API Latency (last minute)">
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={latencyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                                <XAxis dataKey="time" tick={{ fill: '#94a3b8' }}/>
                                <YAxis domain={[0, 150]} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} tick={{ fill: '#94a3b8' }}/>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}/>
                                <Line type="monotone" dataKey="latency" stroke="#22c55e" dot={false} strokeWidth={2}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </Layout>
    );
};

export default TechDashboard;
