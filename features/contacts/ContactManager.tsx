

import React, { useState, useEffect, useCallback } from 'react';
import { Contact, User } from '../../types';
import { getContacts, addContact, updateContact, deleteContact } from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Table from '../../components/Table';
import { ICONS } from '../../constants';

const ContactManager: React.FC<{currentUser: User}> = ({ currentUser }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentContact, setCurrentContact] = useState<Contact | null>(null);
    const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({ name: '', phone: '', email: '' });

    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        // Filter by user's farmId
        const data = await getContacts(currentUser.farmId);
        setContacts(data);
        setIsLoading(false);
    }, [currentUser.farmId]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);
    
    const resetForm = () => {
        setName('');
        setPhone('');
        setEmail('');
        setErrors({ name: '', phone: '', email: '' });
        setCurrentContact(null);
    };

    const hasPermission = () => {
        return currentUser.companyRole === 'owner' || currentUser.companyRole === 'admin';
    };

    const handleOpenModal = (contact: Contact | null = null) => {
        if (!hasPermission()) {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        resetForm();
        if (contact) {
            setCurrentContact(contact);
            setName(contact.name);
            setPhone(contact.phone);
            setEmail(contact.email || '');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const validateForm = () => {
        const newErrors = { name: '', phone: '', email: '' };
        let isValid = true;
        if (!name.trim()) {
            newErrors.name = 'El nombre es requerido.';
            isValid = false;
        }
        if (!phone.trim()) {
            newErrors.phone = 'El teléfono es requerido.';
            isValid = false;
        } else if (!/^\+\d{10,15}$/.test(phone)) {
            newErrors.phone = 'Formato de teléfono inválido (ej: +525512345678).';
            isValid = false;
        }
        
        if (!email.trim()) {
            newErrors.email = 'El correo electrónico es requerido.';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
             newErrors.email = 'Formato de correo inválido.';
             isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        if (currentContact) {
            await updateContact({ ...currentContact, name, phone, email });
        } else {
            // Ensure contact is linked to user's farm
            await addContact({ name, phone, email, farmId: currentUser.farmId } as any);
        }
        await fetchContacts();
        setIsSubmitting(false);
        handleCloseModal();
    };

    const openDeleteModal = (contact: Contact) => {
        if (!hasPermission()) {
            alert("No tienes permiso para hacer esto.");
            return;
        }
        setContactToDelete(contact);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setContactToDelete(null);
        setIsDeleteModalOpen(false);
    };
    
    const handleDelete = async () => {
        if (!contactToDelete) return;
        setIsSubmitting(true);
        await deleteContact(contactToDelete.id);
        await fetchContacts();
        setIsSubmitting(false);
        closeDeleteModal();
    };

    const columns = [
        { header: 'Nombre Completo', accessor: (item: Contact) => item.name },
        { header: 'Teléfono (SMS)', accessor: (item: Contact) => item.phone },
        { header: 'Correo Electrónico (Reportes)', accessor: (item: Contact) => item.email || <span className="text-slate-500 italic">No registrado</span> },
        {
            header: 'Acciones',
            accessor: (item: Contact) => (
                <div className="flex space-x-2">
                    <button 
                        onClick={() => handleOpenModal(item)} 
                        className="p-1.5 rounded-md text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all duration-200"
                        title="Editar Contacto"
                    >
                        {ICONS.edit}
                    </button>
                    <button 
                        onClick={() => openDeleteModal(item)} 
                        className="p-1.5 rounded-md text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all duration-200"
                        title="Eliminar Contacto"
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
                title="Lista de Contactos"
                titleAction={<Button onClick={() => handleOpenModal()} icon={ICONS.plus}>Añadir Contacto</Button>}
            >
                <Table columns={columns} data={contacts} isLoading={isLoading} />
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={currentContact ? 'Editar Contacto' : 'Añadir Nuevo Contacto'}
                footer={
                    <>
                        <Button variant="ghost" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSubmit} isLoading={isSubmitting} className="ml-2">Guardar</Button>
                    </>
                }
            >
                <Input label="Nombre Completo" value={name} onChange={e => setName(e.target.value)} error={errors.name} placeholder="Ej: Juan Pérez" />
                <Input label="Teléfono (SMS)" value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} placeholder="Ej: +525512345678" />
                <Input label="Correo Electrónico (Reportes)" type="email" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} placeholder="Ej: juan.perez@empresa.com" />
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
                <p>¿Estás seguro de que deseas eliminar al contacto <strong>{contactToDelete?.name}</strong>? Esta acción no se puede deshacer.</p>
            </Modal>
        </>
    );
};

export default ContactManager;
