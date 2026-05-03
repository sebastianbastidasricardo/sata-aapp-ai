import React, { useState, useEffect } from 'react';
import { User, TelegramGroup } from '../../types';
import { ICONS } from '../../constants';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import { useToast } from '../../hooks/useToast';
import { getTelegramGroups, addTelegramGroup, updateTelegramGroup, deleteTelegramGroup } from '../../services/api';

interface NotificationGroupsProps {
    currentUser: User;
}

const NotificationGroups: React.FC<NotificationGroupsProps> = ({ currentUser }) => {
    const { addToast } = useToast();
    const [groups, setGroups] = useState<TelegramGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Partial<TelegramGroup> | null>(null);

    const fetchGroups = async () => {
        setIsLoading(true);
        try {
            const data = await getTelegramGroups(currentUser.farmId);
            setGroups(data);
        } catch (error) {
            addToast('Error al cargar grupos', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, [currentUser.farmId]);

    const handleAddGroup = () => {
        setEditingGroup({
            name: '',
            chatId: '',
            isActive: true,
            farmId: currentUser.farmId || ''
        });
        setIsModalOpen(true);
    };

    const handleEditGroup = (group: TelegramGroup) => {
        setEditingGroup(group);
        setIsModalOpen(true);
    };

    const handleDeleteGroup = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este grupo de notificación?')) {
            try {
                await deleteTelegramGroup(id);
                setGroups(groups.filter(g => g.id !== id));
                addToast('Grupo eliminado correctamente', 'success');
            } catch (error) {
                addToast('Error al eliminar grupo', 'error');
            }
        }
    };

    const handleSaveGroup = async () => {
        if (!editingGroup?.name || !editingGroup?.chatId) {
            addToast('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            if (editingGroup.id) {
                const updated = await updateTelegramGroup(editingGroup as TelegramGroup);
                setGroups(groups.map(g => g.id === editingGroup.id ? updated : g));
                addToast('Grupo actualizado correctamente', 'success');
            } else {
                const newGroup = await addTelegramGroup(editingGroup as Omit<TelegramGroup, 'id'>);
                setGroups([...groups, newGroup]);
                addToast('Grupo enlazado correctamente', 'success');
            }
            setIsModalOpen(false);
        } catch (error) {
            addToast('Error al guardar grupo', 'error');
        }
    };

    const toggleStatus = async (group: TelegramGroup) => {
        try {
            const updated = { ...group, isActive: !group.isActive };
            await updateTelegramGroup(updated);
            setGroups(groups.map(g => g.id === group.id ? updated : g));
            addToast('Estado actualizado', 'info');
        } catch (error) {
            addToast('Error al actualizar estado', 'error');
        }
    };

    const columns = [
        { header: 'Nombre del Grupo', accessor: (g: TelegramGroup) => <span className="font-medium text-white">{g.name}</span> },
        { header: 'Chat ID', accessor: (g: TelegramGroup) => <code className="text-xs bg-slate-800 px-2 py-1 rounded text-primary">{g.chatId}</code> },
        { 
            header: 'Estado', 
            accessor: (g: TelegramGroup) => (
                <button 
                    onClick={() => toggleStatus(g)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${g.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                >
                    {g.isActive ? 'Activo' : 'Inactivo'}
                </button>
            )
        },
        {
            header: 'Acciones',
            accessor: (g: TelegramGroup) => (
                <div className="flex space-x-2">
                    <button onClick={() => handleEditGroup(g)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                        {ICONS.edit}
                    </button>
                    <button onClick={() => handleDeleteGroup(g.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        {ICONS.trash}
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Grupos Notificados</h1>
                    <p className="text-slate-400 mt-1">Gestiona los canales de mensajería para alertas automáticas.</p>
                </div>
                <Button onClick={handleAddGroup} icon={ICONS.plus}>
                    Enlazar Grupo
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
                                {ICONS.telegram}
                            </div>
                            <h2 className="text-xl font-semibold text-white">Integración con Telegram</h2>
                        </div>
                    </div>
                    <Table data={groups} columns={columns} isLoading={isLoading} />
                </Card>

                <Card className="h-fit">
                    <h3 className="text-lg font-semibold text-white mb-4">¿Cómo funciona?</h3>
                    <div className="space-y-4 text-sm text-slate-400">
                        <div className="flex space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</div>
                            <p>Agrega nuestro Bot de SATA a tu grupo de Telegram.</p>
                        </div>
                        <div className="flex space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</div>
                            <p>Obtén el <strong>Chat ID</strong> del grupo (puedes usar bots como @userinfobot).</p>
                        </div>
                        <div className="flex space-x-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">3</div>
                            <p>Registra el grupo aquí para empezar a recibir alertas en tiempo real.</p>
                        </div>
                        <div className="pt-4 border-t border-border">
                            <p className="italic text-xs">Próximamente: Integración con WhatsApp y Slack.</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingGroup?.id ? 'Editar Grupo' : 'Enlazar Nuevo Grupo'}
            >
                <div className="space-y-4">
                    <Input
                        label="Nombre del Grupo"
                        value={editingGroup?.name || ''}
                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        placeholder="Ej: Alertas Invernadero A"
                    />
                    <Input
                        label="Chat ID de Telegram"
                        value={editingGroup?.chatId || ''}
                        onChange={(e) => setEditingGroup({ ...editingGroup, chatId: e.target.value })}
                        placeholder="Ej: -100123456789"
                    />
                    <div className="flex items-center space-x-2 py-2">
                        <input 
                            type="checkbox" 
                            id="isActive"
                            checked={editingGroup?.isActive || false}
                            onChange={(e) => setEditingGroup({ ...editingGroup, isActive: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary"
                        />
                        <label htmlFor="isActive" className="text-sm text-slate-300">Activar notificaciones para este grupo</label>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveGroup}>
                            {editingGroup?.id ? 'Guardar Cambios' : 'Enlazar Grupo'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default NotificationGroups;
