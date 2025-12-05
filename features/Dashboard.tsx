
import React, { useState, useEffect, useMemo } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    CartesianGrid 
} from 'recharts';
import Card from '../components/Card';
import { ICONS } from '../constants';
import { Greenhouse, SensorReading, Prediction, User } from '../types';
import { analyzeAssetRisk, generateSimulatedHistory } from '../services/aiEngine';
import { getGreenhouses, getFarms } from '../services/api';

// --- Simulation Hook ---
const useSensorSimulation = (assets: Greenhouse[]) => {
    const [readings, setReadings] = useState<Record<string, SensorReading>>({});

    // Initialize random readings
    useEffect(() => {
        const initialReadings: Record<string, SensorReading> = {};
        assets.forEach(asset => {
            initialReadings[asset.id] = {
                assetId: asset.id,
                temperature: 20 + Math.random() * 10, // 20-30°C
                humidity: 50 + Math.random() * 30,    // 50-80%
                battery: 80 + Math.random() * 20,     // 80-100%
                history: Array.from({ length: 10 }, (_, i) => ({
                    time: new Date(Date.now() - (10 - i) * 10000).toLocaleTimeString(),
                    temp: 20 + Math.random() * 10,
                    hum: 50 + Math.random() * 30
                }))
            };
        });
        setReadings(initialReadings);
    }, [assets]);

    // Live update loop
    useEffect(() => {
        if (assets.length === 0) return;

        const interval = setInterval(() => {
            setReadings(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    const current = next[key];
                    // Random walk simulation
                    const tempChange = (Math.random() - 0.5) * 0.8; 
                    const humChange = (Math.random() - 0.5) * 2;
                    const batteryDrain = Math.random() * 0.05; // Slow drain

                    const newTemp = Math.max(0, Math.min(50, current.temperature + tempChange));
                    const newHum = Math.max(0, Math.min(100, current.humidity + humChange));
                    const newBat = Math.max(0, current.battery - batteryDrain);

                    const newPoint = {
                        time: new Date().toLocaleTimeString(),
                        temp: newTemp,
                        hum: newHum
                    };

                    next[key] = {
                        ...current,
                        temperature: newTemp,
                        humidity: newHum,
                        battery: newBat,
                        history: [...current.history.slice(1), newPoint]
                    };
                });
                return next;
            });
        }, 3000); // Update every 3 seconds

        return () => clearInterval(interval);
    }, [assets]);

    return readings;
};

// --- Sub-components ---

const StatCard: React.FC<{ label: string; value: string; subtext: string; color: string; icon?: React.ReactNode }> = ({ label, value, subtext, color, icon }) => (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-md flex items-center justify-between">
        <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
            <p className="text-slate-500 text-xs mt-1">{subtext}</p>
        </div>
        {icon && <div className="text-slate-600 opacity-50">{icon}</div>}
    </div>
);

const SensorCard: React.FC<{ asset: Greenhouse; reading: SensorReading; farmName: string }> = ({ asset, reading, farmName }) => {
    // Battery Color Logic
    let batColor = 'text-green-500';
    if (reading.battery < 50) batColor = 'text-yellow-500';
    if (reading.battery < 20) batColor = 'text-red-500';

    return (
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col shadow-lg transition-transform hover:scale-[1.01] duration-200">
            {/* Header */}
            <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-white text-lg">{asset.name}</h3>
                    <p className="text-xs text-slate-400">{farmName} • {asset.location}</p>
                </div>
                <div className="text-right">
                     <span className="text-[10px] font-mono bg-slate-700 text-slate-300 px-2 py-1 rounded">
                        DevUI: {asset.devEUI ? asset.devEUI.substring(0, 8) : 'N/A'}...
                    </span>
                    <div className={`flex items-center justify-end mt-2 text-xs font-bold ${batColor}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>
                        {reading.battery.toFixed(0)}%
                    </div>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 p-4">
                <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase">Temp</p>
                    <p className={`text-2xl font-bold ${reading.temperature > 28 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {reading.temperature.toFixed(1)}°C
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-400 uppercase">Humedad</p>
                    <p className="text-2xl font-bold text-blue-400">
                        {reading.humidity.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Mini Trend Chart */}
            <div className="h-24 w-full mt-auto bg-slate-900/20">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reading.history}>
                        <defs>
                            <linearGradient id={`gradTemp-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: 'none', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ display: 'none' }}
                            formatter={(val: number) => val.toFixed(1)}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="temp" 
                            stroke="#22c55e" 
                            fillOpacity={1} 
                            fill={`url(#gradTemp-${asset.id})`} 
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const Dashboard: React.FC<{currentUser?: User}> = ({ currentUser }) => {
    const [assets, setAssets] = useState<Greenhouse[]>([]);
    const [farmName, setFarmName] = useState('Mi Empresa');
    const [isLoading, setIsLoading] = useState(true);

    // Load Dynamic Assets and Farm Name
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const farmId = currentUser?.role === 'farm_user' ? currentUser.farmId : undefined;
            
            const [assetData, farmData] = await Promise.all([
                getGreenhouses(farmId),
                getFarms(farmId)
            ]);
            
            setAssets(assetData);
            if (farmData && farmData.length > 0) {
                setFarmName(farmData[0].name);
            }
            setIsLoading(false);
        };
        loadData();
    }, [currentUser]);

    // 1. Live Data Simulation (using seeded assets)
    const readings = useSensorSimulation(assets);

    // 2. Filter State
    const [selectedAssetType, setSelectedAssetType] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('detailed');
    
    // 3. AI Alert State
    const [activeAlerts, setActiveAlerts] = useState<Prediction[]>([]);
    const [showAlertPopup, setShowAlertPopup] = useState(false);

    // 4. Run Background AI Check
    useEffect(() => {
        // Run AI Engine logic for all assets to check for Critical Risks
        if (assets.length === 0) return;
        
        const allPredictions: Prediction[] = [];
        assets.forEach(asset => {
            const history = generateSimulatedHistory(asset.id);
            const preds = analyzeAssetRisk(asset, history);
            const critical = preds.filter(p => p.riskLevel === 'Critical' || p.riskLevel === 'High');
            allPredictions.push(...critical);
        });
        setActiveAlerts(allPredictions);
    }, [assets]);

    // 5. Filter Logic
    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            const matchesType = selectedAssetType ? asset.assetType === selectedAssetType : true;
            const matchesSearch = searchQuery 
                ? (asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || (asset.devEUI && asset.devEUI.toLowerCase().includes(searchQuery.toLowerCase())))
                : true;
            return matchesType && matchesSearch;
        });
    }, [selectedAssetType, searchQuery, assets]);

    // 6. Aggregation Logic
    const averages = useMemo(() => {
        if (filteredAssets.length === 0) return { temp: 0, hum: 0, bat: 0, count: 0 };
        
        let totalTemp = 0;
        let totalHum = 0;
        let totalBat = 0;
        let count = 0;

        filteredAssets.forEach(a => {
            const r = readings[a.id];
            if (r) {
                totalTemp += r.temperature;
                totalHum += r.humidity;
                totalBat += r.battery;
                count++;
            }
        });

        if (count === 0) return { temp: 0, hum: 0, bat: 0, count: 0 };

        return {
            temp: totalTemp / count,
            hum: totalHum / count,
            bat: totalBat / count,
            count
        };
    }, [filteredAssets, readings]);

    return (
        <div className="space-y-6 relative">
            {/* --- Control Panel --- */}
            <div className="bg-card p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10 shadow-xl">
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {/* FIXED STATIC OPTIONS SO FILTER DOES NOT DISAPPEAR */}
                    <select 
                        className="bg-slate-700 text-white p-2 rounded border border-slate-600 text-sm focus:ring-primary focus:border-primary min-w-[150px]"
                        value={selectedAssetType}
                        onChange={(e) => setSelectedAssetType(e.target.value)}
                    >
                        <option value="">Todos los Tipos</option>
                        <option value="Invernadero">Invernadero</option>
                        <option value="Silo">Silo</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto items-center">
                    <input 
                        type="text" 
                        placeholder="Buscar por Nombre o DevEUI..." 
                        className="bg-slate-700 text-white p-2 rounded border border-slate-600 text-sm w-full md:w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    
                    <div className="flex bg-slate-700 rounded p-1 border border-slate-600">
                        <button 
                            className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'summary' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                            onClick={() => setViewMode('summary')}
                        >
                            Promedios
                        </button>
                        <button 
                            className={`px-3 py-1 text-xs font-bold rounded ${viewMode === 'detailed' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                            onClick={() => setViewMode('detailed')}
                        >
                            Detallado
                        </button>
                    </div>

                    {/* AI ALERT BELL */}
                    <div className="relative ml-2">
                        <button 
                            onClick={() => setShowAlertPopup(!showAlertPopup)}
                            className={`p-2 rounded-full transition-colors ${activeAlerts.length > 0 ? 'bg-red-500/20 text-red-500 animate-pulse hover:bg-red-500/30' : 'bg-slate-700 text-slate-400'}`}
                        >
                            {ICONS.bell}
                            {activeAlerts.length > 0 && (
                                <span className="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border border-slate-900"></span>
                            )}
                        </button>
                        
                        {showAlertPopup && (
                            <div className="absolute mt-2 z-50 p-4 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-[90vw] sm:w-80 right-1/2 translate-x-1/2 sm:right-0 sm:translate-x-0">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-white">Alertas de Predicción AI</h4>
                                    <button onClick={() => setShowAlertPopup(false)} className="text-slate-400 hover:text-white">
                                        {ICONS.close}
                                    </button>
                                </div>
                                {activeAlerts.length === 0 ? (
                                    <p className="text-slate-400 text-sm py-2">No se detectan amenazas críticas en este momento.</p>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto space-y-2">
                                        {activeAlerts.map(alert => {
                                            const asset = assets.find(g => g.id === alert.assetId);
                                            return (
                                                <div key={alert.id} className="bg-slate-900/50 p-2 rounded border border-red-500/30">
                                                    <p className="text-xs font-bold text-red-400">{alert.diseaseName}</p>
                                                    <p className="text-xs text-slate-300">{asset?.name} ({asset?.location})</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">{alert.description}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Stats Header (Always visible or contextual) --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    label="Temperatura Promedio" 
                    value={`${averages.temp.toFixed(1)}°C`} 
                    subtext={`Basado en ${averages.count} activos filtrados`}
                    color={averages.temp > 28 ? 'text-red-400' : 'text-emerald-400'}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>}
                />
                <StatCard 
                    label="Humedad Promedio" 
                    value={`${averages.hum.toFixed(1)}%`} 
                    subtext="Nivel de saturación global"
                    color="text-blue-400"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>}
                />
                <StatCard 
                    label="Salud Batería" 
                    value={`${averages.bat.toFixed(0)}%`} 
                    subtext="Promedio carga sensores"
                    color={averages.bat > 50 ? 'text-green-400' : 'text-yellow-400'}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>}
                />
            </div>

            {isLoading ? <div className="p-10 text-center text-slate-400">Cargando monitoreo en tiempo real...</div> : (
                <>
                    {/* --- Main Content Area --- */}
                    {viewMode === 'summary' ? (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-10 text-center">
                            <h2 className="text-2xl font-bold text-white mb-4">Vista General - {farmName}</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto">
                                Actualmente visualizando el promedio global de <strong>{averages.count}</strong> sensores. 
                                Seleccione "Vista Detallada" para ver datos específicos de cada sensor DevUI, tendencias individuales y niveles de batería por dispositivo.
                            </p>
                            
                            <div className="h-64 mt-8 w-full max-w-4xl mx-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={readings[filteredAssets[0]?.id]?.history || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8' }} />
                                        <YAxis tick={{ fill: '#94a3b8' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                        <Area type="monotone" dataKey="temp" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Temp (Muestra)" />
                                        <Area type="monotone" dataKey="hum" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Hum (Muestra)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                                <p className="text-xs text-slate-500 mt-2">* Gráfico representativo del primer activo filtrado</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAssets.length === 0 && <p className="text-slate-400 col-span-full text-center py-10">No hay activos registrados. Vaya a Configuración para registrar su primer sensor.</p>}
                            {filteredAssets.map(asset => {
                                const reading = readings[asset.id];
                                if (!reading) return null;

                                return (
                                    <SensorCard 
                                        key={asset.id} 
                                        asset={asset} 
                                        reading={reading} 
                                        farmName={farmName} 
                                    />
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;
