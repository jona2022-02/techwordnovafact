# Configuración de Gmail para envío de correos

## ⚠️ IMPORTANTE: Configura estas variables antes de usar la aplicación

Para que la aplicación pueda enviar correos de verificación, necesitas configurar tu cuenta de Gmail con las siguientes variables en el archivo `.env.local`:

```env
SMTP_EMAIL=tu-correo@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion
```

## Pasos para configurar Gmail SMTP:

### 1. Habilitar verificación en 2 pasos
- Ve a tu [Cuenta de Google](https://myaccount.google.com)
- En el panel izquierdo, selecciona "Seguridad"
- Busca "Verificación en 2 pasos" y habilítala

### 2. Crear contraseña de aplicación
- Una vez habilitada la verificación en 2 pasos, ve a [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- Selecciona "Correo" como aplicación
- Selecciona "Otro (nombre personalizado)" como dispositivo
- Escribe "NovaFact App" como nombre
- Copia la contraseña de 16 caracteres que te genera Google

### 3. Actualizar archivo .env.local
Reemplaza las líneas vacías en `.env.local`:

```env
SMTP_EMAIL=tu-correo@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
```

**Nota importante:** Usa la contraseña de aplicación (16 caracteres con espacios), NO tu contraseña normal de Gmail.

### 4. Reiniciar el servidor
Después de actualizar las variables, reinicia el servidor de desarrollo:

```bash
npm run dev
```

## ✅ Verificación
Una vez configurado, cuando un usuario se registre:
1. Se creará su cuenta en Firebase
2. Se enviará automáticamente un código de 6 dígitos a su correo
3. El usuario podrá ingresar el código en `/verify-email/code`

## 🚨 Solución de problemas

### Error: "Invalid login"
- Verifica que hayas habilitado la verificación en 2 pasos
- Asegúrate de usar la contraseña de aplicación, no tu contraseña normal

### Error: "Less secure app access"
- Gmail ya no permite "aplicaciones menos seguras"
- DEBES usar contraseñas de aplicación

### Error: "Auth failed"
- Verifica que el email en SMTP_EMAIL sea exactamente tu dirección de Gmail
- Verifica que la contraseña de aplicación esté correcta (sin modificar espacios)

### El correo no llega
- Revisa la carpeta de spam/correo no deseado
- Verifica que las variables de entorno estén configuradas correctamente
- Revisa los logs del servidor para ver si hay errores

## Alternativas a Gmail
Si prefieres usar otro servicio de correo:

### SendGrid (recomendado para producción)
- Más confiable para volúmenes altos
- Mejores tasas de entrega
- Requiere API key en lugar de SMTP

### Otros proveedores SMTP
- Outlook/Hotmail: smtp-mail.outlook.com:587
- Yahoo: smtp.mail.yahoo.com:587
- Modificar la configuración en `lib/emailService.ts`

## 📧 Contacto
Si tienes problemas con la configuración, revisa:
1. Las variables de entorno en `.env.local`
2. Los logs del servidor cuando intentas crear una cuenta
3. La configuración de seguridad de tu cuenta Google