# 📱 KlaroIglesia (App Satélite PWA de KlaroConta)

## 1. Propósito del Proyecto
**KlaroIglesia** (`iglesia.klaroconta.app`) es una aplicación web progresiva (**PWA Mobile-First & Offline-First**) diseñada para la gestión operativa y ministerial de iglesias evangélicas (sedes/territorios, ministerios de niños, consolidación, bautismos, eventos, asistencia y recepción de ofrendas).

Opera como un **satélite desacoplado de KlaroConta** sobre el esquema aislado `church` del backend `api-haber`: los voluntarios y líderes registran la actividad diaria desde sus teléfonos sin acceder a la contabilidad empresarial, mientras que las ofrendas reportadas viajan a la **Bandeja de Revisión Contable** en KlaroConta (`/dashboard/church-inbox`), donde tesorería/contabilidad las aprueba o rechaza con motivo.

---

## 2. Stack Tecnológico y Convenciones del Monorepo
- **Core:** React 19 + Vite 7 + TypeScript (alineado con `frontend-haber`).
- **PWA & Offline:** `vite-plugin-pwa` (Manifiesto, Service Worker, íconos, instalable en Android/iOS) + soporte de cola de sincronización offline usando UUIDs generados en cliente (`crypto.randomUUID()`).
- **Routing:** TanStack Router con rutas basadas en archivos (`src/app/routes/`). **Regla crítica:** el plugin `tanstackRouter()` SIEMPRE debe ir ANTES que `react()` en `vite.config.ts`.
- **Data Fetching:** TanStack Query v5 (`useQuery`, `useMutation`).
- **Estado Global:** Zustand con `persist`:
  - `accessToken`, `refreshToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `sessionId`
  - `companyId`, `companyName`
  - `ministry` (`id`, `name`, `description`, `features`, `is_active`)
  - `volunteerName`, `ministryRole` (`"LEADER" | "VOLUNTEER"`)
  - `assignedBranchId` (si viene con valor desde el token, la sesión está bloqueada a esa sede; si viene `""`, el usuario puede operar en cualquier sede activa)
  - `activeBranchId` (sede seleccionada por defecto en la UI)
  - `branches` (lista de sedes activas disponibles para el usuario)
- **HTTP Client:** Axios apuntando a `VITE_API_URL` (ej. `http://localhost:8080/v1` en dev / `https://api.klaroconta.app/v1` en prod), inyectando `Authorization: Bearer <accessToken>` (token **PASETO v2** emitido por `api-haber`) e interceptor de renovación automática vía `POST /tokens/renew_access` ante `401`.
- **UI/UX:** Tailwind CSS v4 + Shadcn/ui + Lucide React + Sonner (Toasts).
- **Formularios:** React Hook Form + Zod.
- **CORS Backend:** Asegurar que el origen de `frontend-iglesia` (ej. `http://localhost:5174` en desarrollo y `https://iglesia.klaroconta.app` en producción) esté incluido en `ALLOWED_ORIGINS` de `api-haber/app.env`.
- **Calidad React 19:** Evitar `setState` síncrono dentro de `useEffect` (usar `key` en modales o estado derivado para cumplir con `react-hooks/set-state-in-effect`).

---

## 3. Reglas de Diseño Visual (Mobile-First Dark Glassmorphism)
- **Mobile-First Estricto:** Diseñada principalmente para pantallas de celular (`max-w-md mx-auto` en desktop para experiencia tipo app móvil centrada con barra de navegación inferior fija, o layout responsivo limpio).
- **Estética Dark Glassmorphism:** Fondo azul medianoche profundo (`#090d16` / `slate-950`), tarjetas translúcidas (`bg-slate-900/60 backdrop-blur-md border border-white/10`), acentos luminosos por módulo:
  - **Azul/Índigo:** Asistencia y Eventos.
  - **Ámbar/Dorado:** Check-in/Check-out de Niños y Códigos de Seguridad.
  - **Esmeralda/Turquesa:** Ofrendas, Diezmos, Re-envío y Estatus KlaroConta.
  - **Rosa/Violeta:** Directorio de Personas, Consolidación, Nuevos Creyentes y Bautismos.
- **Cero Fricción:** Botones grandes táctiles (mínimo `44px` de alto), check-in en 1 toque, buscadores instantáneos por nombre o teléfono, feedback inmediato con Sonner y badges de estado offline/pendiente de sincronización.

---

## 4. Seguridad, Autenticación Dual y Aislamiento de Ministerios

### 4.1 Dos Flujos de Inicio de Sesión
1. **Acceso Rápido de Voluntarios (Código de Ministerio):**
   - `POST /church/auth/login-code` con `{ access_code, volunteer_name, branch_id? }`.
   - Emite token PASETO con rol `CHURCH_MINISTRY`, `ministry_role = "VOLUNTEER"`, `ministry_id`, `company_id` y `branch_id` (si fue seleccionado).
2. **Acceso de Líderes / Usuarios Registrados (Correo y Contraseña):**
   - `POST /church/auth/login` con `{ email, password }` contra `church.ministry_users`.
   - Emite token PASETO con rol `CHURCH_MINISTRY`, `ministry_role = "LEADER" | "VOLUNTEER"`, `ministry_user_id`, `ministry_id`, `company_id` y `branch_id` (si está asignado a una sede específica).
3. **Hidratación y Renovación de Sesión:**
   - Al abrir la app con sesión guardada, consultar `GET /church/context` para refrescar `ministry.features`, `branches` y validar que el ministerio/empresa sigan activos.
   - Ante `401 Unauthorized`, intentar `POST /tokens/renew_access` con `{ refresh_token }`; el backend preserva `MinistryID`, `BranchID`, `MinistryUserID`, `MinistryRole` y `VolunteerName`. Si falla, cerrar sesión y redirigir a `/login`.

### 4.2 Aislamiento Estricto y Validación Server-Side
1. **Visibilidad por `ministry.features`:** La UI solo debe renderizar las tarjetas, tabs y rutas habilitadas en `ministry.features`:
   - `attendance`: Crear/cerrar eventos y registrar asistencia.
   - `kids_checkin`: Registrar `security_code` en check-in y ejecutar check-out de retiro de niños.
   - `baptisms`: Marcar/actualizar estado y fecha de bautismo en el directorio.
   - `offerings`: Reportar nuevas ofrendas, ver estatus y editar/reenviar ofrendas rechazadas.
   *(El backend valida estos mismos flags en servidor y devuelve `403 PermissionDenied` si no están activos.)*
2. **Sin cambio de ministerio:** `company_id` y `ministry_id` siempre son forzados por el backend desde el token PASETO. El frontend nunca permite cambiar de ministerio sin cerrar sesión.
3. **Bloqueo de sede (`assigned_branch_id`):** Si `assigned_branch_id` no está vacío, el usuario solo puede operar en esa sede (fijarla en todos los formularios/filtros). Si está vacío, puede elegir entre las sedes activas de `branches`.
4. **Permisos `LEADER` vs `VOLUNTEER`:** Solo `ministry_role === "LEADER"` puede eliminar personas del directorio (`DELETE /church/people/{id}`).
5. **No Contabilidad Directa:** Esta app **NUNCA** llama a endpoints contables de KlaroConta (y el backend bloquea tokens `CHURCH_MINISTRY` en ellos). Solo reporta a `church.pending_offerings`, consulta su estatus (`PENDING_REVIEW`, `APPROVED`, `REJECTED` + `rejection_reason`) y permite **editar y reenviar** ofrendas en estado `REJECTED`.

---

## 5. Contrato Exacto de API Backend (`api-haber`, prefijo `VITE_API_URL` = `/v1`)

> Nota: `gRPC-Gateway` serializa en `snake_case` (`UseProtoNames: true`). Las fechas tipo `DATE` usan formato `YYYY-MM-DD`; los `Timestamp` usan `RFC3339` (ISO 8601).

### 5.1 Autenticación y Contexto
| Método | Ruta | Payload / Query | Respuesta clave |
|---|---|---|---|
| `POST` | `/church/auth/login-code` | `{ access_code, volunteer_name, branch_id? }` | `ChurchLoginResponse` (`access_token`, `refresh_token`, `ministry`, `branches`, `assigned_branch_id`, `ministry_role`, `volunteer_name`) |
| `POST` | `/church/auth/login` | `{ email, password }` | `ChurchLoginResponse` |
| `GET` | `/church/context` | — | `{ company_id, company_name, ministry, volunteer_name, ministry_role, assigned_branch_id, branches }` |
| `POST` | `/tokens/renew_access` | `{ refresh_token }` | `{ access_token, access_token_expired_at }` |

### 5.2 Directorio de Personas y Bautismos
| Método | Ruta | Payload / Query | Reglas clave |
|---|---|---|---|
| `GET` | `/church/people` | `?search=&branch_id=&person_type=&is_baptized=&limit=50&offset=0` | `person_type`: `VISITOR \| MEMBER \| CHILD \| NEW_BELIEVER` |
| `POST` | `/church/people` | `{ id?, branch_id?, full_name, phone?, birth_date?, person_type, metadata_json?, is_baptized?, baptism_date? }` | `id` UUID opcional (Offline-First). `metadata_json` es string JSON (ej. `{"guardian":"...","allergies":"...","notes":"..."}`). Marcar `is_baptized: true` requiere `features.baptisms`. |
| `PUT` | `/church/people/{id}` | `{ branch_id?, full_name?, phone?, birth_date?, person_type?, metadata_json? }` | Actualización parcial de datos del directorio. |
| `PATCH` | `/church/people/{id}/baptism` | `{ is_baptized, baptism_date? }` | Requiere `features.baptisms = true`. `baptism_date` en `YYYY-MM-DD`. |
| `DELETE` | `/church/people/{id}` | — | Solo `ministry_role === "LEADER"`. |

### 5.3 Eventos y Asistencia (Check-in / Check-out de Niños)
| Método | Ruta | Payload / Query | Reglas clave |
|---|---|---|---|
| `GET` | `/church/events` | `?branch_id=&status=&limit=50&offset=0` | `status`: `OPEN \| CLOSED`. Filtrado automáticamente al ministerio del token. |
| `POST` | `/church/events` | `{ id?, branch_id?, title, description?, event_date }` | Requiere `features.attendance = true`. `id` UUID opcional. `event_date` en ISO 8601. |
| `PATCH` | `/church/events/{id}/status` | `{ status: "OPEN" \| "CLOSED" }` | Requiere `features.attendance = true`. |
| `GET` | `/church/events/{event_id}/attendance` | — | Lista asistentes con `person_name`, `person_type`, `check_in_at`, `check_out_at`, `security_code`, `registered_by_name`. |
| `POST` | `/church/events/{event_id}/attendance/check-in` | `{ id?, person_id, check_in_at?, security_code? }` | Requiere `features.attendance = true` y evento `OPEN`. Enviar `security_code` requiere `features.kids_checkin = true` (máx. 10 chars, único por evento). `registered_by_name` lo asigna el backend desde el token. |
| `POST` | `/church/attendance/{id}/check-out` | `{ check_out_at? }` | Requiere `features.kids_checkin = true`. Falla con `412` si ya se hizo check-out. |
| `DELETE` | `/church/attendance/{id}` | — | Requiere `features.attendance = true`, evento `OPEN` y sin `check_out_at`. Permite desmarcar asistencia en 1 toque. |

### 5.4 Ofrendas Pendientes (Contexto Venezuela + Flujo de Rechazo/Re-envío)
| Método | Ruta | Payload / Query | Reglas clave |
|---|---|---|---|
| `POST` | `/church/offerings` | `{ id?, branch_id?, event_id?, offering_type, donor_name?, currency, payment_method, reference_number?, amount, offering_date, notes? }` | Requiere `features.offerings = true`. `id` UUID opcional. `currency`: `VES \| USD`. `offering_type`: `OFRENDA_GENERAL \| DIEZMO \| PRIMICIA \| OFRENDA_ESPECIAL`. `payment_method`: `EFECTIVO \| PAGO_MOVIL \| TRANSFERENCIA \| ZELLE`. `reference_number` hasta 100 chars. `amount > 0`. `offering_date`: `YYYY-MM-DD`. |
| `GET` | `/church/offerings/mine` | `?review_status=&limit=50&offset=0` | Retorna solo ofrendas del ministerio actual con `review_status` (`PENDING_REVIEW \| APPROVED \| REJECTED`) y `rejection_reason`. |
| `PUT` | `/church/offerings/{id}/resubmit` | `{ branch_id?, event_id?, offering_type, donor_name?, currency, payment_method, reference_number?, amount, offering_date, notes? }` | Requiere `features.offerings = true`. Solo válido cuando `review_status === "REJECTED"`: actualiza datos y regresa a `PENDING_REVIEW` limpiando `rejection_reason`. |

---

## 6. Reglas de Soporte Offline-First y Manejo de Errores
1. **UUIDs Generados en Cliente:** Al crear una persona, evento, check-in u ofrenda sin conexión, generar `id = crypto.randomUUID()` en la app para poder encadenar relaciones locales (ej. crear niño + check-in en el mismo culto offline) y sincronizar en orden estricto: `people` → `events` → `attendance` → `offerings`.
2. **Idempotencia ante Reintentos (`409 Conflict`):** Si un reintento de sincronización recibe HTTP `409` (`AlreadyExists`) porque el UUID o el par `(event_id, person_id)` ya llegó al servidor en un intento anterior, marcar la operación como sincronizada y limpiar de la cola local.
3. **Códigos HTTP Estándar del Backend:**
   - `400 Bad Request` (`INVALID_ARGUMENT`): validar campos del formulario y mostrar `message`.
   - `401 Unauthorized`: intentar `renew_access`; si falla, cerrar sesión.
   - `403 Forbidden` (`PERMISSION_DENIED`): suscripción suspendida, módulo deshabilitado, ministerio inactivo o `feature` no permitido; mostrar aviso claro y refrescar `/church/context`.
   - `409 Conflict` (`ALREADY_EXISTS`): duplicado (persona ya marcada en evento o `security_code` repetido).
   - `412 Precondition Failed` (`FAILED_PRECONDITION`): evento cerrado, check-out ya registrado o intento de reenviar una ofrenda que no está en estado `REJECTED`.

---

## 7. Estructura de Carpetas Sugerida (`frontend-iglesia/`)
```text
src/
├── app/routes/           # TanStack Router (login, _app/index, _app/people, _app/events, _app/attendance, _app/offerings)
├── components/
│   ├── layout/           # AppShell Mobile-First, BottomNav dinámico por features, OfflineBanner
│   └── ui/               # Componentes Shadcn/ui (dark glassmorphism)
├── features/
│   ├── auth/             # Login dual (Código rápido / Email líder), auth-store.ts, context hydration
│   ├── people/           # Directorio, filtros, niños (metadata_json), bautismos
│   ├── events/           # Cultos/reuniones (OPEN/CLOSED)
│   ├── attendance/       # Check-in 1 clic + check-in/check-out niños con security_code
│   └── offerings/        # Registro VES/USD, listado por estatus y edición/re-envío de rechazadas
├── lib/
│   ├── axios.ts          # Instancia Axios + Bearer PASETO + auto-refresh token
│   ├── offline-queue.ts  # Cola de sincronización ordenada (people -> events -> attendance -> offerings)
│   └── utils.ts
└── main.tsx
```
