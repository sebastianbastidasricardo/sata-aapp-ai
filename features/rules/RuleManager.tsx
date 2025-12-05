

import React, { useState, useEffect, useCallback } from 'react';
import { AlertRule, Contact, Greenhouse, AlertType, User } from '../../types';
import { getRules, addRule, updateRule, deleteRule, getContacts, getGreenhouses } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Select from '../../components/Select';
import Input from '../../components/Input';
import Table from '../../components/Table';
import { ICONS } from '../../constants';

const RuleManager: React.FC<{currentUser: User}> = ({ currentUser }) => {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentRule, setCurrentRule] = useState<AlertRule | null>(null);
    const [ruleToDelete, setRuleToDelete] = useState<AlertRule | null>(null);

    // Form state
    const [greenhouseId, setGreenhouseId] = useState('');
    const [alertType, setAlertType] = useState<AlertType>(AlertType.TEMP_MAX);
    const [threshold, setThreshold] = useState<number | ''>('');
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const farmId = currentUser.farmId;
        const [rulesData, contactsData, greenhousesData] = await Promise.all([
            getRules(farmId),
            getContacts(farmId),
            getGreenhouses(farmId)
        ]);
        setRules(rulesData);
        setContacts(contactsData);
        setGreenhouses(greenhousesData);
        if (greenhousesData.length > 0 && !greenhouseId) {
            setGreenhouseId(greenhousesData[0].id);
        }
        setIsLoading(false);
    }, [greenhouseId, currentUser.farmId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const resetForm = () => {
        setGreenhouseId(greenhouses.length > 0 ? greenhouses[0].id : '');
        setAlertType(AlertType.TEMP_MAX);
        setThreshold('');
        setSelectedContacts([]);
        setCurrentRule(null);
    };

    const hasPermission = () => {
        return currentUser.companyRole === 'owner' || currentUser.companyRole === 'admin';
    };

    const handleOpenModal = (rule: AlertRule | null = null) => {
        if (!hasPermission()) {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        resetForm();
        if (rule) {
            setCurrentRule(rule);
            setGreenhouseId(rule.greenhouseId);
            setAlertType(rule.type);
            setThreshold(rule.threshold);
            setSelectedContacts(rule.contactIds);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSubmit = async () => {
        if (threshold === '' || selectedContacts.length === 0) {
            alert("Por favor, complete todos los campos.");
            return;
        }
        
        const ruleData = { greenhouseId, type: alertType, threshold: Number(threshold), contactIds: selectedContacts };
        setIsSubmitting(true);
        if (currentRule) {
            await updateRule({ ...currentRule, ...ruleData });
        } else {
            await addRule(ruleData);
        }
        await fetchData();
        setIsSubmitting(false);
        handleCloseModal();
    };
    
    const openDeleteModal = (rule: AlertRule) => {
        if (!hasPermission()) {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        setRuleToDelete(rule);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setRuleToDelete(null);
        setIsDeleteModalOpen(false);
    };

    const handleDelete = async () => {
        if (!ruleToDelete) return;
        setIsSubmitting(true);
        await deleteRule(ruleToDelete.id);
        await fetchData();
        setIsSubmitting(false);
        closeDeleteModal();
    };

    const getGreenhouseName = (id: string) => {
        const g = greenhouses.find(g => g.id === id);
        return g ? `${g.name} (${g.location})` : 'N/A';
    };

    const getRuleDescription = (rule: AlertRule) => {
        const greenhouseName = getGreenhouseName(rule.greenhouseId);
        const unit = rule.type.includes('Temp') ? '°C' : '%';
        const condition = rule.type === AlertType.TEMP_MIN ? 'baja de' : 'supera los';
        return `Alertar cuando en "${greenhouseName}" la ${rule.type.toLowerCase()} ${condition} ${rule.threshold}${unit}`;
    };

    const columns = [
        { header: 'Descripción de la Regla', accessor: (item: AlertRule) => getRuleDescription(item) },
        { header: 'Contactos a Notificar', accessor: (item: AlertRule) => item.contactIds.map(id => contacts.find(c=>c.id === id)?.name || 'N/A').join(', ') },
        {
            header: 'Acciones',
            accessor: (item: AlertRule) => (
                <div className="flex space-x-2">
                    <button 
                        onClick={() => handleOpenModal(item)} 
                        className="p-1.5 rounded-md text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all duration-200"
                        title="Editar Regla"
                    >
                        {ICONS.edit}
                    </button>
                    <button 
                        onClick={() => openDeleteModal(item)} 
                        className="p-1.5 rounded-md text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200"
                        title="Eliminar Regla"
                    >
                        {ICONS.trash}
                    </button>
                </div>
            )
        },
    ];

    return (
        <>
            <Card
                title="Lista de Reglas Activas"
                titleAction={<Button onClick={() => handleOpenModal()} icon={ICONS.plus}>Añadir Regla</Button>}
            >
                <Table columns={columns} data={rules} isLoading={isLoading} />
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={currentRule ? 'Editar Regla' : 'Añadir Nueva Regla'}
                footer={
                    <>
                        <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSubmit} isLoading={isSubmitting} className="ml-2">Guardar</Button>
                    </>
                }
            >
                <Select label="Activo Monitoreado" value={greenhouseId} onChange={e => setGreenhouseId(e.target.value)}>
                    {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name} ({g.location})</option>)}
                </Select>
                <Select label="Tipo de Alerta" value={alertType} onChange={e => setAlertType(e.target.value as AlertType)}>
                    {Object.values(AlertType).map(type => <option key={type} value={type}>{type}</option>)}
                </Select>
                <Input label="Umbral" type="number" value={threshold} onChange={e => setThreshold(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ej: 30"/>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Notificar a:</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-border p-3 rounded-md bg-slate-700">
                        {contacts.length === 0 ? (
                            <p className="text-xs text-slate-400">No hay contactos registrados. Vaya a la sección Contactos.</p>
                        ) : (
                            contacts.map(contact => (
                                <label key={contact.id} className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 text-primary bg-slate-600 border-slate-500 rounded focus:ring-primary focus:ring-offset-card"
                                        checked={selectedContacts.includes(contact.id)}
                                        onChange={() => {
                                            setSelectedContacts(prev =>
                                                prev.includes(contact.id)
                                                    ? prev.filter(id => id !== contact.id)
                                                    : [...prev, contact.id]
                                            );
                                        }}
                                    />
                                    <span className="ml-3 text-sm text-slate-300">{contact.name} ({contact.phone})</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
            
             <Modal
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                title="Confirmar Eliminación"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeDeleteModal}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDelete} isLoading={isSubmitting} className="ml-2">Eliminar</Button>
                    </>
                }
            >
                <p>¿Estás seguro de que deseas eliminar esta regla? Esta acción no se puede deshacer.</p>
                 <p className="text-sm bg-slate-700 p-2 mt-2 rounded">{ruleToDelete ? getRuleDescription(ruleToDelete) : ''}</p>
            </Modal>
        </>
    );
};

export default RuleManager;
