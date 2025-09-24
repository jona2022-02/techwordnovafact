// temp-admin-setup.js - Script temporal para dar permisos de admin
const admin = require('firebase-admin');

// Configurar Firebase Admin
const serviceAccount = {
  "type": "service_account",
  "project_id": "novafact-6c281",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "novafact-6c281",
  });
}

const db = admin.firestore();

async function setupAdmin() {
  try {
    console.log('🔧 Configurando permisos de administrador...');
    
    // Reemplaza este email con el tuyo
    const adminEmail = 'jonathan@resapldo.com'; // CAMBIA ESTE EMAIL
    
    // Buscar usuario por email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', adminEmail).get();
    
    if (snapshot.empty) {
      console.log('❌ Usuario no encontrado:', adminEmail);
      return;
    }
    
    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log('👤 Usuario encontrado:', {
      uid: userId,
      email: userData.email,
      role: userData.role
    });
    
    // Actualizar rol a admin
    await userDoc.ref.update({
      role: 'admin',
      permissions: ['admin_access', 'user_management', 'reports_access'],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Usuario actualizado a administrador:', userId);
    console.log('🎉 ¡Configuración completada! El usuario ahora es administrador.');
    
  } catch (error) {
    console.error('❌ Error configurando admin:', error);
  }
}

setupAdmin().then(() => {
  console.log('Script completado');
  process.exit(0);
});