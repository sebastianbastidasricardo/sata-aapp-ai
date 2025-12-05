

import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Table from '../../components/Table';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import { Greenhouse, User, Farm, AssetType, AssetLocation, SystemSettings } from '../../types';
import { getGreenhouses, updateGreenhouse, addGreenhouse, deleteGreenhouse, getFarms, updateFarm, addFarm, deleteFarm, getSystemSettings, saveSystemSettings, deleteCompany } from '../../services/api';
import { ICONS } from '../../constants';

// Helper to get all timezones
const getAllTimezones = () => {
    let timezones: string[] = [];
    if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
        timezones = (Intl as any).supportedValuesOf('timeZone');
    } else {
        // Fallback for older environments
        timezones = [
            "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
            "America/Bogota", "America/Mexico_City", "America/Lima", "America/Santiago",
            "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai"
        ];
    }
    
    return timezones.map(tz => {
        try {
            const offset = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                timeZoneName: 'shortOffset'
            }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value;
            return { value: tz, label: `${tz} (${offset || ''})` };
        } catch (e) {
            return { value: tz, label: tz };
        }
    });
};

// Sub-component for Farm Data (Empresa/Sedes)
const FarmDataSettings: React.FC<{ onFarmsUpdate: () => void, currentUser: User }> = ({ onFarmsUpdate, currentUser }) => {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
    const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);
    
    const [name, setName] = useState('');
    const [timezone, setTimezone] = useState('');

    const timezoneOptions = useMemo(() => getAllTimezones(), []);

    const fetchFarms = async () => {
        setIsLoading(true);
        const data = await getFarms(currentUser.farmId);
        setFarms(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchFarms();
    }, [onFarmsUpdate, currentUser.farmId]);

    const resetForm = () => {
        setName('');
        setTimezone('');
        setEditingFarm(null);
    };

    const handleOpenModal = (farm: Farm | null = null) => {
        if (currentUser.companyRole !== 'owner') {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        resetForm();
        if (farm) {
            setEditingFarm(farm);
            setName(farm.name);
            setTimezone(farm.timezone);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async () => {
        if (!name || !timezone) {
            alert("Todos los campos son obligatorios.");
            return;
        }

        setIsLoading(true);
        if (editingFarm) {
            await updateFarm({ ...editingFarm, name, timezone });
        } else {
            await addFarm({ name, timezone });
        }
        await fetchFarms();
        onFarmsUpdate();
        setIsLoading(false);
        handleCloseModal();
    };

    const confirmDelete = (item: Farm) => {
        if (currentUser.companyRole !== 'owner') {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        if (item.id === currentUser.farmId) {
            alert("No puedes eliminar la sede principal activa de tu cuenta.");
            return;
        }
        setFarmToDelete(item); 
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (farmToDelete) {
            setIsLoading(true);
            await deleteFarm(farmToDelete.id);
            await fetchFarms();
            onFarmsUpdate();
            setIsLoading(false);
            setIsDeleteModalOpen(false);
            setFarmToDelete(null);
        }
    };

    const getFormattedTimezone = (tz: string) => {
        const option = timezoneOptions.find(o => o.value === tz);
        return option ? option.label : tz;
    };

    const columns = [
        { header: 'Nombre Sede / Empresa', accessor: (item: Farm) => item.name },
        { header: 'Zona Horaria', accessor: (item: Farm) => getFormattedTimezone(item.timezone) },
        { 
            header: 'Acciones', 
            accessor: (item: Farm) => (
                <div className="flex space-x-2">
                    <button 
                        onClick={() => handleOpenModal(item)} 
                        className="p-1.5 rounded-md text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all duration-200"
                        title="Editar Sede"
                    >
                        {ICONS.edit}
                    </button>
                    <button 
                        onClick={() => confirmDelete(item)} 
                        className="p-1.5 rounded-md text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200"
                        title="Eliminar Sede"
                    >
                        {ICONS.trash}
                    </button>
                </div>
            )
        },
    ];

    return (
        <>
            <Card title="Gestión de Sedes / Empresas" titleAction={<Button onClick={() => handleOpenModal()} icon={ICONS.plus}>Registrar Sede</Button>}>
                <Table columns={columns} data={farms} isLoading={isLoading} />
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingFarm ? 'Editar Sede' : 'Registrar Nueva Sede'}
                footer={
                    <>
                        <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSubmit} isLoading={isLoading} className="ml-2">Guardar</Button>
                    </>
                }
            >
                <Input label="Nombre de la Sede" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Planta Tocancipá" />
                <Select label="Zona Horaria (Seleccione de la lista global)" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    <option value="">Seleccione...</option>
                    {timezoneOptions.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                    ))}
                </Select>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={isLoading} className="ml-2">Eliminar</Button>
                    </>
                }
            >
                <p>¿Estás seguro de que deseas eliminar la sede <strong>{farmToDelete?.name}</strong>? Esto podría afectar a los usuarios y activos asociados.</p>
            </Modal>
        </>
    );
};

// Sub-component for Asset Management
const AssetSettings: React.FC<{ farms: Farm[], currentUser: User }> = ({ farms, currentUser }) => {
    const [assets, setAssets] = useState<Greenhouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [currentAsset, setCurrentAsset] = useState<Greenhouse | null>(null);
    const [assetToDelete, setAssetToDelete] = useState<Greenhouse | null>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState<AssetType>('Invernadero');
    const [location, setLocation] = useState<AssetLocation>('Norte');
    const [customType, setCustomType] = useState('');
    const [devEUI, setDevEUI] = useState('');
    const [selectedFarmId, setSelectedFarmId] = useState('');

    useEffect(() => {
        setIsLoading(true);
        getGreenhouses(currentUser.farmId).then(data => {
            setAssets(data);
            setIsLoading(false);
        });
    }, [currentUser.farmId]);

    const resetForm = () => {
        setName('');
        setType('Invernadero');
        setLocation('Norte');
        setCustomType('');
        setDevEUI('');
        setSelectedFarmId(farms.length > 0 ? farms[0].id : '');
        setCurrentAsset(null);
    };

    const hasPermission = () => {
        return currentUser.companyRole === 'owner' || currentUser.companyRole === 'admin';
    };

    const handleOpenModal = (asset: Greenhouse | null = null) => {
        if (!hasPermission()) {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        resetForm();
        if (asset) {
            setCurrentAsset(asset);
            setName(asset.name);
            setType(asset.assetType);
            setLocation(asset.location);
            setCustomType(asset.customType || '');
            setDevEUI(asset.devEUI || '');
            setSelectedFarmId(asset.farmId);
        } else if (farms.length > 0) {
            setSelectedFarmId(farms[0].id);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async () => {
        if (!name || !devEUI || !selectedFarmId || (type === 'Otro' && !customType)) {
            alert("Por favor complete todos los campos requeridos.");
            return;
        }

        setIsSubmitting(true);
        
        const payload = {
            name,
            assetType: type,
            customType: type === 'Otro' ? customType : undefined,
            devEUI,
            location,
            farmId: selectedFarmId
        };

        if (currentAsset) {
            const updated = await updateGreenhouse({ ...currentAsset, ...payload });
            setAssets(prev => prev.map(a => a.id === updated.id ? updated : a));
        } else {
            const created = await addGreenhouse(payload);
            setAssets(prev => [...prev, created]);
        }
        
        setIsSubmitting(false);
        handleCloseModal();
    };

    const openDeleteModal = (asset: Greenhouse) => {
        if (!hasPermission()) {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        setAssetToDelete(asset);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!assetToDelete) return;
        setIsSubmitting(true);
        await deleteGreenhouse(assetToDelete.id);
        setAssets(prev => prev.filter(a => a.id !== assetToDelete.id));
        setIsSubmitting(false);
        setIsDeleteModalOpen(false);
        setAssetToDelete(null);
    };

    const getFarmName = (farmId: string) => {
        const farm = farms.find(f => f.id === farmId);
        return farm ? farm.name : 'Desconocida';
    };

    const columns = [
        { header: 'Nombre del Activo', accessor: (item: Greenhouse) => item.name },
        { header: 'Sede / Empresa', accessor: (item: Greenhouse) => getFarmName(item.farmId) },
        { header: 'Ubicación Sensor', accessor: (item: Greenhouse) => item.location },
        { 
            header: 'Tipo', 
            accessor: (item: Greenhouse) => item.assetType === 'Otro' ? item.customType : item.assetType 
        },
        { header: 'DevEUI', accessor: (item: Greenhouse) => <span className="font-mono text-xs">{item.devEUI}</span> },
        {
            header: 'Acciones',
            accessor: (item: Greenhouse) => (
                <div className="flex space-x-2">
                    <button 
                        onClick={() => handleOpenModal(item)} 
                        className="p-1.5 rounded-md text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all duration-200"
                        title="Editar Activo"
                    >
                        {ICONS.edit}
                    </button>
                    <button 
                        onClick={() => openDeleteModal(item)} 
                        className="p-1.5 rounded-md text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200"
                        title="Eliminar Activo"
                    >
                        {ICONS.trash}
                    </button>
                </div>
            )
        }
    ];

    return (
        <>
            <Card 
                title="Gestión de Activos Monitoreados" 
                titleAction={<Button onClick={() => handleOpenModal()} icon={ICONS.plus}>Registra tu Activo</Button>}
            >
                <Table columns={columns} data={assets} isLoading={isLoading} />
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={currentAsset ? 'Editar Activo' : 'Registra tu Activo'}
                footer={
                    <>
                        <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSubmit} isLoading={isSubmitting} className="ml-2">Guardar</Button>
                    </>
                }
            >
                <Select label="Asociar a Sede / Empresa" value={selectedFarmId} onChange={e => setSelectedFarmId(e.target.value)}>
                    {farms.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </Select>

                <Input 
                    label="Nombre del Activo" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Ej: Invernadero Principal"
                />
                
                <Select label="Ubicación Sensor (Dentro del Activo)" value={location} onChange={e => setLocation(e.target.value as AssetLocation)}>
                    <option value="Norte">Norte</option>
                    <option value="Centro">Centro</option>
                    <option value="Sur">Sur</option>
                </Select>

                <Select label="Tipo de Activo" value={type} onChange={e => setType(e.target.value as AssetType)}>
                    <option value="Invernadero">Invernadero</option>
                    <option value="Silo">Silo</option>
                    <option value="Otro">Otro</option>
                </Select>

                {type === 'Otro' && (
                    <Input 
                        label="Especifique el tipo" 
                        value={customType} 
                        onChange={e => setCustomType(e.target.value)} 
                        placeholder="Ej: Bodega, Tanque, etc."
                    />
                )}

                <Input 
                    label="DevEUI (ID del Dispositivo)" 
                    value={devEUI} 
                    onChange={e => setDevEUI(e.target.value)} 
                    placeholder="Ej: A1B2C3D4E5F67890"
                />
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={isSubmitting} className="ml-2">Eliminar</Button>
                    </>
                }
            >
                <p>¿Estás seguro de que deseas eliminar el activo <strong>{assetToDelete?.name} ({assetToDelete?.location})</strong>? Esta acción no se puede deshacer.</p>
            </Modal>
        </>
    );
};

const IntegrationSettings: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [settings, setSettings] = useState<SystemSettings>({ resendApiKey: '', senderEmail: '', supabaseUrl: '', supabaseKey: '' });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        getSystemSettings().then(setSettings);
    }, []);

    const handleSave = async () => {
        if (currentUser.companyRole !== 'owner') {
            alert("No tienes permiso.");
            return;
        }
        
        const sanitizedSettings = {
            ...settings,
            supabaseUrl: settings.supabaseUrl?.trim(),
            supabaseKey: settings.supabaseKey?.trim(),
            resendApiKey: settings.resendApiKey.trim(),
            senderEmail: settings.senderEmail.trim()
        };

        setIsLoading(true);
        await saveSystemSettings(sanitizedSettings);
        setIsLoading(false);
        alert('Configuración guardada. La aplicación se recargará para aplicar la nueva conexión.');
        window.location.reload();
    };

    return (
        <Card title="Integraciones y Cloud (Full Stack)">
            <p className="text-sm text-slate-400 mb-4">
                Configure los servicios externos para potenciar SATA.
            </p>
            <div className="space-y-6 max-w-lg">
                <div className="border-b border-slate-700 pb-6">
                    <h3 className="text-lg font-bold text-slate-200 mb-2">Notificaciones (Email)</h3>
                    <Input 
                        label="Resend API Key" 
                        value={settings.resendApiKey} 
                        onChange={e => setSettings({...settings, resendApiKey: e.target.value})} 
                        placeholder="re_12345678..."
                        type="password"
                    />
                    <Input 
                        label="Correo Remitente" 
                        value={settings.senderEmail} 
                        onChange={e => setSettings({...settings, senderEmail: e.target.value})} 
                        placeholder="alertas@tudominio.com"
                    />
                    <div className="bg-slate-800 p-2 rounded text-xs text-slate-400">
                        Requiere verificar dominio en Resend para envíos a terceros.
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center">
                        <span className="text-green-500 mr-2">●</span> Base de Datos Cloud (Supabase)
                    </h3>
                    <p className="text-xs text-slate-500 mb-3">
                         Ingresa aquí las credenciales que obtuviste en tu panel de Supabase:
                         <br/><span className="font-bold text-slate-400">Settings (icono engranaje) -&gt; API</span>
                    </p>

                    <Input 
                        label="Project URL" 
                        value={settings.supabaseUrl || ''} 
                        onChange={e => setSettings({...settings, supabaseUrl: e.target.value})} 
                        placeholder="https://xyz...supabase.co"
                    />
                    <Input 
                        label="Anon Public Key" 
                        value={settings.supabaseKey || ''} 
                        onChange={e => setSettings({...settings, supabaseKey: e.target.value})} 
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                        type="password"
                    />
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleSave} isLoading={isLoading} disabled={currentUser.companyRole !== 'owner'}>
                        Guardar y Recargar
                    </Button>
                </div>
            </div>
        </Card>
    );
};

// DANGER ZONE COMPONENT
const DangerZone: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        setError('');
        if (confirmPhrase !== 'Eliminar empresa') {
            setError('La frase de confirmación no coincide.');
            return;
        }
        if (!password) {
            setError('La contraseña es requerida.');
            return;
        }

        setIsDeleting(true);
        try {
            await deleteCompany(currentUser.id, password, currentUser.farmId!);
            alert("Empresa eliminada correctamente. Se cerrará la sesión.");
            window.location.href = '/';
        } catch (e: any) {
            setError(e.message);
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card className="border border-red-600/50 bg-red-900/10">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-red-500">Zona de Peligro</h3>
                        <p className="text-sm text-red-200/70 mt-1">
                            Acciones destructivas e irreversibles para la cuenta.
                        </p>
                    </div>
                    <Button 
                        variant="danger" 
                        onClick={() => setIsModalOpen(true)}
                        disabled={currentUser.companyRole !== 'owner'}
                    >
                        Eliminar Empresa
                    </Button>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="ELIMINAR EMPRESA DEFINITIVAMENTE"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} className="ml-2">Confirmar Eliminación</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="bg-red-500/20 border border-red-500 p-4 rounded text-red-200 text-sm">
                        ⚠️ <strong>ADVERTENCIA:</strong> Esta acción borrará permanentemente todos los datos de la empresa, incluyendo usuarios, contactos, sensores, reglas y reportes. No se puede deshacer.
                    </div>
                    
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Escribe la frase <strong>Eliminar empresa</strong> para confirmar:</label>
                        <Input 
                            label="" 
                            value={confirmPhrase} 
                            onChange={e => setConfirmPhrase(e.target.value)} 
                            placeholder="Eliminar empresa"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Contraseña del Owner:</label>
                        <Input 
                            label="" 
                            type="password"
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="Contraseña"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                </div>
            </Modal>
        </>
    );
};

// Main Settings Manager Component
const SettingsManager: React.FC<{user: User}> = ({ user }) => {
    const [farms, setFarms] = useState<Farm[]>([]);
    const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'danger'>('general');

    const refreshFarms = () => {
        getFarms(user.farmId).then(setFarms);
    };

    useEffect(() => {
        refreshFarms();
    }, [user.farmId]);

    return (
        <div className="space-y-6">
            <div className="flex space-x-2 border-b border-slate-700 pb-2 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'general' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white'}`}
                >
                    General
                </button>
                <button 
                    onClick={() => setActiveTab('integrations')}
                    className={`px-4 py-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'integrations' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-white'}`}
                >
                    Integraciones
                </button>
                {user.companyRole === 'owner' && (
                    <button 
                        onClick={() => setActiveTab('danger')}
                        className={`px-4 py-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'danger' ? 'text-red-500 border-b-2 border-red-500' : 'text-slate-400 hover:text-red-400'}`}
                    >
                        Zona de Peligro
                    </button>
                )}
            </div>

            {activeTab === 'general' && (
                <>
                    <FarmDataSettings onFarmsUpdate={refreshFarms} currentUser={user} />
                    <AssetSettings farms={farms} currentUser={user} />
                </>
            )}
            
            {activeTab === 'integrations' && (
                <IntegrationSettings currentUser={user} />
            )}

            {activeTab === 'danger' && user.companyRole === 'owner' && (
                <DangerZone currentUser={user} />
            )}
        </div>
    );
};

export default SettingsManager;
