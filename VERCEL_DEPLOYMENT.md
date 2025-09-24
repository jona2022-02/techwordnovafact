# Guía de Deployment en Vercel - Verificador DTEs V2

## 🚀 Pasos para Desplegar en Vercel

### 1. Variables de Entorno Requeridas
Configura estas variables en el dashboard de Vercel:

#### 🔥 Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

#### 🔐 Firebase Admin (Server-side)
```
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_PROJECT_ID=
```

#### 📧 Email Configuration (Nodemailer)
```
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

#### 🔑 Authentication
```
NEXTAUTH_SECRET=
NEXTAUTH_URL=https://tu-dominio.vercel.app
```

### 2. Configuración de Build
- ✅ Framework: **Next.js**
- ✅ Node.js Version: **18.x** o superior
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `.next`

### 3. Configuraciones Especiales

#### Firebase Admin Private Key
Para `FIREBASE_ADMIN_PRIVATE_KEY`, reemplaza `\n` con saltos de línea reales:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
```

#### NextAuth Secret
Genera un secreto seguro:
```bash
openssl rand -base64 32
```

### 4. Dominios y CORS
Actualiza estos dominios en:
- Firebase Authentication (Authorized domains)
- Firebase Security Rules
- NextAuth configuration

### 5. Funciones Serverless
- ✅ **Timeout**: 30 segundos (configurado en vercel.json)
- ✅ **Región**: US East (iad1) para mejor performance
- ✅ **Runtime**: Node.js 18.x

### 6. Base de Datos
- ✅ Firestore ya está configurado
- ✅ Índices definidos en `firestore.indexes.json`
- ✅ Reglas de seguridad en `firestore.rules`

## 🔧 Troubleshooting Común

### Error: Firebase Admin SDK
```bash
# Asegúrate de que FIREBASE_ADMIN_PRIVATE_KEY esté bien formateado
# Sin espacios extra, con saltos de línea correctos
```

### Error: NextAuth
```bash
# Verifica que NEXTAUTH_URL apunte a tu dominio de Vercel
# Ejemplo: https://verificador-dtes-v2.vercel.app
```

### Error: Build Timeout
```bash
# El proyecto está optimizado para builds rápidos
# Si hay problemas, contacta soporte de Vercel
```

## 📊 Performance Esperado
- ⚡ **Cold Start**: ~2-3 segundos
- 🚀 **Warm Response**: ~200-500ms
- 💾 **Bundle Size**: Optimizado con Tree Shaking
- 🔄 **ISR**: Habilitado para páginas estáticas

## 🎯 URLs de Producción
Después del deploy tendrás:
- **App**: `https://tu-proyecto.vercel.app`
- **Admin**: `https://tu-proyecto.vercel.app/admin`
- **Verificadores**: `https://tu-proyecto.vercel.app/verificadorDTE/*`