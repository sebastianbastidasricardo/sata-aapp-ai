
import React, { useState, useEffect, useMemo } from 'react';
import { 
    ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
    ZAxis, CartesianGrid, Tooltip, Legend, ReferenceArea
} from 'recharts';
import { jsPDF } from 'jspdf';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Select from '../../components/Select';
import Table from '../../components/Table';
import { Greenhouse, Prediction, RiskLevel, PredictionLog, Farm, Contact, User } from '../../types';
import { getGreenhouses, getPredictionHistory, getFarms, getContacts, getPredictionSettings, savePredictionSettings, getSystemSettings } from '../../services/api';
import { analyzeAssetRisk, generateSimulatedHistory, SimulatedMetric } from '../../services/aiEngine';
import { ICONS } from '../../constants';

// --- Sub-components ---

const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
    const colors = {
        Low: 'bg-green-500/20 text-green-400 border-green-500',
        Medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
        High: 'bg-orange-500/20 text-orange-400 border-orange-500',
        Critical: 'bg-red-500/20 text-red-400 border-red-500',
    };
    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[level]}`}>
            {level.toUpperCase()}
        </span>
    );
};

const PredictionCard: React.FC<{ prediction: Prediction }> = ({ prediction }) => {
    return (
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700 shadow-lg hover:border-slate-500 transition-colors">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-lg font-bold text-white">{prediction.diseaseName}</h3>
                    {prediction.scientificName && (
                        <p className="text-xs text-slate-400 italic">{prediction.scientificName}</p>
                    )}
                </div>
                <div className="text-right">
                    <RiskBadge level={prediction.riskLevel} />
                    <p className="text-2xl font-bold mt-1 text-white">{prediction.probability}%</p>
                    <p className="text-[10px] text-slate-500 uppercase">Probabilidad</p>
                </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-4 bg-slate-900/50 p-3 rounded border border-slate-800">
                {prediction.description}
            </p>

            <div className="space-y-2">
                <div className="flex items-start">
                    <div className="bg-primary/20 p-1 rounded text-primary mt-0.5 mr-2">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m11.6 16.8a3 3 0 1 1-5.8-1.6"/><path d="m18 3.8c0 1.3-.4 2.6-1.3 3.5l-2.4 2.4"/><path d="m21.2 6.4-2.4 2.4c-.9.9-2.2 1.3-3.5 1.3"/></svg>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Recomendación IA</p>
                        <p className="text-sm text-white">{prediction.recommendation}</p>
                    </div>
                </div>
                
                {prediction.affectedCrops.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                         {prediction.affectedCrops.map(crop => (
                             <span key={crop} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                                 {crop}
                             </span>
                         ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const HeatMap: React.FC<{ data: SimulatedMetric[] }> = ({ data }) => {
    return (
        <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm text-slate-400 font-semibold uppercase">Mapa de Calor: Riesgo (24h)</h4>
                <div className="flex gap-3 text-[10px] font-medium text-slate-400">
                    <div className="flex items-center"><span className="w-3 h-3 rounded bg-green-500/20 border border-green-500 mr-1"></span> Bajo</div>
                    <div className="flex items-center"><span className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500 mr-1"></span> Medio</div>
                    <div className="flex items-center"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500 mr-1"></span> Alto</div>
                </div>
            </div>
            
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {data.map((point) => {
                    // Risk Logic Visualization
                    const isCritical = (point.hum > 85 && point.temp > 15 && point.temp < 28) || point.temp < 4 || point.temp > 35;
                    const isHigh = !isCritical && ((point.hum > 75) || point.temp > 30);
                    
                    let bgClass = 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/40';
                    if (isCritical) bgClass = 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/40 animate-pulse';
                    else if (isHigh) bgClass = 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/40';

                    return (
                        <div key={point.hour} className={`group relative h-12 w-full rounded border ${bgClass} flex flex-col items-center justify-center transition-all cursor-help`}>
                             <span className="text-[10px] font-bold">{point.hour}:00</span>
                             
                             {/* Tooltip */}
                             <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs p-2 rounded z-50 whitespace-nowrap border border-slate-600 shadow-xl">
                                 <div className="font-bold border-b border-slate-700 mb-1 pb-1">Hora: {point.hour}:00</div>
                                 <div>Temp: <span className={point.temp > 30 || point.temp < 5 ? 'text-red-400' : 'text-slate-300'}>{point.temp.toFixed(1)}°C</span></div>
                                 <div>Hum: <span className={point.hum > 80 ? 'text-blue-400' : 'text-slate-300'}>{point.hum.toFixed(0)}%</span></div>
                             </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- PREDICTION TABS ---

// 1. Live Monitor
const LiveMonitorTab: React.FC<{ assets: Greenhouse[] }> = ({ assets }) => {
    const [selectedAssetId, setSelectedAssetId] = useState<string>('');
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [historyData, setHistoryData] = useState<SimulatedMetric[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        if (assets.length > 0 && !selectedAssetId) setSelectedAssetId(assets[0].id);
    }, [assets]);

    useEffect(() => {
        if (!selectedAssetId) return;
        setIsAnalyzing(true);
        setPredictions([]); 
        const timer = setTimeout(() => {
            const asset = assets.find(a => a.id === selectedAssetId);
            if (asset) {
                const history = generateSimulatedHistory(asset.id);
                setHistoryData(history);
                const results = analyzeAssetRisk(asset, history);
                setPredictions(results);
            }
            setIsAnalyzing(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, [selectedAssetId, assets]);

    return (
        <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border border-border flex flex-col md:flex-row justify-between md:items-end gap-6">
                 <div>
                    <h3 className="text-lg font-bold text-white">Análisis en Tiempo Real</h3>
                    <p className="text-slate-400 text-sm">Ejecuta el modelo de IA sobre la telemetría actual.</p>
                 </div>
                 <div className="w-full md:w-auto md:min-w-[320px]">
                    <div className="-mb-4">
                        <Select label="Seleccionar Activo" value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)}>
                            {assets.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.assetType})</option>
                            ))}
                        </Select>
                    </div>
                 </div>
            </div>

            {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-purple-300 animate-pulse">Analizando telemetría histórica...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-200">Resultados del Análisis</h3>
                        </div>
                        {predictions.map(pred => <PredictionCard key={pred.id} prediction={pred} />)}
                    </div>
                    <div className="lg:col-span-1 space-y-6">
                        <Card title="Ventanas de Riesgo" className="border-l-4 border-l-purple-500">
                            <HeatMap data={historyData} />
                        </Card>
                        <Card title="Zona de Peligro (Correlación)">
                             <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" dataKey="temp" name="Temp" unit="°C" stroke="#94a3b8" />
                                        <YAxis type="number" dataKey="hum" name="Hum" unit="%" stroke="#94a3b8" domain={[0, 100]} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b' }} />
                                        <ReferenceArea x1={15} x2={25} y1={80} y2={100} stroke="none" fill="red" fillOpacity={0.15} />
                                        <Scatter name="Lecturas" data={historyData} fill="#8884d8" shape="circle" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. History & Reports
const HistoryTab: React.FC<{ assets: Greenhouse[], farms: Farm[], currentUser?: User }> = ({ assets, farms, currentUser }) => {
    const [history, setHistory] = useState<PredictionLog[]>([]);
    const [filterFarm, setFilterFarm] = useState('');
    const [filterRisk, setFilterRisk] = useState('');

    useEffect(() => {
        const farmId = currentUser?.role === 'farm_user' ? currentUser.farmId : undefined;
        getPredictionHistory(farmId).then(setHistory);
    }, [currentUser]);

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            if (filterFarm && item.farmId !== filterFarm) return false;
            if (filterRisk && item.riskLevel !== filterRisk) return false;
            return true;
        });
    }, [history, filterFarm, filterRisk]);

    const handleDownloadCSV = () => {
        const headers = ["Fecha", "Activo", "Enfermedad", "Probabilidad", "Riesgo", "Recomendacion"];
        const rows = filteredHistory.map(item => [
            item.timestamp,
            assets.find(a => a.id === item.assetId)?.name || item.assetId,
            item.diseaseName,
            `${item.probability}%`,
            item.riskLevel,
            item.recommendation
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "historial_predicciones.csv");
        document.body.appendChild(link);
        link.click();
    };

    const columns = [
        { header: 'Fecha', accessor: (item: PredictionLog) => new Date(item.timestamp).toLocaleDateString() },
        { header: 'Activo', accessor: (item: PredictionLog) => assets.find(a => a.id === item.assetId)?.name || 'Desconocido' },
        { header: 'Riesgo Detectado', accessor: (item: PredictionLog) => item.diseaseName },
        { header: 'Nivel', accessor: (item: PredictionLog) => <RiskBadge level={item.riskLevel} /> },
        { header: 'Recomendación', accessor: (item: PredictionLog) => <span className="text-xs">{item.recommendation}</span> }
    ];

    return (
        <Card title="Historial de Predicciones y Amenazas">
            <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
                <div className="flex gap-4 w-full">
                    <div className="w-1/2">
                        <label className="text-xs text-slate-400">Filtrar por Sede</label>
                        <select className="w-full bg-slate-700 text-white p-2 rounded border border-slate-600" value={filterFarm} onChange={e => setFilterFarm(e.target.value)}>
                            <option value="">Todas</option>
                            {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                     <div className="w-1/2">
                        <label className="text-xs text-slate-400">Filtrar por Riesgo</label>
                        <select className="w-full bg-slate-700 text-white p-2 rounded border border-slate-600" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
                            <option value="">Todos</option>
                            <option value="Critical">Critical</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                        </select>
                    </div>
                </div>
                <div>
                     <Button variant="outline" size="sm" onClick={handleDownloadCSV} icon={ICONS.download}>Exportar CSV</Button>
                </div>
            </div>
            <Table columns={columns} data={filteredHistory} />
        </Card>
    );
};

// 3. Configuration
const SettingsTab: React.FC<{currentUser?: User}> = ({currentUser}) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [settings, setSettings] = useState({
        immediateAlertContactIds: [] as string[],
        dailySummaryContactIds: [] as string[],
        emailEnabled: false
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const farmId = currentUser?.role === 'farm_user' ? currentUser.farmId : undefined;
        Promise.all([getContacts(farmId), getPredictionSettings()]).then(([cData, sData]) => {
            setContacts(cData);
            setSettings(sData);
        });
    }, [currentUser]);

    const toggleContact = (listKey: 'immediateAlertContactIds' | 'dailySummaryContactIds', contactId: string) => {
        setSettings(prev => {
            const list = prev[listKey];
            const newList = list.includes(contactId) ? list.filter(id => id !== contactId) : [...list, contactId];
            return { ...prev, [listKey]: newList };
        });
    };

    const handleSave = async () => {
        // Validation for Email
        const systemSettings = await getSystemSettings();
        if (settings.dailySummaryContactIds.length > 0 && !systemSettings.resendApiKey) {
            alert('Atención: Has habilitado notificaciones por correo, pero no has configurado la API Key de Resend en la sección "Configuración -> Integraciones". Los correos no se enviarán.');
        }

        setIsSaving(true);
        await savePredictionSettings(settings);
        setIsSaving(false);
        alert('Configuración guardada correctamente.');
    };

    return (
        <div className="space-y-6">
            <Card title="Reglas de Alerta IA">
                <p className="text-slate-400 mb-4 text-sm">Configure quién recibe notificaciones cuando el modelo detecta amenazas.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-red-400 mb-2 flex items-center">
                            <span className="mr-2">🚨</span> Alertas Inmediatas (Críticas)
                        </h4>
                        <p className="text-xs text-slate-500 mb-3">Se envían vía SMS cuando el riesgo es "Critical" o "High".</p>
                        <div className="bg-slate-900/50 p-3 rounded border border-slate-700 h-48 overflow-y-auto">
                            {contacts.map(c => (
                                <label key={`imm-${c.id}`} className="flex items-center space-x-2 mb-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.immediateAlertContactIds.includes(c.id)}
                                        onChange={() => toggleContact('immediateAlertContactIds', c.id)}
                                        className="rounded border-slate-600 bg-slate-700 text-primary"
                                    />
                                    <span className="text-sm text-slate-300">{c.name} <span className="text-slate-500 text-xs">({c.phone})</span></span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-blue-400 mb-2 flex items-center">
                            <span className="mr-2">📧</span> Resumen Diario por Email
                        </h4>
                        <p className="text-xs text-slate-500 mb-3">Reporte consolidado de predicciones cada 24h.</p>
                        <div className="bg-slate-900/50 p-3 rounded border border-slate-700 h-48 overflow-y-auto">
                             {contacts.map(c => (
                                <label key={`daily-${c.id}`} className="flex items-center space-x-2 mb-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.dailySummaryContactIds.includes(c.id)}
                                        onChange={() => toggleContact('dailySummaryContactIds', c.id)}
                                        className="rounded border-slate-600 bg-slate-700 text-primary"
                                    />
                                    <span className="text-sm text-slate-300">{c.name} <span className="text-slate-500 text-xs">({c.email || 'Sin Email'})</span></span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} isLoading={isSaving}>Guardar Configuración</Button>
                </div>
            </Card>
        </div>
    );
};

// --- MAIN COMPONENT ---
const PredictionManager: React.FC<{currentUser?: User}> = ({currentUser}) => {
    const [assets, setAssets] = useState<Greenhouse[]>([]);
    const [farms, setFarms] = useState<Farm[]>([]);
    const [activeTab, setActiveTab] = useState<'live' | 'history' | 'settings'>('live');

    useEffect(() => {
        const farmId = currentUser?.role === 'farm_user' ? currentUser.farmId : undefined;
        // Fix: Pass farmId to getFarms to ensure data isolation
        Promise.all([getGreenhouses(farmId), getFarms(farmId)]).then(([aData, fData]) => {
            setAssets(aData);
            setFarms(fData);
        });
    }, [currentUser]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <span className="text-purple-400 mr-2">{ICONS.brain}</span>
                        Predicciones AI & Prevención
                    </h2>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 mt-4 md:mt-0">
                    <button 
                        onClick={() => setActiveTab('live')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'live' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Monitor AI
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'history' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Historial
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'settings' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Configuración
                    </button>
                </div>
            </div>

            {/* Content */}
            {activeTab === 'live' && <LiveMonitorTab assets={assets} />}
            {activeTab === 'history' && <HistoryTab assets={assets} farms={farms} currentUser={currentUser} />}
            {activeTab === 'settings' && <SettingsTab currentUser={currentUser} />}
        </div>
    );
};

export default PredictionManager;
