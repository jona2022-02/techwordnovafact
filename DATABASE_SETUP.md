# 🎯 GUÍA COMPLETA: Configuración de Base de Datos para Sistema de Membresías

## ❌ PROBLEMA ACTUAL
Estás recibiendo el error "Missing or insufficient permissions" porque:
1. Las colecciones de membresía no existen en Firestore
2. Las reglas de seguridad no están configuradas
3. Firebase no permite crear las colecciones automáticamente

## ✅ SOLUCIÓN PASO A PASO

### 🔧 PASO 1: Configurar Firebase CLI

```bash
# Si no tienes Firebase CLI instalado (ya lo instalamos):
npm install -g firebase-tools

# Iniciar sesión en Firebase:
firebase login

# Verificar que tu proyecto está conectado:
firebase projects:list
```

### 🔥 PASO 2: Configurar tu Proyecto Firebase

```bash
# En la carpeta del proyecto:
cd "C:\Users\Jonathan\Desktop\resapldo\verificador-dte"

# Inicializar Firebase (si no está inicializado):
firebase init

# Selecciona:
# - Firestore: Configure security rules and indexes files
# - Usa archivos existentes: firestore.rules y firestore.indexes.json
```

### 📋 PASO 3: Desplegar Reglas de Seguridad

```bash
# Desplegar las reglas de Firestore:
npm run deploy-rules

# O manualmente:
firebase deploy --only firestore:rules
```

### 📊 PASO 4: Desplegar Índices (Opcional)

```bash
# Desplegar índices para mejor rendimiento:
npm run deploy-indexes

# O manualmente:
firebase deploy --only firestore:indexes
```

### 🚀 PASO 5: Crear Colecciones Iniciales

1. **Inicia tu aplicación:**
   ```bash
   npm run dev
   ```

2. **Ve a la página de inicialización:**
   - Abre: http://localhost:3000/admin/firebase-init
   - Haz clic en "Inicializar Colecciones de Firebase"

3. **O hazlo manualmente en Firebase Console:**
   - Ve a: https://console.firebase.google.com/project/TU_PROJECT_ID/firestore
   - Crea las colecciones manualmente (ver estructura abajo)

## 📁 ESTRUCTURA DE COLECCIONES QUE SE CREARÁN

### 1. `membershipSettings`
```javascript
{
  id: "default",
  monthlyPrice: 15,
  currency: "USD",
  description: "Acceso completo a todas las funciones",
  features: [
    "Verificación ilimitada de DTEs",
    "Reportes avanzados", 
    "Soporte prioritario"
  ],
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `userMemberships`
```javascript
{
  id: "auto-generated",
  userId: "user-uid",
  status: "active", // active, expired, suspended, cancelled
  startDate: timestamp,
  endDate: timestamp,
  autoRenew: false,
  createdAt: timestamp,
  updatedAt: timestamp,
  suspendedAt: null,
  suspensionReason: null
}
```

### 3. `paymentRecords`
```javascript
{
  id: "auto-generated",
  membershipId: "membership-id",
  userId: "user-uid",
  amount: 15,
  currency: "USD",
  status: "completed", // completed, pending, failed, refunded
  paymentDate: timestamp,
  paymentMethod: "manual",
  createdAt: timestamp
}
```

## 🔒 REGLAS DE SEGURIDAD CONFIGURADAS

Las reglas permiten:
- ✅ **Admins**: Acceso total a todas las colecciones
- ✅ **Usuarios autenticados**: Leer configuración de membresía
- ✅ **Usuarios**: Ver solo sus propias membresías
- ❌ **No autenticados**: Sin acceso

## 🎯 VERIFICAR QUE TODO FUNCIONA

1. **Verifica en Firebase Console:**
   - Ve a Firestore Database
   - Deberías ver las 3 colecciones creadas

2. **Prueba en tu aplicación:**
   - Ve a "Gestión de Usuarios" → Click en 👑 (Crown)
   - Activa una membresía para un usuario
   - Ve a "Gestión de Membresías" → Verifica que aparece

3. **Si sigue dando error:**
   - Revisa que tu usuario tenga rol "admin" en la colección `users`
   - Verifica que las reglas se desplegaron correctamente
   - Checa la consola del navegador para más detalles

## 🚨 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "permission-denied"
```bash
# Redespliega las reglas:
firebase deploy --only firestore:rules
```

### Error: "Collection doesn't exist"
- Ve a Firebase Console y crea las colecciones manualmente
- O usa la página de inicialización: /admin/firebase-init

### Error: "User is not admin"
- Verifica que tu usuario tenga `role: "admin"` en la colección `users`

## 📞 SI NECESITAS AYUDA
1. Ejecuta: `firebase projects:list` (copia el output)
2. Ve a Firebase Console → Firestore → Rules (copia las reglas actuales)
3. Manda screenshot del error específico

---

**📋 ARCHIVOS CREADOS:**
- ✅ `firestore.rules` - Reglas de seguridad
- ✅ `firestore.indexes.json` - Índices de rendimiento  
- ✅ `firebase.json` - Configuración de Firebase
- ✅ `scripts/setup-database.js` - Script de configuración
- ✅ Scripts en package.json para deploy fácil