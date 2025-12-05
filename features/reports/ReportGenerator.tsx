

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Table from '../../components/Table';
import { Greenhouse, Farm, AssetType, ScheduledReport, Contact, User } from '../../types';
import { getGreenhouses, getFarms, getScheduledReports, addScheduledReport, deleteScheduledReport, getContacts } from '../../services/api';
import { sendEmailViaResend, generateReportHTML } from '../../services/emailService';
import { ICONS } from '../../constants';

// --- Helper: Generate Realistic Historical Data ---
const generateHistoricalData = (assetId: string, startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const dataPoints = [];
    
    // Create a predictable "random" seed based on assetId char codes
    const seed = assetId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Generate hourly data
    let currentTime = start;
    const hour = 3600 * 1000;

    while (currentTime <= end) {
        const date = new Date(currentTime);
        const hourOfDay = date.getHours();
        
        // Simulate daily cycle (hotter at noon, colder at night)
        const cycle = Math.sin((hourOfDay - 6) * (Math.PI / 12)); 
        
        // Base values modified by the "seed" so each asset looks different
        const baseTemp = 20 + (seed % 5); 
        const baseHum = 60 + (seed % 15);

        const temp = baseTemp + (cycle * 8) + (Math.random() * 2);
        const hum = baseHum - (cycle * 15) + (Math.random() * 5);
        const bat = Math.max(0, 100 - ((currentTime - start) / (end - start)) * 20); // Battery drains 20% over period

        dataPoints.push({
            id: `pt_${currentTime}`,
            timestamp: currentTime,
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            temperature: parseFloat(temp.toFixed(1)),
            humidity: parseFloat(hum.toFixed(1)),
            battery: parseFloat(bat.toFixed(1)),
        });

        currentTime += hour;
    }
    return dataPoints;
};

// --- Components ---

const ReportStat: React.FC<{ label: string; value: string; color: string; icon: React.ReactNode }> = ({ label, value, color, icon }) => (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center shadow-md">
        <div className={`p-3 rounded-full bg-slate-700/50 mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-slate-400 text-xs uppercase font-semibold">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const ReportGenerator: React.FC<{currentUser?: User}> = ({currentUser}) => {
    // --- Global Data State ---
    const [assets, setAssets] = useState<Greenhouse[]>([]);
    const [farms, setFarms] = useState<Farm[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [activeTab, setActiveTab] = useState<'manual' | 'scheduled'>('manual');
    const [isLoadingData, setIsLoadingData] = useState(true);

    // --- Init ---
    useEffect(() => {
        const farmId = currentUser?.role === 'farm_user' ? currentUser.farmId : undefined;
        
        // FIX: Pass farmId to getFarms ensuring strict isolation
        Promise.all([getGreenhouses(farmId), getFarms(farmId), getContacts(farmId)]).then(([gData, fData, cData]) => {
            setAssets(gData);
            setFarms(fData);
            setContacts(cData);
            setIsLoadingData(false);
        });
    }, [currentUser]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-2">
                 <div>
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <span className="text-primary mr-2">{ICONS.reports}</span>
                        Centro de Reportes
                    </h2>
                </div>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 mt-4 md:mt-0">
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'manual' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Generación Manual (PDF)
                    </button>
                    <button 
                        onClick={() => setActiveTab('scheduled')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'scheduled' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Envíos Programados (Email)
                    </button>
                </div>
            </div>

            {activeTab === 'manual' ? (
                <ManualReportView assets={assets} farms={farms} isLoadingData={isLoadingData} />
            ) : (
                <ScheduledReportsView assets={assets} farms={farms} contacts={contacts} currentUser={currentUser}/>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: MANUAL REPORTS ---
const ManualReportView: React.FC<{ assets: Greenhouse[], farms: Farm[], isLoadingData: boolean }> = ({ assets, farms, isLoadingData }) => {
    const [selectedFarmId, setSelectedFarmId] = useState('');
    const [selectedAssetType, setSelectedAssetType] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState('');
    
    // Dates (Defaults to last 7 days)
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(lastWeek);
    const [endDate, setEndDate] = useState(today);

    // --- Report State ---
    const [generatedReport, setGeneratedReport] = useState<any[] | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [reportMeta, setReportMeta] = useState<{assetName: string, farmName: string} | null>(null);

    // Ref for PDF Capture
    const reportContentRef = useRef<HTMLDivElement>(null);

    // --- Filter Logic ---
    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            if (selectedFarmId && a.farmId !== selectedFarmId) return false;
            if (selectedAssetType && a.assetType !== selectedAssetType) return false;
            return true;
        });
    }, [assets, selectedFarmId, selectedAssetType]);

    useEffect(() => {
        setSelectedAssetId('');
    }, [selectedFarmId, selectedAssetType]);

    // --- Generate Report ---
    const handleGenerate = () => {
        if (!selectedAssetId) {
            alert("Por favor seleccione un activo específico para generar el reporte.");
            return;
        }

        setIsGenerating(true);
        setGeneratedReport(null); 

        // Simulate processing time
        setTimeout(() => {
            const data = generateHistoricalData(selectedAssetId, startDate, endDate);
            setGeneratedReport(data);
            
            const asset = assets.find(a => a.id === selectedAssetId);
            const farm = farms.find(f => f.id === asset?.farmId);
            
            setReportMeta({
                assetName: asset ? `${asset.name} (${asset.location})` : 'Desconocido',
                farmName: farm ? farm.name : 'Desconocido'
            });

            setIsGenerating(false);
        }, 800);
    };

    // --- PDF Download Logic ---
    const handleDownloadPDF = async () => {
        if (!reportContentRef.current) return;

        setIsDownloading(true);
        try {
            const element = reportContentRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#0f172a',
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            const filename = `Reporte_${reportMeta?.assetName.replace(/\s+/g, '_')}_${startDate}.pdf`;
            pdf.save(filename);

        } catch (error) {
            console.error('Error generating PDF', error);
            alert('Hubo un error al generar el PDF.');
        } finally {
            setIsDownloading(false);
        }
    };

    // --- Calculate Stats ---
    const stats = useMemo(() => {
        if (!generatedReport || generatedReport.length === 0) return null;
        const temps = generatedReport.map(d => d.temperature);
        const hums = generatedReport.map(d => d.humidity);
        return {
            maxTemp: Math.max(...temps).toFixed(1),
            minTemp: Math.min(...temps).toFixed(1),
            avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
            avgHum: (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1),
        };
    }, [generatedReport]);

    const tableColumns = [
        { header: 'Fecha', accessor: (row: any) => row.date },
        { header: 'Hora', accessor: (row: any) => row.time },
        { header: 'Temperatura', accessor: (row: any) => <span className={row.temperature > 28 ? 'text-red-400' : 'text-emerald-400'}>{row.temperature}°C</span> },
        { header: 'Humedad', accessor: (row: any) => `${row.humidity}%` },
        { header: 'Batería', accessor: (row: any) => <span className={row.battery < 20 ? 'text-red-500' : 'text-slate-300'}>{row.battery}%</span> },
    ];

    return (
        <>
            <Card className="border-t-4 border-t-blue-500">
                <div className="flex flex-col space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-1">Empresa / Sede</label>
                            <select className="bg-slate-700 text-white p-2 rounded border border-slate-600 focus:border-primary outline-none" value={selectedFarmId} onChange={(e) => setSelectedFarmId(e.target.value)}>
                                <option value="">Todas las Sedes</option>
                                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-1">Tipo de Activo</label>
                            <select className="bg-slate-700 text-white p-2 rounded border border-slate-600 focus:border-primary outline-none" value={selectedAssetType} onChange={(e) => setSelectedAssetType(e.target.value)}>
                                <option value="">Todos los Tipos</option>
                                <option value="Invernadero">Invernadero</option>
                                <option value="Silo">Silo</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-1">Activo Específico</label>
                            <select className="bg-slate-700 text-white p-2 rounded border border-slate-600 focus:border-primary outline-none" value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} disabled={isLoadingData}>
                                <option value="">Seleccione Activo...</option>
                                {filteredAssets.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.location})</option>))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-1">Fecha Inicio</label>
                            <input type="date" className="bg-slate-700 text-white p-2 rounded border border-slate-600 focus:border-primary outline-none" value={startDate} onChange={(e) => setStartDate(e.target.value)}/>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-semibold text-slate-400 mb-1">Fecha Fin</label>
                            <input type="date" className="bg-slate-700 text-white p-2 rounded border border-slate-600 focus:border-primary outline-none" value={endDate} onChange={(e) => setEndDate(e.target.value)}/>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 space-x-3">
                        {generatedReport && (
                            <Button variant="outline" onClick={handleDownloadPDF} isLoading={isDownloading} icon={ICONS.download}>Descargar PDF</Button>
                        )}
                        <Button onClick={handleGenerate} isLoading={isGenerating} disabled={!selectedAssetId} icon={ICONS.reports}>Generar Reporte</Button>
                    </div>
                </div>
            </Card>

            {generatedReport && stats && reportMeta && (
                <div ref={reportContentRef} className="space-y-6 animate-fade-in-up bg-background p-4 rounded-xl">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-800/50 p-6 rounded-lg border border-slate-700 border-l-4 border-l-primary">
                        <div>
                            <h3 className="text-2xl font-bold text-white">{reportMeta.assetName}</h3>
                            <p className="text-slate-400">{reportMeta.farmName}</p>
                            <p className="text-xs text-slate-500 mt-1">Generado el: {new Date().toLocaleString()}</p>
                        </div>
                        <div className="mt-2 md:mt-0 text-right">
                            <span className="text-xs text-slate-500 block uppercase tracking-wider">Periodo Reportado</span>
                            <span className="text-xl text-white font-mono font-bold">{startDate} <span className="text-primary">➔</span> {endDate}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReportStat label="Temp. Máxima" value={`${stats.maxTemp}°C`} color="text-red-400" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>} />
                        <ReportStat label="Temp. Mínima" value={`${stats.minTemp}°C`} color="text-blue-300" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>} />
                        <ReportStat label="Temp. Promedio" value={`${stats.avgTemp}°C`} color="text-emerald-400" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>} />
                        <ReportStat label="Humedad Promedio" value={`${stats.avgHum}%`} color="text-blue-500" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6 shadow-lg">
                            <h4 className="text-lg font-bold text-slate-200 mb-6">Tendencia Térmica y Humedad</h4>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={generatedReport}>
                                        <defs>
                                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 12 }} interval={Math.floor(generatedReport.length / 6)} />
                                        <YAxis yAxisId="left" tick={{ fill: '#94a3b8' }} label={{ value: '°C', position: 'insideLeft', fill: '#94a3b8' }}/>
                                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8' }} label={{ value: '%', position: 'insideRight', fill: '#94a3b8' }}/>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Area yAxisId="left" type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="Temperatura" />
                                        <Area yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" name="Humedad" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="lg:col-span-1 bg-card rounded-lg border border-border p-6 shadow-lg">
                            <h4 className="text-lg font-bold text-slate-200 mb-6">Salud de Batería</h4>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={generatedReport}>
                                         <defs>
                                            <linearGradient id="colorBat" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" tick={false} />
                                        <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                                        <ReferenceLine y={20} stroke="red" strokeDasharray="3 3" label={{ position: 'top', value: 'Critico', fill: 'red', fontSize: 10 }} />
                                        <Area type="monotone" dataKey="battery" stroke="#22c55e" strokeWidth={2} fill="url(#colorBat)" name="Batería %" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <Card title="Datos Detallados (Muestreo Horario)">
                        <div className="max-h-96 overflow-y-auto">
                            <Table columns={tableColumns} data={generatedReport} />
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
};

// --- SUB-COMPONENT: SCHEDULED REPORTS ---
const ScheduledReportsView: React.FC<{ assets: Greenhouse[], farms: Farm[], contacts: Contact[], currentUser?: User }> = ({ assets, farms, contacts, currentUser }) => {
    const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Form State
    const [newSchedule, setNewSchedule] = useState({
        assetId: '',
        frequency: 'Diario' as 'Diario' | 'Semanal' | 'Mensual',
        startDate: '',
        endDate: '',
        contactIds: [] as string[]
    });

    // Valid contacts (with email)
    const validContacts = useMemo(() => contacts.filter(c => c.email && c.email.includes('@')), [contacts]);

    const fetchSchedules = () => {
        setIsLoading(true);
        const farmId = currentUser?.role === 'farm_user' ? currentUser.farmId : undefined;
        getScheduledReports(farmId).then(data => {
            setSchedules(data);
            setIsLoading(false);
        });
    };

    useEffect(() => {
        fetchSchedules();
    }, [currentUser]);

    const handleOpenModal = () => {
        setNewSchedule({
            assetId: assets.length > 0 ? assets[0].id : '',
            frequency: 'Diario',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            contactIds: []
        });
        setIsModalOpen(true);
    };

    const handleCreate = async () => {
        if (!newSchedule.assetId || !newSchedule.startDate || !newSchedule.endDate || newSchedule.contactIds.length === 0) {
            alert("Por favor complete todos los campos y seleccione al menos un contacto.");
            return;
        }

        setIsSubmitting(true);
        await addScheduledReport({
            ...newSchedule
        });
        setIsSubmitting(false);
        setIsModalOpen(false);
        fetchSchedules();
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Está seguro de eliminar esta programación?")) {
            await deleteScheduledReport(id);
            fetchSchedules();
        }
    };

    const handleSendNow = async (schedule: ScheduledReport) => {
        setSendingId(schedule.id);
        const asset = assets.find(a => a.id === schedule.assetId);
        const recipients = contacts.filter(c => schedule.contactIds.includes(c.id)).map(c => c.email);

        if (!asset) {
             alert('Activo no encontrado');
             setSendingId(null);
             return;
        }

        // Generate dummy summary data for the email
        const dataSummary = {
            avgTemp: (20 + Math.random() * 5).toFixed(1),
            avgHum: (60 + Math.random() * 10).toFixed(1),
            maxTemp: (25 + Math.random() * 5).toFixed(1),
            minTemp: (15 + Math.random() * 5).toFixed(1)
        };

        const html = generateReportHTML(`Reporte ${schedule.frequency}: ${asset.name}`, dataSummary);
        
        const result = await sendEmailViaResend({
            to: recipients,
            subject: `[SATA] Reporte ${schedule.frequency} - ${asset.name}`,
            html: html
        });

        alert(result.message);
        setSendingId(null);
    };

    const toggleContact = (id: string) => {
        setNewSchedule(prev => {
            const exists = prev.contactIds.includes(id);
            return {
                ...prev,
                contactIds: exists ? prev.contactIds.filter(c => c !== id) : [...prev.contactIds, id]
            };
        });
    };

    const columns = [
        { header: 'Activo / Objetivo', accessor: (s: ScheduledReport) => assets.find(a => a.id === s.assetId)?.name || 'Desconocido' },
        { header: 'Frecuencia', accessor: (s: ScheduledReport) => (
            <span className={`px-2 py-1 rounded text-xs font-bold ${s.frequency === 'Diario' ? 'bg-blue-900 text-blue-200' : s.frequency === 'Semanal' ? 'bg-purple-900 text-purple-200' : 'bg-green-900 text-green-200'}`}>
                {s.frequency}
            </span>
        )},
        { header: 'Destinatarios', accessor: (s: ScheduledReport) => s.contactIds.length },
        { header: 'Vigencia', accessor: (s: ScheduledReport) => `${s.startDate} - ${s.endDate}` },
        { header: 'Acciones', accessor: (s: ScheduledReport) => (
            <div className="flex space-x-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    isLoading={sendingId === s.id}
                    onClick={() => handleSendNow(s)} 
                    className="text-primary hover:text-white"
                >
                    Enviar Ahora
                </Button>
                <button 
                    onClick={() => handleDelete(s.id)} 
                    className="p-1.5 rounded-md text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200"
                    title="Eliminar Programación"
                >
                    {ICONS.trash}
                </button>
            </div>
        )}
    ];

    return (
        <>
            <Card 
                title="Programación de Envíos Automáticos" 
                titleAction={<Button onClick={handleOpenModal} icon={ICONS.plus}>Programar Nuevo Reporte</Button>}
                className="border-t-4 border-t-purple-500"
            >
                <div className="mb-4 text-sm text-slate-400">
                    Configure el envío automático de reportes PDF por correo electrónico a sus contactos seleccionados.
                </div>
                <Table columns={columns} data={schedules} isLoading={isLoading} />
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Programar Envío de Reporte"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} isLoading={isSubmitting} className="ml-2">Guardar Programación</Button>
                    </>
                }
            >
                <Select label="Activo a Reportar" value={newSchedule.assetId} onChange={e => setNewSchedule({...newSchedule, assetId: e.target.value})}>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.location})</option>)}
                </Select>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Fecha Inicio" type="date" value={newSchedule.startDate} onChange={e => setNewSchedule({...newSchedule, startDate: e.target.value})} />
                    <Input label="Fecha Fin" type="date" value={newSchedule.endDate} onChange={e => setNewSchedule({...newSchedule, endDate: e.target.value})} />
                </div>

                <Select label="Frecuencia de Envío" value={newSchedule.frequency} onChange={e => setNewSchedule({...newSchedule, frequency: e.target.value as any})}>
                    <option value="Diario">Diario (Cada 24h)</option>
                    <option value="Semanal">Semanal (Cada Lunes)</option>
                    <option value="Mensual">Mensual (Día 1 del mes)</option>
                </Select>

                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Destinatarios (Solo contactos con email)</label>
                    <div className="bg-slate-700 p-3 rounded-md max-h-40 overflow-y-auto border border-slate-600">
                        {validContacts.length === 0 ? (
                            <p className="text-xs text-slate-400">No hay contactos con email registrado.</p>
                        ) : (
                            validContacts.map(c => (
                                <label key={c.id} className="flex items-center space-x-2 mb-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={newSchedule.contactIds.includes(c.id)}
                                        onChange={() => toggleContact(c.id)}
                                        className="rounded border-slate-500 bg-slate-600 text-primary"
                                    />
                                    <span className="text-sm text-slate-200">{c.name} <span className="text-xs text-slate-400">({c.email})</span></span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ReportGenerator;
