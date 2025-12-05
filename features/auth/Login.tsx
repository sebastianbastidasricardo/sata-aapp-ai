
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';
import { authenticateUser, verify2FA, registerOwner, requestPasswordReset, validateInvitation, completeInvitation, initializeDatabase } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { ICONS } from '../../constants';

interface LoginProps {
    onLogin: (user: User) => void;
    initialToken?: string | null;
}

type AuthView = 'login' | 'register' | 'forgot' | '2fa' | 'invite';
type LoginPortal = 'farm_user' | 'sata_admin' | 'sata_tech';

const Login: React.FC<LoginProps> = ({ onLogin, initialToken }) => {
    // View State
    const [view, setView] = useState<AuthView>('login');
    const [selectedPortal, setSelectedPortal] = useState<LoginPortal>('farm_user');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showInitButton, setShowInitButton] = useState(false);

    // Form Data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [twoFACode, setTwoFACode] = useState('');

    // Temp user for 2FA flow
    const [tempUser, setTempUser] = useState<User | null>(null);

    // Invitation Data
    const [inviteToken, setInviteToken] = useState(initialToken || '');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteData, setInviteData] = useState<{role?: string, company?: string}>({});

    // Effect to handle initial invitation securely
    useEffect(() => {
        if (initialToken) {
            setIsLoading(true);
            // Validate token BEFORE showing invite screen
            validateInvitation(initialToken).then(({ email, isValid, role, companyName }) => {
                setIsLoading(false);
                if (isValid) {
                    setInviteEmail(email);
                    setInviteData({ role, company: companyName });
                    setView('invite'); // Only switch view if valid
                } else {
                    setError('El enlace de invitación es inválido o ha expirado.');
                    setView('login'); // Redirect to login
                }
            });
        }
    }, [initialToken]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setShowInitButton(false);
        setIsLoading(true);
        
        try {
            const user = await authenticateUser(email, password);
            
            if (user) {
                // STRICT ROLE CHECKING: User must match the selected portal
                if (user.role !== selectedPortal) {
                    let portalName = "Empresas";
                    if (selectedPortal === 'sata_admin') portalName = "Administrativos";
                    if (selectedPortal === 'sata_tech') portalName = "Técnicos";
                    
                    setError(`Credenciales inválidas para el portal de ${portalName}. Verifique su rol.`);
                    setIsLoading(false);
                    return;
                }

                // Check for High Security Roles (Admin/Tech) for 2FA
                if (user.role === 'sata_admin' || user.role === 'sata_tech') {
                    setTempUser(user);
                    setView('2fa');
                    setTwoFACode('');
                } else {
                    onLogin(user);
                }
            } else {
                setError('Credenciales inválidas o cuenta inexistente.');
                if (selectedPortal === 'sata_admin') {
                    setShowInitButton(true);
                }
            }
        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitDatabase = async () => {
        setIsLoading(true);
        const res = await initializeDatabase();
        setIsLoading(false);
        if (res.success) {
            setSuccessMsg(res.message);
            setShowInitButton(false);
        } else {
            setError(res.message);
        }
    };

    const handle2FASubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        if (!tempUser) return;

        const isValid = await verify2FA(tempUser.email, twoFACode);
        setIsLoading(false);

        if (isValid) {
            onLogin(tempUser);
        } else {
            setError('Código incorrecto. Intente "123456" para demo.');
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const newUser = await registerOwner({ name, email, password, companyName });
            setIsLoading(false);
            onLogin(newUser);
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || 'Error en el registro');
        }
    };

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        await requestPasswordReset(email);
        setIsLoading(false);
        setSuccessMsg(`Se ha enviado un enlace de recuperación a ${email}`);
        setTimeout(() => {
            setSuccessMsg('');
            setView('login');
        }, 3000);
    };

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);
        try {
            const user = await completeInvitation(inviteToken, password);
            setIsLoading(false);
            onLogin(user);
        } catch (err: any) {
            setIsLoading(false);
            setError(err.message || 'Error al completar el registro.');
        }
    };

    // --- RENDER HELPERS ---

    const renderHeader = (title: string, subtitle: string) => (
        <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
                {/* Use new LOGO if in Farm Portal, otherwise generic icons for staff */}
                {selectedPortal === 'farm_user' ? (
                    <div className="h-16 w-64 flex items-center justify-center">
                        {ICONS.logo}
                    </div>
                ) : (
                    <div className="flex items-center">
                        <div className="mr-3">
                            {selectedPortal === 'sata_admin' ? ICONS.globe : ICONS.server}
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-wide text-white">
                            SATA <span className="text-sm font-normal text-slate-400">{selectedPortal === 'sata_admin' ? 'CORP' : 'TECH'}</span>
                        </h1>
                    </div>
                )}
            </div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
    );

    const renderBackToLogin = () => (
        <div className="mt-4 text-center">
            <button 
                type="button" 
                onClick={() => { setView('login'); setError(''); setSuccessMsg(''); setShowInitButton(false); }} 
                className="text-primary text-sm hover:underline"
            >
                ← Volver al inicio de sesión
            </button>
        </div>
    );

    // --- VIEWS (Changed to render functions to avoid remounting issues) ---

    const renderPortalSelector = () => (
        <div className="grid grid-cols-3 gap-1 mb-6 bg-slate-900/50 p-1 rounded-lg border border-slate-700">
            <button 
                type="button"
                onClick={() => { setSelectedPortal('farm_user'); setError(''); setShowInitButton(false); }}
                className={`text-xs font-bold py-2 rounded-md transition-colors ${selectedPortal === 'farm_user' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
                Empresa
            </button>
            <button 
                type="button"
                onClick={() => { setSelectedPortal('sata_admin'); setError(''); setShowInitButton(false); }}
                className={`text-xs font-bold py-2 rounded-md transition-colors ${selectedPortal === 'sata_admin' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
                Admin
            </button>
            <button 
                type="button"
                onClick={() => { setSelectedPortal('sata_tech'); setError(''); setShowInitButton(false); }}
                className={`text-xs font-bold py-2 rounded-md transition-colors ${selectedPortal === 'sata_tech' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
                Tech
            </button>
        </div>
    );

    const renderLoginView = () => (
        <form onSubmit={handleLoginSubmit} className="space-y-6">
            {renderPortalSelector()}
            
            {selectedPortal === 'farm_user' && renderHeader('Portal de Empresas', 'Gestiona tus activos y cultivos')}
            {selectedPortal === 'sata_admin' && renderHeader('SATA Admin Corp', 'Panel de Administración Global')}
            {selectedPortal === 'sata_tech' && renderHeader('SATA Tech Support', 'Monitoreo de Infraestructura')}

            <Input 
                label="Correo Electrónico" 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder={selectedPortal === 'farm_user' ? "usuario@empresa.com" : selectedPortal === 'sata_admin' ? "admin@sata.com" : "tech@sata.com"}
            />
            <div>
                <Input 
                    label="Contraseña" 
                    type="password" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                />
                <div className="flex justify-end mt-1">
                    <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary hover:underline">
                        ¿Olvidaste tu contraseña?
                    </button>
                </div>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} variant={selectedPortal === 'farm_user' ? 'primary' : 'secondary'}>
                {selectedPortal === 'farm_user' ? 'Ingresar a mi Empresa' : 'Acceso Seguro Corporativo'}
            </Button>
            
            {showInitButton && selectedPortal === 'sata_admin' && (
                <div className="mt-4 text-center">
                    <button 
                        type="button"
                        onClick={handleInitDatabase}
                        className="text-xs text-orange-400 hover:text-orange-300 underline"
                    >
                        ¿Primera vez en la nube? Inicializar Usuarios Base
                    </button>
                </div>
            )}
            
            {selectedPortal === 'farm_user' && (
                <>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-card text-slate-500">¿No tienes cuenta?</span>
                        </div>
                    </div>

                    <Button type="button" variant="outline" className="w-full" onClick={() => setView('register')}>
                        Registrar mi Empresa
                    </Button>
                </>
            )}
        </form>
    );

    const renderRegisterView = () => (
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {renderHeader('Registro Empresarial', 'Crea una cuenta para tu finca')}
            <Input 
                label="Nombre de la Empresa / Finca" 
                required 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                placeholder="AgroIndustrias El Sol"
            />
            <Input 
                label="Nombre del Propietario" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Juan Pérez"
            />
            <Input 
                label="Correo Electrónico" 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="juan@elsol.com"
            />
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Contraseña" 
                    type="password" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                />
                <Input 
                    label="Confirmar" 
                    type="password" 
                    required 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                />
            </div>
            <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
                Crear Cuenta
            </Button>
            {renderBackToLogin()}
        </form>
    );

    const renderTwoFAView = () => (
        <form onSubmit={handle2FASubmit} className="space-y-6">
            {renderHeader('Seguridad Adicional', 'Verificación de dos pasos requerida')}
            <div className="bg-blue-500/10 border border-blue-500/50 p-3 rounded text-sm text-blue-200 mb-4">
                Por ser usuario de alto privilegio ({selectedPortal === 'sata_admin' ? 'Admin' : 'Tech'}), necesitamos confirmar tu identidad. 
                <br/><strong>Código Demo: 123456</strong>
            </div>
            <Input 
                label="Código de Verificación" 
                type="text" 
                required 
                value={twoFACode} 
                onChange={e => setTwoFACode(e.target.value)} 
                placeholder="123456"
                className="text-center tracking-[0.5em] font-bold"
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
                Verificar Acceso
            </Button>
            {renderBackToLogin()}
        </form>
    );

    const renderForgotView = () => (
        <form onSubmit={handleForgotSubmit} className="space-y-6">
            {renderHeader('Recuperar Contraseña', 'Te enviaremos un enlace de recuperación')}
            <Input 
                label="Correo Electrónico" 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="tu@correo.com"
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
                Enviar Enlace
            </Button>
            {renderBackToLogin()}
        </form>
    );

    const renderInviteView = () => (
        <form onSubmit={handleInviteSubmit} className="space-y-6">
            {renderHeader('Completar Perfil', 'Has sido invitado a unirte a SATA')}
            <div className="bg-slate-700/50 p-4 rounded text-center mb-4 border border-slate-600">
                <p className="text-slate-400 text-xs uppercase mb-1">
                    {inviteData.company ? `Invitado a ${inviteData.company}` : 'Invitación'}
                </p>
                <p className="text-white font-bold">{inviteEmail || 'Cargando...'}</p>
                {inviteData.role && (
                    <span className="inline-block mt-2 px-2 py-1 bg-primary/20 text-primary text-xs rounded border border-primary/50 uppercase font-bold">
                        Rol: {inviteData.role === 'owner' ? 'Propietario' : inviteData.role === 'admin' ? 'Administrador' : 'Miembro'}
                    </span>
                )}
            </div>
            <Input 
                label="Crea tu Contraseña" 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
            />
            <Input 
                label="Confirma tu Contraseña" 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
                Activar Cuenta e Ingresar
            </Button>
            <div className="mt-4 text-center">
                 <a href="/" className="text-slate-500 text-xs hover:text-slate-300">Ignorar invitación e ir al inicio</a>
            </div>
        </form>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
            {/* Background decoration */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] transition-colors duration-500 ${selectedPortal === 'farm_user' ? 'bg-primary/10' : selectedPortal === 'sata_admin' ? 'bg-blue-600/10' : 'bg-teal-600/10'}`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] transition-colors duration-500 ${selectedPortal === 'farm_user' ? 'bg-blue-500/10' : selectedPortal === 'sata_admin' ? 'bg-purple-600/10' : 'bg-emerald-600/10'}`}></div>

            <div className="w-full max-w-md p-8 space-y-4 bg-card rounded-xl shadow-2xl border border-border z-10 mx-4">
                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded text-sm text-center animate-pulse">
                        {error}
                    </div>
                )}
                {successMsg && (
                     <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded text-sm text-center">
                        {successMsg}
                    </div>
                )}

                {view === 'login' && renderLoginView()}
                {view === 'register' && renderRegisterView()}
                {view === '2fa' && renderTwoFAView()}
                {view === 'forgot' && renderForgotView()}
                {view === 'invite' && renderInviteView()}

            </div>
        </div>
    );
};

export default Login;
