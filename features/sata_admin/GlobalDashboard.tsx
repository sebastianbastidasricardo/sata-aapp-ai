
import React, { useState, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { getUsers, getFarms, updateUserStatus, deleteAccountByAdmin } from '../../services/api';
import { User, Farm } from '../../types';
import { ICONS } from '../../constants';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const GlobalDashboard: React.FC<{currentUser?: User}> = ({currentUser}) => {
    const [users, setUsers] = useState<User[]>([]);
    const [farms, setFarms] = useState<Farm[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal States
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [userToBlock, setUserToBlock] = useState<User | null>(null);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deletePhrase, setDeletePhrase] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const loadData = async () => {
        const [usersData, farmsData] = await Promise.all([getUsers(), getFarms()]);
        setUsers(usersData);
        setFarms(farmsData);
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const confirmBlockAction = (user: User) => {
        setUserToBlock(user);
        setIsBlockModalOpen(true);
    };

    const handleBlock = async () => {
        if (!userToBlock) return;
        const newStatus = userToBlock.status === 'Bloqueado' ? 'Activo' : 'Bloqueado';
        try {
            await updateUserStatus(userToBlock.id, newStatus);
            await loadData();
            setIsBlockModalOpen(false);
            setUserToBlock(null);
        } catch (e: any) {
            alert("Error al actualizar estado: " + e.message);
        }
    };

    const confirmDeleteAction = (user: User) => {
        if (currentUser?.role !== 'sata_admin') return;
        if (user.id === currentUser.id) {
            alert("No puedes eliminar tu propia cuenta.");
            return;
        }
        setUserToDelete(user);
        setDeletePhrase('');
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        if (deletePhrase !== 'eliminar cuenta') {
            alert('La frase de confirmación es incorrecta.');
            return;
        }

        setIsDeleting(true);
        try {
            await deleteAccountByAdmin(userToDelete.id);
            await loadData();
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch (e: any) {
            alert("Error al eliminar: " + e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Stats Calculation ---
    const stats = {
        totalCompanies: farms.length,
        totalUsers: users.length,
        totalAdmins: users.filter(u => u.role === 'sata_admin').length,
        activeUsers: users.filter(u => u.status === 'Activo').length
    };

    // --- Chart Data ---
    const roleDistribution = [
        { name: 'Usuarios Empresa', value: users.filter(u => u.role === 'farm_user').length },
        { name: 'SATA Admins', value: users.filter(u => u.role === 'sata_admin').length },
        { name: 'SATA Techs', value: users.filter(u => u.role === 'sata_tech').length },
    ].filter(d => d.value > 0);

    const companyUserCounts = farms
        .map(f => ({
            name: f.name,
            users: users.filter(u => u.farmId === f.id).length
        }))
        .filter(c => c.users > 0) // FILTER: Only show companies with at least 1 user
        .sort((a,b) => b.users - a.users)
        .slice(0, 5); // Top 5

    // --- Filtered Users for Table ---
    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCompanyName = (user: User) => {
        if (user.role === 'sata_admin' || user.role === 'sata_tech') return <span className="text-primary font-bold">SATA CORP</span>;
        const farm = farms.find(f => f.id === user.farmId);
        return farm ? farm.name : <span className="text-slate-500 italic">Sin Asignar</span>;
    };

    const columns = [
        { header: 'Usuario', accessor: (u: User) => (
            <div className="flex items-center">
                <div className="bg-slate-700 p-2 rounded-full mr-3 text-white">{ICONS.users}</div>
                <div>
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                </div>
            </div>
        )},
        { header: 'Organización', accessor: (u: User) => getCompanyName(u) },
        { header: 'Rol', accessor: (u: User) => {
            let label = '';
            let style = '';

            if (u.role === 'sata_admin') {
                label = 'Global Admin';
                style = 'bg-blue-900 text-blue-200 border-blue-700';
            } else if (u.role === 'sata_tech') {
                label = 'Tech Support';
                style = 'bg-teal-900 text-teal-200 border-teal-700';
            } else {
                switch (u.companyRole) {
                    case 'owner':
                        label = 'Propietario';
                        style = 'bg-purple-900 text-purple-200 border-purple-700';
                        break;
                    case 'admin':
                        label = 'Admin Empresa';
                        style = 'bg-indigo-900 text-indigo-200 border-indigo-700';
                        break;
                    case 'member':
                        label = 'Miembro';
                        style = 'bg-slate-700 text-slate-300 border-slate-600';
                        break;
                    default:
                        label = 'Usuario';
                        style = 'bg-slate-700 text-slate-300 border-slate-600';
                }
            }

            return (
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${style}`}>
                    {label}
                </span>
            );
        }},
        { header: 'Estado', accessor: (u: User) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                u.status === 'Activo' ? 'bg-green-500/20 text-green-400' : 
                u.status === 'Bloqueado' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
                {u.status}
            </span>
        )},
        { header: 'Acciones', accessor: (u: User) => (
            <div className="flex space-x-2">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => confirmBlockAction(u)}
                    className={u.status === 'Bloqueado' ? 'text-green-400 hover:text-green-300' : 'text-orange-400 hover:text-orange-300'}
                >
                    {u.status === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}
                </Button>
                
                {currentUser?.role === 'sata_admin' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDeleteAction(u)}
                        className="text-red-500 hover:bg-red-900/30 hover:text-red-300"
                        title="Eliminar Cuenta Definitivamente"
                    >
                        {ICONS.trash}
                    </Button>
                )}
            </div>
        )}
    ];

    return (
         <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase">Empresas Registradas</p>
                        <p className="text-4xl font-bold text-white mt-1">{stats.totalCompanies}</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">{ICONS.globe}</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase">Usuarios Totales</p>
                        <p className="text-4xl font-bold text-white mt-1">{stats.totalUsers}</p>
                    </div>
                    <div className="p-3 bg-green-500/20 rounded-full text-green-400">{ICONS.users}</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase">Staff SATA</p>
                        <p className="text-4xl font-bold text-white mt-1">{stats.totalAdmins}</p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">{ICONS.server}</div>
                </div>
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-bold uppercase">Estado Sistema</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">OPERATIVO</p>
                    </div>
                    <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Distribución de Usuarios (Top Empresas)">
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={companyUserCounts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={150} tick={{fill: '#94a3b8'}} />
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155'}} cursor={{fill: '#334155', opacity: 0.2}} />
                                <Bar dataKey="users" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card title="Composición del Ecosistema">
                    <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={roleDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {roleDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: '1px solid #334155'}} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="ml-4 space-y-2">
                             {roleDistribution.map((entry, index) => (
                                 <div key={index} className="flex items-center text-xs text-slate-300">
                                     <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: COLORS[index % COLORS.length]}}></span>
                                     {entry.name === 'Empresas' ? 'Usuarios Empresa' : entry.name}: {entry.value}
                                 </div>
                             ))}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Master User Table */}
            <Card title="Directorio Global de Usuarios">
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o correo en todo el sistema..." 
                        className="w-full md:w-1/3 bg-slate-900 border border-slate-700 text-white rounded p-2 focus:border-primary outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="max-h-[500px] overflow-y-auto">
                    <Table columns={columns} data={filteredUsers} isLoading={isLoading} />
                </div>
            </Card>

            {/* BLOCK CONFIRMATION MODAL */}
            <Modal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                title="Confirmar Acción de Seguridad"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsBlockModalOpen(false)}>Cancelar</Button>
                        <Button variant={userToBlock?.status === 'Bloqueado' ? 'primary' : 'danger'} onClick={handleBlock} className="ml-2">
                            Confirmar
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <div className="text-5xl mb-4">{userToBlock?.status === 'Bloqueado' ? '🔓' : '🔒'}</div>
                    <p className="text-lg text-white">¿Está seguro de que desea <strong>{userToBlock?.status === 'Bloqueado' ? 'desbloquear' : 'bloquear'}</strong> a este usuario?</p>
                    <p className="text-slate-400 text-sm mt-2">
                        {userToBlock?.status === 'Bloqueado' 
                            ? 'El usuario recuperará el acceso inmediato a la plataforma.' 
                            : 'El usuario perderá el acceso a la plataforma y no podrá iniciar sesión.'}
                    </p>
                </div>
            </Modal>

            {/* DELETE ACCOUNT MODAL (ADMIN ONLY) */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="ELIMINAR CUENTA (ADMINISTRADOR GLOBAL)"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={isDeleting} className="ml-2">Eliminar Definitivamente</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="bg-red-500/20 border border-red-500 p-4 rounded text-red-200 text-sm">
                        ⚠️ <strong>ADVERTENCIA DE SUPERUSUARIO:</strong> 
                        <br/>Estás a punto de eliminar la cuenta de <strong>{userToDelete?.name}</strong>.
                        {userToDelete?.companyRole === 'owner' && (
                            <div className="mt-2 font-bold text-red-100 uppercase">
                                Al ser PROPIETARIO, esta acción eliminará también toda la EMPRESA y los datos de todos sus usuarios asociados.
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">Escribe la frase <strong>eliminar cuenta</strong> para confirmar:</label>
                        <Input 
                            label="" 
                            value={deletePhrase} 
                            onChange={e => setDeletePhrase(e.target.value)} 
                            placeholder="eliminar cuenta"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GlobalDashboard;
