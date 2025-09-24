# 🚀 RESUMEN: Solución para Error de Permisos en Membresías

## ❌ PROBLEMA
**Error**: "Missing or insufficient permissions" al activar membresía

## ✅ CAUSA
Las colecciones de membresía no existen en Firestore y las reglas de seguridad no están configuradas.

## 🔧 SOLUCIÓN RÁPIDA

### Opción 1: Configuración Automática (Recomendada)
```bash
# 1. Iniciar sesión en Firebase
firebase login

# 2. Desplegar reglas de seguridad
npm run deploy-rules

# 3. Crear colecciones
# Ve a: http://localhost:3000/admin/firebase-init
# Click: "Inicializar Colecciones de Firebase"
```

### Opción 2: Creación Manual
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto → Firestore Database
3. Crea estas 3 colecciones con los datos del archivo `scripts/manual-setup.js`

## 📁 ARCHIVOS CREADOS
- ✅ `firestore.rules` - Reglas de seguridad para Firestore
- ✅ `firebase.json` - Configuración de Firebase
- ✅ `DATABASE_SETUP.md` - Guía completa paso a paso
- ✅ `scripts/setup-database.js` - Script automático
- ✅ `scripts/manual-setup.js` - Instrucciones manuales

## 🎯 DESPUÉS DE LA CONFIGURACIÓN
Una vez configurado correctamente, podrás:
- ✅ Activar membresías desde "Gestión de Usuarios" (botón 👑)
- ✅ Ver membresías organizadas por estado en "Gestión de Membresías"
- ✅ Suspender y reactivar membresías
- ✅ Configurar precios ($15/mes por defecto)

## 📞 SI PERSISTE EL ERROR
1. Verifica que tu usuario tenga `role: "admin"` en la colección `users`
2. Confirma que las reglas se desplegaron: `firebase deploy --only firestore:rules`
3. Checa que las 3 colecciones existan en Firebase Console