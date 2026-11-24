# KlaroIglesia — App Satélite PWA de Gestión Ministerial

Aplicación web progresiva (**PWA Mobile-First & Offline-First**) conectada al backend de **KlaroConta** (`api-haber`), diseñada para la operación diaria de iglesias y ministerios desde dispositivos móviles: control de asistencia, check-in seguro de niños, consolidación/bautismos y registro de ofrendas con envío a la Bandeja de Revisión Contable de KlaroConta.

---

## Stack Tecnológico

- **Core:** React 19 + Vite 7 + TypeScript
- **PWA:** `vite-plugin-pwa` (`registerType: "autoUpdate"`, `display: "standalone"`, tema `#090d16`, Workbox precaching)
- **Routing:** TanStack Router (file-based routing en `src/app/routes/`)
- **Estado de Servidor:** TanStack Query v5
- **Estado Global / Sesión:** Zustand con `persist` (`src/stores/church-auth.store.ts` y `src/lib/offline-queue.ts`)
- **HTTP Client:** Axios (`src/lib/axios.ts`) con interceptor `Bearer` (PASETO v2) y renovación automática vía `POST /v1/tokens/renew_access`
- **UI & Formularios:** Tailwind CSS v4 + componentes Radix/Shadcn + Lucide React + Sonner + React Hook Form + Zod

---

## Requisitos Previos

- **Node.js** 20+ y **npm**
- Backend **KlaroConta (`api-haber`)** corriendo (por defecto en `http://localhost:8080`) con:
  - Migración `000024_church_satellite_module` aplicada
  - Empresa habilitada con `has_church_module = true` (desde `/admin/billing` en KlaroConta)
  - Al menos una sede y un ministerio configurados (desde `/dashboard/church-settings` en KlaroConta)

---

## Configuración y Arranque Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno:**
   Copia `.env.example` a `.env` y ajusta la URL del backend gRPC-Gateway:
   ```bash
   cp .env.example .env
   ```
   Contenido de `.env`:
   ```env
   VITE_API_URL=http://localhost:8080/v1
   ```

3. **Iniciar servidor de desarrollo (puerto `5174`):**
   ```bash
   npm run dev
   ```
   Disponible en `http://localhost:5174` (coexiste con KlaroConta Web en `http://localhost:5173`).

4. **Scripts disponibles:**
   ```bash
   npm run dev      # Servidor Vite de desarrollo en :5174
   npm run build    # Typecheck (tsc -b) + bundle de producción + Service Worker PWA
   npm run lint     # Verificación ESLint
   npm run preview  # Previsualización local del build de producción
   ```

---

## Flujos de Autenticación (`/login`)

La app soporta tres perfiles según la configuración de la iglesia en KlaroConta:

1. **Voluntario con Código ("Me dieron un código")** — Vista por defecto:
   - Ingresa el código del ministerio (formato `MIN-XXXXXX`) y tu nombre.
   - Endpoint: `POST /v1/church/auth/login-code`.
2. **Líder de Ministerio ("Correo y clave" → Líder Ministerio):**
   - Credenciales creadas en KlaroConta (`/dashboard/church-settings` → *Usuarios de Ministerio*).
   - Endpoint: `POST /v1/church/auth/login`.
   - Mantiene aislamiento estricto al ministerio (y sede asignada si aplica).
3. **Pastor / Administrador ("Correo y clave" → Pastor / Admin):**
   - Cuenta de KlaroConta con rol `ADMIN` o `EMPRESA` y `has_church_module === true`.
   - Endpoint: `POST /v1/login_user`.
   - Permite alternar entre todas las sedes y ministerios activos desde el Dashboard.

Al abrir la app con sesión guardada (`CHURCH_MINISTRY`), sincroniza permisos y sedes mediante `GET /v1/church/context`.

---

## Módulos Operativos y Aislamiento (`ministry.features`)

El Dashboard (`/`) y la barra inferior (`BottomNav`) muestran únicamente los módulos habilitados para el ministerio activo:

| Ruta | Capacidad (`features`) | Funcionalidad |
|---|---|---|
| `/` | *(Siempre visible)* | Resumen del día, evento activo, contador de presentes, selectores de sede/ministerio e instalador PWA (`beforeinstallprompt`) |
| `/attendance` | `attendance` | Apertura/cierre de cultos, buscador en vivo, check táctil optimista (marcar/desmarcar) y FAB `+` para Nuevo Ingreso |
| `/kids-checkin` | `kids_checkin` | Registro de niños (`metadata_json` con representante y alergias), generación de código `K-XXX`, ticket por WhatsApp y Check-out verificado en *"Adentro ahora"* |
| `/consolidation` | `baptisms` | Filtros pastorales (`Nuevos Creyentes`, `Visitantes`, `Sin Bautizar`, `Bautizados`), contacto por WhatsApp y registro de bautismo |
| `/offerings` | `offerings` | Puente hacia KlaroConta: Ofrenda General anónima y Diezmo/Primicia/`OFRENDA_ESPECIAL` (`VES`/`USD`), estatus en tiempo real (`PENDING_REVIEW`, `APPROVED`, `REJECTED`) y modal *"Corregir y Reenviar"* |

---

## Soporte Offline-First

Cuando se pierde conectividad durante un servicio o actividad, `src/lib/offline-queue.ts` almacena en `localStorage` las creaciones de personas, eventos, check-ins y ofrendas usando UUIDs generados en cliente (`crypto.randomUUID()`). Al restablecerse la conexión, `<OfflineBanner />` sincroniza en orden estricto (`people` → `events` → `attendance` → `offerings`) manejando respuestas `409 Conflict` de forma idempotente.

---

## Estructura del Proyecto

```text
frontend-iglesia/
├── docs/
│   └── skill.md                          # Especificación técnica y contrato de API
├── public/
│   ├── apple-touch-icon.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── app/routes/                       # Rutas file-based de TanStack Router
│   │   ├── __root.tsx
│   │   ├── login.tsx
│   │   ├── _app.tsx                      # AppShell, guard de sesión e hidratación
│   │   └── _app/
│   │       ├── index.tsx                 # Dashboard modular (/)
│   │       ├── attendance.tsx            # Asistencia y eventos
│   │       ├── kids-checkin.tsx          # Check-in / Check-out de niños
│   │       ├── consolidation.tsx         # Consolidación y bautismos
│   │       └── offerings.tsx             # Ofrendas y diezmos hacia KlaroConta
│   ├── components/
│   │   ├── layout/                       # BottomNav, OfflineBanner, FeatureRestrictedCard
│   │   └── ui/                           # Primitivos UI (Dark Glassmorphism)
│   ├── features/
│   │   ├── auth/                         # LoginView, InstallAppBanner, auth.service.ts
│   │   ├── church/                       # church.service.ts y hooks TanStack Query
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   ├── kids-checkin/
│   │   ├── consolidation/
│   │   └── offerings/                    # OfferingsView y ResubmitOfferingModal
│   ├── lib/
│   │   ├── axios.ts                      # Cliente HTTP + refresh PASETO single-flight
│   │   ├── offline-queue.ts              # Cola offline persistida
│   │   └── utils.ts
│   ├── stores/
│   │   └── church-auth.store.ts          # Estado de sesión Zustand persistido
│   └── types/
│       └── church.ts
├── .env.example
├── .gitignore
├── package.json
└── vite.config.ts                        # tanstackRouter() antes de react() + VitePWA
```

---

## Notas de Despliegue

- En producción, configurar `VITE_API_URL` apuntando al API Gateway de KlaroConta (ej. `https://api.klaroconta.app/v1`).
- Asegurar que el dominio donde se aloje esta PWA (ej. `https://iglesia.klaroconta.app`) esté permitido en `ALLOWED_ORIGINS` dentro de `api-haber/app.env`.
- La PWA requiere **HTTPS** en producción para registrar el Service Worker y habilitar el prompt de instalación en dispositivos móviles.
