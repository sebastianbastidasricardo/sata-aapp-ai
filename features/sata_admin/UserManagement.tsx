
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { User, UserRole } from '../../types';
import { getUsers, inviteUser, deleteUser } from '../../services/api';
import { ICONS } from '../../constants';
import Select from '../../components/Select';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State for INTERNAL STAFF
    const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'sata_tech' as UserRole });
    const [invitationData, setInvitationData] = useState<{link: string, emailSuccess: boolean, msg: string} | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const allUsers = await getUsers();
        // Only show SATA Staff (Admins and Techs)
        const staffUsers = allUsers.filter(u => u.role === 'sata_admin' || u.role === 'sata_tech');
        setUsers(staffUsers);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInvite = async () => {
        if (newStaff.name && newStaff.email) {
            setIsSubmitting(true);
            const { link, emailResult } = await inviteUser({
                name: newStaff.name,
                email: newStaff.email,
                password: 'temp', // API generates invite link, password set later
                role: newStaff.role
            });
            
            setInvitationData({
                link,
                emailSuccess: emailResult.success,
                msg: emailResult.message
            }); 
            setIsSubmitting(false);
            fetchData();
        } else {
            alert("Complete todos los campos.");
        }
    };

    const handleCloseModal = () => {
        setInviteModalOpen(false);
        setInvitationData(null);
        setNewStaff({ name: '', email: '', role: 'sata_tech' });
    };
    
    const openDeleteModal = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (userToDelete) {
            await deleteUser(userToDelete.id);
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
            fetchData();
        }
    };

    const columns = [
        { header: 'Nombre Staff', accessor: (item: User) => <span className="font-bold text-white">{item.name}</span> },
        { header: 'Correo Corporativo', accessor: (item: User) => item.email },
        { header: 'Rol Asignado', accessor: (item: User) => (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                item.role === 'sata_admin' ? 'bg-blue-900 text-blue-200 border border-blue-700' : 'bg-teal-900 text-teal-200 border border-teal-700'
            }`}>
                {item.role === 'sata_admin' ? 'Global Admin' : 'Tech Support'}
            </span> 
        )},
        {
            header: 'Estado',
            accessor: (item: User) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'Activo' ? 'bg-green-100/10 text-green-400' : 'bg-yellow-100/10 text-yellow-400'}`}>
                    {item.status}
                </span>
            )
        },
        {
            header: 'Acciones',
            accessor: (item: User) => (
                <Button variant="ghost" size="sm" onClick={() => openDeleteModal(item)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400" icon={ICONS.trash}>
                    Revocar Acceso
                </Button>
            )
        }
    ];

    return (
        <>
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Gestión de Equipo Interno SATA</h2>
                <p className="text-slate-400 text-sm">Administra los permisos y accesos del staff administrativo y técnico.</p>
            </div>

            <Card title="Personal Autorizado" titleAction={<Button onClick={() => setInviteModalOpen(true)} icon={ICONS.plus}>Invitar Nuevo Staff</Button>}>
                <Table columns={columns} data={users} isLoading={isLoading} />
            </Card>

            <Modal isOpen={isInviteModalOpen} onClose={handleCloseModal} title="Invitar al Equipo SATA" footer={
                !invitationData ? (
                    <>
                        <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleInvite} isLoading={isSubmitting} className="ml-2">Enviar Invitación</Button>
                    </>
                ) : (
                    <Button onClick={handleCloseModal}>Cerrar</Button>
                )
            }>
                {!invitationData ? (
                    <>
                        <Input label="Nombre Completo" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Ej: Carlos Tech" />
                        <Input label="Correo Electrónico" type="email" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="ejemplo@sata.com" />
                        <Select label="Rol a Asignar" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}>
                            <option value="sata_tech">Soporte Técnico (Infraestructura)</option>
                            <option value="sata_admin">Administrador Global (Gestión Total)</option>
                        </Select>
                        <p className="text-xs text-slate-500 mt-2 bg-slate-900 p-2 rounded border border-slate-700">
                            * El usuario recibirá un correo electrónico con un enlace seguro para configurar su contraseña.
                        </p>
                    </>
                ) : (
                    <div className="text-center space-y-4">
                        {invitationData.emailSuccess ? (
                            <>
                                <div className="text-green-400 mb-2">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h3 className="text-lg font-bold text-white">¡Invitación Enviada!</h3>
                                <p className="text-slate-400 text-sm">Se ha enviado un correo a <strong>{newStaff.email}</strong>.</p>
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

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Revocación" footer={
                 <>
                    <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete} className="ml-2">Revocar Acceso</Button>
                </>
            }>
                <p>¿Estás seguro de que deseas eliminar al usuario <strong>{userToDelete?.name}</strong>?</p>
                <p className="text-sm text-red-400 mt-2">Perderá acceso inmediato al panel de administración.</p>
            </Modal>
        </>
    );
};

export default UserManagement;
