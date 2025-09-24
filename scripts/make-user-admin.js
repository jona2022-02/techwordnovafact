// scripts/make-user-admin.js
// Script para asignar rol de admin a un usuario específico

const admin = require('firebase-admin');

// Usar las credenciales ya configuradas
const serviceAccount = require('../novafact-6c281-firebase-adminsdk-fbsvc-d85d7682a7.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'novafact-6c281'
});

const db = admin.firestore();

// CAMBIAR ESTE UID POR EL TUYO DESPUÉS DE REGISTRARTE
const USER_UID = 'TU_UID_AQUI'; 
const USER_EMAIL = 'tu_email@ejemplo.com';

async function makeAdmin() {
  try {
    console.log(`🔐 Asignando rol de admin a usuario ${USER_UID}...`);
    
    // Crear documento de usuario con rol admin
    await db.collection('users').doc(USER_UID).set({
      uid: USER_UID,
      email: USER_EMAIL,
      role: 'admin',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      isActive: true
    }, { merge: true });

    console.log('✅ Usuario configurado como administrador');
    console.log('🎉 Ya puedes acceder con permisos completos');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

makeAdmin().then(() => process.exit(0));