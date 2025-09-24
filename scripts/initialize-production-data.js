// scripts/initialize-production-data.js
// Script para inicializar datos básicos en producción

const admin = require('firebase-admin');

// Configurar Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "novafact-6c281",
  private_key_id: "d85d7682a7253cadea497cf4b30abeda643cf692",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIHiWcWYd2cePX\nVnh8aRmiPJv64EC5BenQh2ySCVTAGNTu4+PsdPI+MIZ3YGlyLM1j7JferesNYOLT\ncsxCEhDYc36YvJsR3yDh3+zXkdM/+Jkco3Z8wra5j1+Dnqon528loGTTyojVg++q\nHoFG8e4z2G9JH9TNfPvz6puw+R7Z8MwsMiq8dWC6VWl8lX/DmHM2jt+9/spw7Ers\nYoaAsYnBS0TRrTBD7VnwMPn+gFNztkAP6qVNMsdjD6Ucg6+Y0sS/dEJtX6zGDZnh\nU8L/LMwGmEtposel9Hvw9twNM7b3cg7FZKBo7HVDYiiPGFchVI6fs8Q6Rv/aZmFg\ntSwewX0rAgMBAAECggEAWIgpyHk9OjPZgf9Bz3xpuEILGZqTV6ebkMMQz6ysH039\nCfCs+YOlVcj+/BodnELg3MejSoLzvZfy0Wv0nHhElpXF2Il8KxRlBjicHaRoamEv\nT6GrfjdgQkiBD4gmq/+xxtomMSJlldxIL6FOPRYz9SDX3uhjq0MTbg4JMeqMcQrT\nhOQrJLs2CgDb+1FRGGnvk6eOu1cH2FdVVCUHSbFnf+AyBn82DQxEnenkzYI62Ndk\nRiocBMJtkFJqPk07uVZeNZIGtHwoQYVI6j/oH+MCDD/4J4b0hJ65gYl6chFeH0N7\n7ABsIcXaI2/RXx7tqNfK+zXtlFIqS7VkAbJyi5oFrQKBgQDxKgrhTdKgJjHcmos2\nkYVq6mvXSV5Fy9Xwz+ihc+g9IoblTUkyDWqGtU+7sFtKBbBhxo3TQQo9tMhtdjEg\nQDSLtwFA98nb2BlQFHnXi/WBzzum7WrAQ3k65zKbnbQBkmBgVgzOdi743k+hhwPz\nnJMdcGjTDp54P1fAaBNu6kQ89wKBgQDUba/kpeI1PMaP1/5xG4zC5E3sdBlu2Ibb\nWGmZsStHfx7FZThbXNC2szfI0eYvUjvyyK54ZKu5giFr/m2zqVrTiIUfHQIbzpvj\nIlYVCgT1Id28bBYWbNmCMG+SaKhYT/co/42k2piLNnK/1SuOF6Ppx2aExs8s+cm0\nC/XKPK64bQKBgFXE6hGvJ9WlP96BaDmED7synB/5C/ouwGvgxY+GNXZorSkoD3wp\noVU/bpgF5LGyzEQ55X7YhtfjT9T+UAJ0UzvNXjjI55W0iWwdnCe4sxvzo/d+QJUY\naik0yJ7nu3lDodshP3S+O35vMkr0RceCTCAQNne5n0qM3JylZyPvVU2JAoGAW5+P\nzTQLVGEJV8OW2FxEo07rmUAeNCQqTnNc4NB81VKsCAH3g9iNoS+9sN1vxhtXBgmu\nzvjE5LePCNBtqp8yMKjimh/d5/Z+YEJQFLUEnGJmDD4mbLe4PSH9DY4chjK/bSyE\ngIVUZD8w0TL1nUzvAwdhXYWOmFyItiKuefMgfSUCgYBdcYv2jlZRaewk79l1A8zY\nITxW2Y7hUB9yrhr45z+hKQxQ5tfAEMLLmasC3MtnQrjdrJVUPxj/kI9Telmpzd9Y\nduWl6eDD5Aipvq1eNEbuGk+wnyX1XYUgrva/etsekN/L2VdtEzVCtFoUpGPlrwln\nqmFBnnX/YIq/j1SjiO8FKg==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@novafact-6c281.iam.gserviceaccount.com",
  client_id: "107285529759041263707",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'novafact-6c281'
});

const db = admin.firestore();

async function initializeData() {
  console.log('🚀 Inicializando datos básicos en Firestore...');

  try {
    // 1. Crear configuraciones de membresía por defecto
    console.log('📋 Creando configuraciones de membresía...');
    await db.collection('membershipSettings').doc('default').set({
      plans: {
        basic: {
          name: 'Básico',
          price: 10,
          features: ['5 verificaciones por día', 'Soporte básico'],
          duration: 30
        },
        premium: {
          name: 'Premium',
          price: 25,
          features: ['50 verificaciones por día', 'Soporte prioritario', 'Reportes avanzados'],
          duration: 30
        }
      },
      isActive: true,
      updatedAt: admin.firestore.Timestamp.now()
    });

    // 2. Crear planes de marketing
    console.log('📈 Creando planes de marketing...');
    await db.collection('marketing_plans').doc('basic').set({
      id: 'basic',
      name: 'Plan Básico',
      description: 'Perfecto para pequeñas empresas',
      price: 10,
      duration: 30,
      features: [
        '5 verificaciones diarias',
        'Soporte por email',
        'Dashboard básico'
      ],
      isActive: true,
      order: 1,
      createdAt: admin.firestore.Timestamp.now()
    });

    await db.collection('marketing_plans').doc('premium').set({
      id: 'premium',
      name: 'Plan Premium',
      description: 'Ideal para empresas medianas',
      price: 25,
      duration: 30,
      features: [
        '50 verificaciones diarias',
        'Soporte prioritario',
        'Reportes avanzados',
        'API access'
      ],
      isActive: true,
      order: 2,
      createdAt: admin.firestore.Timestamp.now()
    });

    // 3. Crear roles básicos
    console.log('👤 Creando roles básicos...');
    await db.collection('roles').doc('admin').set({
      name: 'Administrador',
      permissions: ['all'],
      createdAt: admin.firestore.Timestamp.now()
    });

    await db.collection('roles').doc('user').set({
      name: 'Usuario',
      permissions: ['read_own_data', 'create_processes'],
      createdAt: admin.firestore.Timestamp.now()
    });

    // 4. Crear permisos básicos
    console.log('🔑 Creando permisos básicos...');
    const permissions = [
      { id: 'all', name: 'Acceso Total', description: 'Acceso completo al sistema' },
      { id: 'read_own_data', name: 'Leer Datos Propios', description: 'Ver sus propios datos' },
      { id: 'create_processes', name: 'Crear Procesos', description: 'Crear procesos DTE' },
      { id: 'manage_users', name: 'Gestionar Usuarios', description: 'Administrar usuarios' },
      { id: 'manage_memberships', name: 'Gestionar Membresías', description: 'Administrar membresías' }
    ];

    for (const perm of permissions) {
      await db.collection('permissions').doc(perm.id).set({
        ...perm,
        createdAt: admin.firestore.Timestamp.now()
      });
    }

    console.log('✅ Datos básicos inicializados correctamente');
    console.log('');
    console.log('📋 Datos creados:');
    console.log('- Configuraciones de membresía');
    console.log('- Planes de marketing (básico, premium)');
    console.log('- Roles (admin, user)');
    console.log('- Permisos básicos');
    console.log('');
    console.log('🔐 Para crear un usuario administrador, usa Firebase Auth Console');
    console.log('   Luego ejecuta el script de asignación de rol admin');

  } catch (error) {
    console.error('❌ Error inicializando datos:', error);
    process.exit(1);
  }
}

initializeData().then(() => {
  console.log('🎉 Inicialización completada');
  process.exit(0);
});