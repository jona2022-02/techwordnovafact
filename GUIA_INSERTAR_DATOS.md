# Guía para Insertar Usuarios y Membresías

## 📋 Resumen

Esta documentación explica cómo insertar usuarios y membresías en tu sistema de verificación DTE. Ahora tienes múltiples formas de hacerlo:

1. **Interfaz Web de Administración** (Recomendado)
2. **API Endpoints** (Para integraciones)
3. **Pruebas de Base de Datos**

## 🖥️ 1. Interfaz Web de Administración

### Acceso
Navega a: **`/admin/data-management`**

### Características
- ✅ Formularios intuitivos para crear usuarios y membresías
- ✅ Lista de usuarios existentes en tiempo real
- ✅ Validaciones automáticas de datos
- ✅ Feedback visual de operaciones
- ✅ Pruebas de conectividad de base de datos

### Crear Usuario
1. Ve a la pestaña "👥 Usuarios"
2. Completa el formulario:
   - **Email**: Dirección de correo válida
   - **Nombre Completo**: Nombre y apellidos
   - **Rol**: Cliente o Administrador
3. Haz clic en "Crear Usuario"

### Crear Membresía
1. Ve a la pestaña "💎 Membresías" 
2. Selecciona un usuario existente
3. Configura el plan y período
4. Haz clic en "Crear Membresía"

## 🔌 2. API Endpoints

### Crear Usuario - `POST /api/create-user`

```bash
# Ejemplo con cURL
curl -X POST https://tu-dominio.com/api/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@empresa.com",
    "displayName": "Juan Pérez",
    "role": "client"
  }'
```

**Parámetros:**
- `email` (requerido): Email del usuario
- `displayName` (requerido): Nombre completo  
- `role` (opcional): "client" o "admin" (por defecto: "client")

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "user": {
    "uid": "abc123...",
    "email": "juan.perez@empresa.com",
    "displayName": "Juan Pérez",
    "role": "client",
    "permissions": ["home", "mi-membresia"],
    "isActive": true
  }
}
```

### Crear Membresía - `POST /api/create-membership`

```bash
# Ejemplo con duración en meses
curl -X POST https://tu-dominio.com/api/create-membership \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "abc123...",
    "planId": "premium",
    "durationMonths": 6,
    "startDate": "2025-01-01"
  }'

# Ejemplo con fecha de fin personalizada
curl -X POST https://tu-dominio.com/api/create-membership \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "abc123...",
    "planId": "basic",
    "startDate": "2025-01-01",
    "customEndDate": "2025-12-31"
  }'
```

**Parámetros:**
- `userId` (requerido): ID del usuario
- `planId` (opcional): "basic", "premium", "enterprise" (por defecto: "basic")
- `startDate` (opcional): Fecha de inicio (por defecto: hoy)
- `durationMonths` (opcional): Duración en meses (por defecto: 1)
- `customEndDate` (opcional): Fecha de fin personalizada

### Consultar Datos - `GET /api/create-user` y `GET /api/create-membership`

```bash
# Obtener todos los usuarios
curl https://tu-dominio.com/api/create-user

# Obtener membresía de un usuario específico
curl https://tu-dominio.com/api/create-membership?userId=abc123...

# Obtener configuración de membresías
curl https://tu-dominio.com/api/create-membership
```

## 🧪 3. Pruebas de Base de Datos

### Endpoints de Diagnóstico

1. **`/api/health`** - Verificación básica
2. **`/api/production-diagnosis`** - Diagnóstico completo
3. **`/api/test-operations`** - Prueba operaciones completas
4. **`/api/test-database`** - Prueba conexión y operaciones

### Verificar que Todo Funciona

```bash
# 1. Probar conectividad básica
curl https://tu-dominio.com/api/health

# 2. Diagnóstico completo del sistema
curl https://tu-dominio.com/api/production-diagnosis

# 3. Probar operaciones de base de datos
curl https://tu-dominio.com/api/test-operations
```

## 📝 4. Ejemplos Completos

### Escenario: Crear Usuario y Asignar Membresía

```javascript
// 1. Crear usuario
const userResponse = await fetch('/api/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'maria.gonzalez@empresa.com',
    displayName: 'María González',
    role: 'client'
  })
});

const userResult = await userResponse.json();
console.log('Usuario creado:', userResult.user.uid);

// 2. Crear membresía premium por 12 meses
const membershipResponse = await fetch('/api/create-membership', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: userResult.user.uid,
    planId: 'premium',
    durationMonths: 12,
    startDate: '2025-01-01'
  })
});

const membershipResult = await membershipResponse.json();
console.log('Membresía creada:', membershipResult.membership);
```

### Escenario: Verificar Estado de Membresía

```javascript
// Consultar membresía de un usuario
const response = await fetch(`/api/create-membership?userId=${userId}`);
const result = await response.json();

if (result.membership) {
  console.log('Membresía encontrada:', {
    plan: result.membership.planId,
    status: result.membership.status,
    startDate: result.membership.startDate,
    endDate: result.membership.endDate,
    isActive: result.status.hasActiveMembership,
    daysRemaining: result.status.daysUntilExpiration
  });
} else {
  console.log('Usuario sin membresía activa');
}
```

## 🔧 5. Estructura de Datos

### Usuario (UserProfile)
```typescript
{
  uid: string;           // ID único del usuario
  email: string;         // Email de login
  displayName: string;   // Nombre completo
  role: 'admin' | 'client'; // Rol del usuario
  permissions: string[]; // Permisos específicos
  isActive: boolean;     // Estado activo/inactivo
  createdAt: string;     // Fecha de creación
  lastLogin: string;     // Último login
}
```

### Membresía (UserMembership)
```typescript
{
  id: string;                    // ID único de la membresía
  userId: string;                // ID del usuario propietario
  planId: string;                // Plan: "basic", "premium", "enterprise"
  status: MembershipStatus;      // "active", "expired", "suspended", etc.
  startDate: Date;               // Fecha de inicio
  endDate: Date;                 // Fecha de vencimiento
  isActive: boolean;             // Estado activo/inactivo
  createdAt: Date;               // Fecha de creación
  updatedAt: Date;               // Última actualización
}
```

## ⚡ 6. Validaciones y Errores

### Errores Comunes

1. **Email duplicado**: `"El email ya está registrado"`
2. **Usuario no encontrado**: `"Usuario no encontrado"`
3. **Fechas inválidas**: `"La fecha de fin debe ser posterior a la fecha de inicio"`
4. **Datos faltantes**: `"Email y displayName son requeridos"`

### Validaciones Automáticas

- ✅ Formato de email válido
- ✅ Roles permitidos (admin/client)
- ✅ Fechas de membresía coherentes
- ✅ Usuario existente antes de crear membresía
- ✅ Permisos por defecto según rol

## 🎯 7. Recomendaciones

1. **Usa la interfaz web** para operaciones manuales ocasionales
2. **Usa los APIs** para integraciones automáticas o scripts
3. **Siempre verifica** el estado con los endpoints de diagnóstico
4. **Mantén respaldos** de los datos importantes
5. **Monitorea logs** para detectar errores temprano

## 🔗 Enlaces Útiles

- **Interfaz de Administración**: `/admin/data-management`
- **Diagnóstico del Sistema**: `/api/production-diagnosis`
- **Documentación de APIs**: Este archivo
- **Logs de Aplicación**: Consola del navegador o logs de Vercel

---

**¡Tu sistema ya está listo para insertar usuarios y membresías en producción!** 🎉