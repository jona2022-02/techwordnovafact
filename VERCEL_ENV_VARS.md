# 📋 Variables de Entorno para Vercel

Copia estas variables en el dashboard de Vercel (Settings → Environment Variables):

## 🔥 Firebase Client (Public Variables)
```
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_auth_domain_aqui
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_project_id_aqui
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_storage_bucket_aqui
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id_aqui
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id_aqui
```

## 🔐 Firebase Admin (Server-side - ¡CONFIDENCIALES!)
```
FIREBASE_PROJECT_ID=tu_project_id_aqui
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\ntu_private_key_completa_aqui\n-----END PRIVATE KEY-----
FIREBASE_CLIENT_EMAIL=tu_client_email_aqui
```

## ⚠️ IMPORTANTE para FIREBASE_PRIVATE_KEY:
1. Copia la clave privada COMPLETA desde Firebase Console
2. Incluye `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
3. Reemplaza todos los `\n` con saltos de línea reales
4. O déjala en una sola línea con `\n` literales

## 🚀 Opcional (si usas email):
```
GMAIL_USER=tu_email@gmail.com
GMAIL_APP_PASSWORD=tu_app_password_de_gmail
```

## 🔑 NextAuth (si planeas agregar más autenticación):
```
NEXTAUTH_SECRET=genera_un_secreto_aleatorio_de_32_caracteres
NEXTAUTH_URL=https://tu-dominio-vercel.vercel.app
```

---

## 📍 Dónde conseguir estos valores:

### Firebase Console:
1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto
3. Settings → General → SDK setup and configuration
4. Para Admin SDK: Settings → Service accounts → Generate new private key