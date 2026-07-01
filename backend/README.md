# SATA - Sistema de Alerta Temprana Agrícola (Backend & Arquitectura)

Este directorio documenta el funcionamiento interno, la arquitectura, los endpoints y la estructura general de SATA. Al estar desplegado de forma "Serverless" en Vercel y conectado a Supabase, el backend está diseñado para ser ligero, seguro y sumamente escalable en planes gratuitos.

---

## 🚀 Arquitectura General

SATA utiliza una arquitectura **Híbrida Servidor-Cliente (Serverless)**:

1. **Operaciones Directas (Cliente -> Supabase):** 
   Para lecturas y escrituras estándar de sensores, invernaderos, alertas y contactos, el frontend de React se comunica directamente con Supabase usando su SDK cliente. Esto aprovecha las políticas de seguridad a nivel de fila (RLS) para mayor velocidad y menor latencia.

2. **Operaciones Privilegiadas o Seguras (Cliente -> API Serverless -> Servicios Externos):**
   Para tareas que requieren claves secretas (como la API de Resend para correos o la Service Role Key de Supabase para administración de usuarios), el frontend consulta nuestros **Endpoints Serverless** ubicados en la carpeta `/api/`. Esto previene fugas de seguridad (API Keys) y soluciona problemas de CORS.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Motion (para animaciones).
* **Backend:** Node.js, Express (para desarrollo local) y Vercel Serverless Functions (para producción).
* **Base de Datos & Auth:** Supabase (PostgreSQL) con Supabase Auth integrado.
* **Integraciones:**
  * **Resend:** Proveedor de envío de correos electrónicos transaccionales y reportes.
  * **Telegram:** Bot para alertas críticas en tiempo real enviadas a grupos.
  * **Gemini API:** Modelo inteligente para simular el diagnóstico técnico agrícola.

---

## 📂 Estructura de Carpetas Clave

* **`/api/`**: Contiene los endpoints serverless que se ejecutan como funciones en la nube (Vercel):
  * `chat.ts`: Lógica del chat conversacional inteligente.
  * `email.ts`: Proxy seguro para enviar correos usando Resend.
  * `invite.ts`: Creación segura de nuevos usuarios usando privilegios de administrador.
  * `complete-invite.ts`: Activación de cuentas invitadas y registro de su contraseña final.
* **`/services/`**: Módulos que conectan el frontend con las APIs de datos y mensajería:
  * `api.ts`: Centraliza las llamadas a bases de datos y APIs.
  * `supabaseClient.ts`: Inicializa la conexión segura con Supabase.
  * `emailService.ts`: Lógica de plantillas HTML y disparadores de correo.
  * `telegramService.ts`: Despachador de alertas y validaciones del Bot de Telegram.
* **`/features/`**: Los módulos visuales y funcionales de la aplicación:
  * `sata_admin/`: Portal corporativo para administrar empresas enteras y soporte global.
  * `sata_tech/`: Herramientas para técnicos de soporte técnico de hardware.
  * `users/`: Gestión de invitaciones, roles y usuarios a nivel de empresa agrícola.
  * `reports/`: Generador de reportes manuales e históricos y programación de envíos.
  * `predictions/`: Motor de Inteligencia Artificial para pronosticar heladas y plagas.

---

## 🔌 Detalle de Endpoints (APIs Serverless)

### 1. `POST /api/chat`
* **Descripción:** Proxy conversacional con Gemini.
* **Payload:** `{ message: "pregunta del usuario" }`
* **Seguridad:** Utiliza `GEMINI_API_KEY` de forma privada en el servidor para evitar exponer la clave en el navegador.

### 2. `POST /api/email`
* **Descripción:** Envía correos electrónicos dinámicos utilizando Resend.
* **Payload:** `{ to: ["email@ejemplo.com"], subject: "Asunto", html: "<h1>Contenido</h1>" }`
* **Seguridad:** Utiliza `VITE_RESEND_API_KEY` y `VITE_SENDER_EMAIL` en el entorno del servidor, evitando bloqueos por CORS y protegiendo tus credenciales de envío.

### 3. `POST /api/invite`
* **Descripción:** Registra un nuevo usuario de forma "Pendiente" en Supabase Auth y en la tabla pública de usuarios.
* **Payload:** `{ email, name, role, farmId, companyRole }`
* **Seguridad:** Requiere obligatoriamente `SUPABASE_SERVICE_ROLE_KEY` en tus variables de entorno para usar el SDK de Administrador. Esto permite crear cuentas sin requerir que los usuarios se auto-registren abiertamente en la aplicación.

### 4. `POST /api/complete-invite`
* **Descripción:** Activa un usuario pendiente, actualiza su contraseña definitiva en Supabase Auth y cambia su estado a "Activo" en la base de datos pública.
* **Payload:** `{ email, password }`
* **Seguridad:** Valida previamente el token de invitación (con expiración de 24 horas) y utiliza el SDK de Administrador para actualizar la contraseña de manera segura.

---

## ⚙️ Variables de Entorno Requeridas (.env)

Para que el sistema de invitaciones, correos y alertas funcione al 100% en producción (Vercel), debes configurar las siguientes variables de entorno en el panel de configuración de tu proyecto:

| Variable | Descripción | Origen |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL de tu proyecto de Supabase | Supabase Settings |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | Supabase Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de rol de servicio (secreta) | Supabase Settings (Sección API) |
| `VITE_RESEND_API_KEY` | Clave API de tu cuenta de Resend | Resend API Keys |
| `VITE_SENDER_EMAIL` | Correo del remitente (ej. `no-reply@agrosata.online`) | Dominio verificado en Resend |
| `VITE_TELEGRAM_BOT_TOKEN` | Token del Bot de alertas de Telegram | BotFather de Telegram |
| `GEMINI_API_KEY` | Clave para el Chatbot inteligente | Google AI Studio |

---

## 🤖 Simulador de Datos y Alertas en Tiempo Real

El flujo de monitoreo agrícola en SATA funciona así:
1. **Generación de Datos:** Mientras el usuario esté en la aplicación, un simulador genera lecturas realistas de temperatura y humedad para los activos (sensores) cada pocos segundos.
2. **Evaluación de Reglas:** Cada lectura nueva es evaluada inmediatamente contra las reglas de alerta configuradas en la empresa.
3. **Disparo de Alertas:** Si una lectura excede los límites (ej. temperatura menor a 2°C para prevención de heladas):
   * Se registra la alerta en la base de datos para los reportes históricos.
   * Se dispara de forma inmediata un mensaje al **Grupo de Telegram** enlazado mediante el webhook de nuestro bot.
   * Se envía una notificación por **Correo Electrónico** a los destinatarios configurados en la sección de "Predicciones AI" si la alerta es de carácter urgente o preventivo.
