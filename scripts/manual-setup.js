// scripts/manual-setup.js
// SCRIPT PARA CREAR MANUALMENTE LAS COLECCIONES EN FIREBASE CONSOLE

console.log(`
🔥 CREAR COLECCIONES MANUALMENTE EN FIREBASE CONSOLE
==================================================

Si la inicialización automática no funciona, puedes crear las colecciones manualmente:

1. Ve a Firebase Console: https://console.firebase.google.com
2. Selecciona tu proyecto
3. Ve a Firestore Database
4. Click en "Start Collection"

📋 COLECCIÓN 1: membershipSettings
Document ID: default
Campos:
{
  "monthlyPrice": 15,
  "currency": "USD", 
  "description": "Acceso completo a todas las funciones de NovaFact",
  "features": [
    "Verificación ilimitada de DTEs",
    "Reportes avanzados",
    "Soporte prioritario"
  ],
  "isActive": true,
  "createdAt": [timestamp - usar "timestamp" como tipo],
  "updatedAt": [timestamp - usar "timestamp" como tipo]
}

📋 COLECCIÓN 2: userMemberships  
Document ID: [deja que se genere automáticamente]
Campos: (crea un documento de ejemplo)
{
  "userId": "ejemplo-user-id",
  "status": "active",
  "startDate": [timestamp],
  "endDate": [timestamp - fecha futura],
  "autoRenew": false,
  "createdAt": [timestamp],
  "updatedAt": [timestamp],
  "suspendedAt": null,
  "suspensionReason": null
}

📋 COLECCIÓN 3: paymentRecords
Document ID: [deja que se genere automáticamente]  
Campos: (crea un documento de ejemplo)
{
  "membershipId": "id-de-membership-ejemplo",
  "userId": "ejemplo-user-id",
  "amount": 15,
  "currency": "USD",
  "status": "completed", 
  "paymentDate": [timestamp],
  "paymentMethod": "manual",
  "transactionId": null,
  "notes": "Activación inicial",
  "createdAt": [timestamp]
}

🎯 DESPUÉS DE CREAR LAS COLECCIONES:
- Verifica que las reglas estén desplegadas: npm run deploy-rules
- Prueba activar una membresía en tu app
- Si sigue dando error, verifica que tu usuario sea admin en la colección 'users'
`);