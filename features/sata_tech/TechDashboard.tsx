import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';
import Card from '../../components/Card';
import Table from '../../components/Table';
import { User, AlertLog } from '../../types';
import { getSupabaseClient } from '../../services/supabaseClient';
import { getAlertLogs } from '../../services/api';
import { ICONS } from '../../constants';

const TechDashboard: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentPage, setCurrentPage] = useState('tech_dashboard');
    
    // Status states
    const [supabaseStatus, setSupabaseStatus] = useState({ status: 'Comprobando...', latency: 0 });
    const [telegramStatus, setTelegramStatus] = useState({ status: 'Comprobando...' });
    const [resendStatus, setResendStatus] = useState({ status: 'Comprobando...' });
    
    // Data states
    const [recentLogs, setRecentLogs] = useState<AlertLog[]>([]);
    const [stats, setStats] = useState({ assets: 0, readings: 0, alerts: 0 });
    
    // Chart state
    const [latencyData, setLatencyData] = useState<{time: string, latency: number}[]>([]);

    useEffect(() => {
        checkInfrastructure();
        fetchSystemData();
        
        // Polling for latency and logs every 10 seconds
        const interval = setInterval(() => {
            checkSupabaseLatency();
            fetchSystemData();
        }, 10000);
        
        return () => clearInterval(interval);
    }, []);

    const checkInfrastructure = async () => {
        checkSupabaseLatency();

        // Check Telegram
        const tgToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
        if (!tgToken) {
            setTelegramStatus({ status: 'No Configurado (Falta Token)' });
        } else {
            try {
                const res = await fetch(`https://api.telegram.org/bot${tgToken}/getMe`);
                const data = await res.json();
                if (data.ok) setTelegramStatus({ status: 'Operativo' });
                else setTelegramStatus({ status: 'Error de Autenticación' });
            } catch (e) {
                setTelegramStatus({ status: 'Error de Conexión' });
            }
        }

        // Check Resend
        const resendToken = import.meta.env.VITE_RESEND_API_KEY;
        if (!resendToken) {
            setResendStatus({ status: 'No Configurado (Falta API Key)' });
        } else {
            // No easy way to ping Resend without sending an email, assume OK if token exists
            setResendStatus({ status: 'Configurado (API Key Activa)' });
        }
    };

    const checkSupabaseLatency = async () => {
        const start = performance.now();
        const supabase = await getSupabaseClient();
        if (supabase) {
            try {
                // simple query to measure response time
                await supabase.from('assets').select('id', { count: 'exact', head: true });
                const end = performance.now();
                const ms = Math.round(end - start);
                setSupabaseStatus({ status: 'Operativo', latency: ms });
                
                setLatencyData(prev => {
                    const next = [...prev, { time: new Date().toLocaleTimeString(), latency: ms }];
                    if (next.length > 15) next.shift();
                    return next;
                });
            } catch (e) {
                setSupabaseStatus({ status: 'Error de Conexión', latency: 0 });
            }
        } else {
            setSupabaseStatus({ status: 'No Configurado', latency: 0 });
        }
    };

    const fetchSystemData = async () => {
        const supabase = await getSupabaseClient();
        if (!supabase) return;

        // Fetch counts safely
        const { count: assetsCount } = await supabase.from('assets').select('id', { count: 'exact', head: true });
        // Readings count might be large, just get an estimate or exact if small
        const { count: readingsCount } = await supabase.from('sensor_readings').select('id', { count: 'exact', head: true });
        const { count: alertsCount } = await supabase.from('alert_logs').select('id', { count: 'exact', head: true });

        setStats({
            assets: assetsCount || 0,
            readings: readingsCount || 0,
            alerts: alertsCount || 0
        });

        // Fetch recent logs
        const { data: logs, error: logsError } = await supabase
            .from('alert_logs')
            .select('*, assets(name)')
            .order('timestamp', { ascending: false })
            .limit(10);

        if (logsError) {
            console.error("Error al obtener logs de alertas:", logsError);
        }

        if (logs) {
            const formattedLogs = logs.map(l => {
                let contacts: string[] = [];
                try {
                    contacts = Array.isArray(l.contacts_notified)
                        ? l.contacts_notified
                        : typeof l.contacts_notified === 'string'
                            ? JSON.parse(l.contacts_notified)
                            : [];
                } catch (e) {
                    contacts = [];
                }

                return {
                    id: l.id,
                    ruleId: l.rule_id,
                    message: l.message || `Parámetro fuera de rango (Valor: ${l.value})`,
                    timestamp: l.timestamp,
                    type: l.type || 'Límite Excedido',
                    severity: l.severity || (l.type?.includes('Máxima') ? 'High' : 'Medium'),
                    notifiedContacts: contacts,
                    assetName: l.assets?.name || 'Dispositivo IoT'
                };
            }) as unknown as AlertLog[];
            setRecentLogs(formattedLogs);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Operativo' || status.includes('Activa')) {
            return <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">🟢 {status}</span>;
        }
        if (status.includes('No Configurado') || status.includes('Falta')) {
            return <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">⚪ {status}</span>;
        }
        return <span className="px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">🔴 {status}</span>;
    };
    
    return (
        <Layout 
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            user={user}
            onLogout={onLogout}
        >
             <div className="space-y-6">
                
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase">Lecturas Registradas</p>
                            <p className="text-4xl font-bold text-white mt-1">{stats.readings}</p>
                        </div>
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">{ICONS.server}</div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase">Activos IoT Conectados</p>
                            <p className="text-4xl font-bold text-white mt-1">{stats.assets}</p>
                        </div>
                        <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm font-bold uppercase">Alertas Disparadas</p>
                            <p className="text-4xl font-bold text-white mt-1">{stats.alerts}</p>
                        </div>
                        <div className="p-3 bg-red-500/20 rounded-full text-red-400">{ICONS.bell}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card title="Estado de Infraestructura" className="lg:col-span-1">
                        <ul className="space-y-4">
                            <li className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700">
                                <div>
                                    <p className="text-white font-semibold">Supabase (Base de Datos)</p>
                                    <p className="text-xs text-slate-400">Latencia actual: {supabaseStatus.latency}ms</p>
                                </div>
                                {getStatusBadge(supabaseStatus.status)}
                            </li>
                            <li className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700">
                                <div>
                                    <p className="text-white font-semibold">Bot de Telegram</p>
                                    <p className="text-xs text-slate-400">Notificaciones y Alertas</p>
                                </div>
                                {getStatusBadge(telegramStatus.status)}
                            </li>
                            <li className="flex justify-between items-center p-3 bg-slate-800/50 rounded border border-slate-700">
                                <div>
                                    <p className="text-white font-semibold">Resend (Mailing)</p>
                                    <p className="text-xs text-slate-400">Correos y Reportes</p>
                                </div>
                                {getStatusBadge(resendStatus.status)}
                            </li>
                        </ul>
                    </Card>

                    <Card title="Latencia Base de Datos (Supabase DB)" className="lg:col-span-2">
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer>
                                <LineChart data={latencyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155"/>
                                    <XAxis dataKey="time" tick={{ fill: '#94a3b8' }}/>
                                    <YAxis domain={[0, 'auto']} label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} tick={{ fill: '#94a3b8' }}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}/>
                                    <Line type="monotone" dataKey="latency" stroke="#3b82f6" dot={true} strokeWidth={2}/>
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                <Card title="Últimas Interacciones de Alerta (Logs Reales del Sistema)">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700 text-sm text-slate-400">
                                    <th className="p-3">Fecha y Hora</th>
                                    <th className="p-3">Activo IoT</th>
                                    <th className="p-3">Tipo de Alerta</th>
                                    <th className="p-3">Mensaje</th>
                                    <th className="p-3">Notificaciones Enviadas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentLogs.length > 0 ? recentLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors text-sm">
                                        <td className="p-3 text-slate-300">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-3 font-semibold text-white">
                                            {(log as any).assetName || 'Desconocido'}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                log.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                                                log.severity === 'High' ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-300">
                                            {log.message}
                                        </td>
                                        <td className="p-3 text-slate-400">
                                            {log.notifiedContacts && log.notifiedContacts.length > 0 
                                                ? log.notifiedContacts.join(', ')
                                                : <span className="italic text-slate-500">Ninguna</span>
                                            }
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                            No hay registros recientes en la base de datos de alertas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </Layout>
    );
};

export default TechDashboard;

