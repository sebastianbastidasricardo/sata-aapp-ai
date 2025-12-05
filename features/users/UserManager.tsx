

import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Select from '../../components/Select';
import { User, CompanyRole } from '../../types';
import { getUsers, inviteUser, deleteUser, updateUserStatus } from '../../services/api';
import { ICONS } from '../../constants';

interface UserManagerProps {
    currentUser: User;
}

const UserManager: React.FC<UserManagerProps> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<CompanyRole>('member');
    
    // Action State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [userToBlock, setUserToBlock] = useState<User | null>(null);
    const [deletePhrase, setDeletePhrase] = useState('');
    const [invitationData, setInvitationData] = useState<{link: string, emailSuccess: boolean, msg: string} | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        // Fetch only users for this specific farm using strict API filtering
        const companyUsers = await getUsers(currentUser.farmId);
        setUsers(companyUsers);
        setIsLoading(false);
    }, [currentUser.farmId]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenModal = () => {
        // Allow Owners AND Admins to invite
        if (currentUser.companyRole !== 'owner' && currentUser.companyRole !== 'admin') {
            alert("No tienes permiso para invitar usuarios.");
            return;
        }
        setName('');
        setEmail('');
        setRole('member');
        setInvitationData(null);
        setIsModalOpen(true);
    };

    const handleInvite = async () => {
        if (!name || !email) {
            alert("Nombre y correo son obligatorios.");
            return;
        }

        setIsSubmitting(true);
        const { link, emailResult } = await inviteUser({ 
            name, 
            email, 
            password: 'temp_password', // Mock default
            farmId: currentUser.farmId,
            companyRole: role,
            role: 'farm_user'
        });
        
        setInvitationData({
            link,
            emailSuccess: emailResult.success,
            msg: emailResult.message
        });
        setIsSubmitting(false);
        fetchUsers();
    };

    // New Function to handle Resend for pending users
    const handleResendInvite = async (user: User) => {
        setIsSubmitting(true);
        const { link, emailResult } = await inviteUser({
            name: user.name,
            email: user.email,
            password: 'temp_password',
            farmId: user.farmId,
            companyRole: user.companyRole,
            role: user.role
        });
        
        alert(`Invitación reenviada a ${user.email}.\nEstado: ${emailResult.success ? 'Enviado' : 'Error al enviar'}`);
        setIsSubmitting(false);
        fetchUsers();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setInvitationData(null);
    };

    // --- DELETION LOGIC ---
    const openDeleteModal = (user: User) => {
        if (currentUser.companyRole !== 'owner') {
            alert("Solo el propietario puede eliminar usuarios.");
            return;
        }
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
        if (deletePhrase !== 'Eliminar Usuario') {
            alert("La frase de confirmación es incorrecta.");
            return;
        }

        setIsSubmitting(true);
        await deleteUser(userToDelete.id);
        
        await fetchUsers();
        setIsSubmitting(false);
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    };

    // --- BLOCKING LOGIC ---
    const openBlockModal = (user: User) => {
        if (currentUser.companyRole === 'member') {
            alert("No tienes permiso para bloquear usuarios.");
            return;
        }
        if (currentUser.companyRole === 'admin' && (user.companyRole === 'owner' || user.companyRole === 'admin')) {
            alert("Los administradores solo pueden bloquear miembros.");
            return;
        }
        if (user.id === currentUser.id) {
            alert("No puedes bloquear tu propia cuenta.");
            return;
        }

        setUserToBlock(user);
        setIsBlockModalOpen(true);
    };

    const handleBlock = async () => {
        if (!userToBlock) return;
        setIsSubmitting(true);
        const newStatus = userToBlock.status === 'Bloqueado' ? 'Activo' : 'Bloqueado';
        try {
            await updateUserStatus(userToBlock.id, newStatus);
            await fetchUsers();
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setIsSubmitting(false);
            setIsBlockModalOpen(false);
            setUserToBlock(null);
        }
    };

    const getRoleBadge = (role?: CompanyRole) => {
        switch (role) {
            case 'owner': return <span className="bg-purple-900 text-purple-200 text-xs px-2 py-1 rounded border border-purple-700">Propietario</span>;
            case 'admin': return <span className="bg-blue-900 text-blue-200 text-xs px-2 py-1 rounded border border-blue-700">Administrador</span>;
            case 'member': return <span className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded border border-slate-600">Miembro</span>;
            default: return <span className="text-slate-400">-</span>;
        }
    };

    // Helper to calculate expiry time
    const getExpiryStatus = (user: User) => {
        if (user.status !== 'Pendiente' || !user.invitedAt) return null;
        
        const inviteTime = new Date(user.invitedAt).getTime();
        const now = Date.now();
        const diff = now - inviteTime;
        const hoursLeft = 24 - (diff / (1000 * 60 * 60));
        
        if (hoursLeft <= 0) {
            return <span className="text-xs text-red-400 ml-2 font-bold">(Expirado)</span>;
        }
        return <span className="text-[10px] text-yellow-500 ml-2">Expira en {Math.ceil(hoursLeft)}h</span>;
    };

    const columns = [
        { header: 'Nombre', accessor: (u: User) => u.name },
        { header: 'Correo Electrónico', accessor: (u: User) => u.email },
        { header: 'Rol', accessor: (u: User) => getRoleBadge(u.companyRole) },
        { 
            header: 'Estado', 
            accessor: (u: User) => (
                <div className="flex items-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.status === 'Activo' ? 'bg-green-100/10 text-green-400' : 
                        u.status === 'Pendiente' ? 'bg-yellow-100/10 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                        {u.status}
                    </span>
                    {getExpiryStatus(u)}
                </div>
            ) 
        },
        {
            header: 'Acciones',
            accessor: (u: User) => {
                // Self: No actions allowed in this view
                if (u.id === currentUser.id) return <span className="text-xs text-slate-500 italic flex items-center h-8 px-2">Tú</span>;

                // Determine Permissions
                const canBlock = (currentUser.companyRole === 'owner' || (currentUser.companyRole === 'admin' && u.companyRole === 'member'));
                const canDelete = currentUser.companyRole === 'owner';
                const isPending = u.status === 'Pendiente';
                
                // Owner can resend if pending. Admins can resend if they invited? Let's allow admins to resend to members.
                const canResend = isPending && (currentUser.companyRole === 'owner' || (currentUser.companyRole === 'admin' && u.companyRole !== 'owner'));

                // Action Button Styles
                const btnBase = "p-1.5 rounded-md border transition-all duration-200 flex items-center justify-center w-8 h-8";
                const btnBlue = "text-blue-400 border-blue-500/30 hover:bg-blue-500/10";
                const btnRed = "text-red-400 border-red-500/30 hover:bg-red-500/10";
                const btnOrange = "text-orange-400 border-orange-500/30 hover:bg-orange-500/10";
                const btnGreen = "text-green-400 border-green-500/30 hover:bg-green-500/10";

                return (
                    <div className="flex items-center space-x-2">
                        {/* Slot 1: Resend Invitation (Fixed Width Slot) */}
                        {canResend ? (
                             <button
                                onClick={() => handleResendInvite(u)}
                                className={`${btnBase} ${btnBlue}`}
                                title="Reenviar Invitación"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </button>
                        ) : (
                            <div className="w-8 h-8"></div> // Spacer for alignment
                        )}

                        {/* Slot 2: Block/Unblock (Fixed Width Slot) */}
                        {canBlock ? (
                            <button
                                onClick={() => openBlockModal(u)}
                                className={`${btnBase} ${u.status === 'Bloqueado' ? btnGreen : btnOrange}`}
                                title={u.status === 'Bloqueado' ? 'Desbloquear Usuario' : 'Bloquear Acceso'}
                            >
                                {u.status === 'Bloqueado' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                )}
                            </button>
                        ) : (
                            <div className="w-8 h-8"></div> // Spacer
                        )}

                        {/* Slot 3: Delete (Fixed Width Slot) */}
                        {canDelete ? (
                            <button 
                                onClick={() => openDeleteModal(u)} 
                                className={`${btnBase} ${btnRed}`}
                                title="Eliminar Usuario"
                            >
                                {ICONS.trash}
                            </button>
                        ) : (
                            <div className="w-8 h-8"></div> // Spacer
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Invita y administra los accesos a tu empresa</h2>
                <p className="text-slate-400 text-sm">Gestiona quién puede ver y editar la información de tus activos.</p>
            </div>

            <Card 
                title="Usuarios de la Empresa" 
                titleAction={
                    <Button onClick={handleOpenModal} icon={ICONS.plus}>
                        Invitar Usuario
                    </Button>
                }
            >
                <Table columns={columns} data={users} isLoading={isLoading} />
            </Card>

            {/* INVITE MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title="Invitar Nuevo Usuario"
                footer={
                    !invitationData ? (
                        <>
                            <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                            <Button onClick={handleInvite} isLoading={isSubmitting} className="ml-2">Generar Invitación</Button>
                        </>
                    ) : (
                         <Button onClick={handleCloseModal}>Cerrar</Button>
                    )
                }
            >
                {!invitationData ? (
                    <>
                        <Input label="Nombre Completo" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Maria Gomez" />
                        <Input label="Correo Electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: maria@empresa.com" />
                        <Select label="Rol Asignado" value={role} onChange={e => setRole(e.target.value as CompanyRole)}>
                            <option value="member">Miembro (Solo Lectura)</option>
                            <option value="admin">Administrador (Gestión Operativa)</option>
                            {/* Only Owners can create other Owners */}
                            {currentUser.companyRole === 'owner' && (
                                <option value="owner">Propietario (Acceso Total)</option>
                            )}
                        </Select>
                        <div className="mt-4 p-3 bg-slate-700/50 rounded text-xs text-slate-300 border border-slate-600">
                            <p className="font-bold mb-1">Permisos por Rol:</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li><strong>Propietario:</strong> Gestión total, invitar usuarios, editar empresa.</li>
                                <li><strong>Administrador:</strong> Gestionar activos, sensores, reglas y contactos.</li>
                                <li><strong>Miembro:</strong> Ver dashboard y generar reportes.</li>
                            </ul>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        {invitationData.emailSuccess ? (
                            <>
                                <div className="text-green-400 mb-2">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h3 className="text-lg font-bold text-white">¡Invitación Enviada!</h3>
                                <p className="text-slate-400 text-sm">Se ha enviado un correo a <strong>{email}</strong>.</p>
                            </>
                        ) : (
                             <>
                                <div className="text-orange-400 mb-2">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                </div>
                                <h3 className="text-lg font-bold text-white">Usuario Creado (Sin Email)</h3>
                                <p className="text-orange-300 text-sm bg-orange-500/10 p-2 rounded border border-orange-500/50">
                                    {invitationData.msg}
                                </p>
                                <p className="text-slate-400 text-sm mt-2">Por favor, copia el enlace manualmente y envíalo al usuario:</p>
                            </>
                        )}
                        <div className="bg-slate-900 p-3 rounded border border-slate-700 break-all font-mono text-sm text-primary select-all">
                            {invitationData.link}
                        </div>
                    </div>
                )}
            </Modal>

            {/* BLOCK CONFIRMATION MODAL */}
            <Modal
                isOpen={isBlockModalOpen}
                onClose={() => setIsBlockModalOpen(false)}
                title={userToBlock?.status === 'Bloqueado' ? 'Desbloquear Usuario' : 'Bloquear Usuario'}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsBlockModalOpen(false)}>Cancelar</Button>
                        <Button 
                            variant={userToBlock?.status === 'Bloqueado' ? 'primary' : 'danger'} 
                            onClick={handleBlock} 
                            isLoading={isSubmitting} 
                            className="ml-2"
                        >
                            {userToBlock?.status === 'Bloqueado' ? 'Confirmar Desbloqueo' : 'Confirmar Bloqueo'}
                        </Button>
                    </>
                }
            >
                <div className="text-center">
                    <p className="text-lg text-white mb-2">
                        ¿Está seguro de que desea <strong>{userToBlock?.status === 'Bloqueado' ? 'desbloquear' : 'bloquear'}</strong> a <strong>{userToBlock?.name}</strong>?
                    </p>
                    <p className="text-slate-400 text-sm">
                        {userToBlock?.status === 'Bloqueado' 
                            ? 'El usuario podrá volver a ingresar a la plataforma.' 
                            : 'El acceso del usuario a la cuenta de la empresa quedará restringido.'}
                    </p>
                </div>
            </Modal>

            {/* STRICT DELETE CONFIRMATION MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="CONFIRMAR ELIMINACIÓN DE USUARIO"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                        <Button 
                            variant="danger" 
                            onClick={handleDelete} 
                            isLoading={isSubmitting} 
                            className="ml-2"
                            disabled={deletePhrase !== 'Eliminar Usuario'}
                        >
                            Eliminar Definitivamente
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-slate-300">
                        ¿Estás seguro de que deseas eliminar a <strong>{userToDelete?.name}</strong>? Esta acción no se puede deshacer.
                    </p>
                    
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Para confirmar, escriba la frase <strong>Eliminar Usuario</strong>:
                        </label>
                        <Input 
                            label="" 
                            value={deletePhrase} 
                            onChange={e => setDeletePhrase(e.target.value)} 
                            placeholder="Eliminar Usuario"
                            className="border-red-500 focus:border-red-600 focus:ring-red-600"
                        />
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default UserManager;
