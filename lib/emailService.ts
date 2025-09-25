import nodemailer from 'nodemailer';

// Configuración del transporter de nodemailer para Gmail
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // o usar host: 'smtp.gmail.com'
    port: 587,
    secure: false, // true para puerto 465, false para otros puertos
    auth: {
      user: process.env.SMTP_EMAIL, // tu email de Gmail
      pass: process.env.SMTP_PASSWORD // contraseña de aplicación de Gmail
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions): Promise<boolean> {
  try {
    // Si no hay configuración de correo, usar modo desarrollo
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.log('=== MODO DESARROLLO: EMAIL NO CONFIGURADO ===');
      console.log('Para:', to);
      console.log('Asunto:', subject);
      console.log('Contenido:', text);
      console.log('');
      console.log('⚠️  Para enviar correos reales, configura SMTP_EMAIL y SMTP_PASSWORD en .env.local');
      console.log('📖 Ver instrucciones en EMAIL_SETUP.md');
      console.log('==========================================');
      return true; // Simular éxito en desarrollo
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: {
        name: 'NovaFact',
        address: process.env.SMTP_EMAIL || 'noreply@novafact.app'
      },
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return false;
  }
}

// -----------------------------------------------------
// Función para enviar correos de verificación
// -----------------------------------------------------
export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const subject = 'Código de verificación - NovaFact';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verificación de cuenta - NovaFact</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1e293b; margin: 0;">NovaFact</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Verifica y gestiona DTEs con seguridad</p>
            </div>
            
            <h2 style="color: #1e293b; margin-bottom: 20px;">Código de verificación</h2>
            
            <p style="color: #475569; line-height: 1.6;">
                Hola, hemos recibido una solicitud para verificar tu cuenta en NovaFact.
            </p>
            
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; text-align: center; margin: 25px 0;">
                <p style="color: #475569; margin: 0 0 10px 0; font-size: 14px;">Tu código de verificación es:</p>
                <div style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                    ${code}
                </div>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Este código expira en 1 minuto</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
                Ingresa este código en la aplicación para completar la verificación de tu cuenta.
            </p>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>Importante:</strong> Si no solicitaste este código, puedes ignorar este mensaje de forma segura.
                </p>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #64748b; margin: 0; font-size: 12px;">
                    © ${new Date().getFullYear()} NovaFact. Todos los derechos reservados.
                </p>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px;">
                    Este es un correo automático, no responder.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
NovaFact - Código de verificación

Tu código de verificación es: ${code}

Este código expira en 1 minuto.
Ingresa este código en la aplicación para completar la verificación de tu cuenta.

Si no solicitaste este código, puedes ignorar este mensaje de forma segura.

© ${new Date().getFullYear()} NovaFact. Todos los derechos reservados.
  `.trim();

  return await sendEmail({ to, subject, html, text });
}

// -----------------------------------------------------
// Función para enviar correos de restablecimiento de contraseña
// -----------------------------------------------------
export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const subject = 'Código para restablecer contraseña - NovaFact';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Restablecer contraseña - NovaFact</title>
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1e293b; margin: 0;">NovaFact</h1>
                <p style="color: #64748b; margin: 5px 0 0 0;">Verifica y gestiona DTEs con seguridad</p>
            </div>
            
            <h2 style="color: #1e293b; margin-bottom: 20px;">Restablecer contraseña</h2>
            
            <p style="color: #475569; line-height: 1.6;">
                Hola, hemos recibido una solicitud para restablecer la contraseña de tu cuenta en NovaFact.
            </p>
            
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; text-align: center; margin: 25px 0;">
                <p style="color: #475569; margin: 0 0 10px 0; font-size: 14px;">Tu código de verificación es:</p>
                <div style="font-size: 32px; font-weight: bold; color: #ef4444; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                    ${code}
                </div>
                <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Este código expira en 1 minuto</p>
            </div>
            
            <p style="color: #475569; line-height: 1.6;">
                Ingresa este código en la aplicación para proceder con el cambio de contraseña.
            </p>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 12px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>Importante:</strong> Si no solicitaste este cambio de contraseña, puedes ignorar este mensaje de forma segura. Tu contraseña actual permanecerá sin cambios.
                </p>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; text-align: center;">
                <p style="color: #64748b; margin: 0; font-size: 12px;">
                    © ${new Date().getFullYear()} NovaFact. Todos los derechos reservados.
                </p>
                <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px;">
                    Este es un correo automático, no responder.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
NovaFact - Restablecer contraseña

Tu código de verificación es: ${code}

Este código expira en 1 minuto.
Ingresa este código en la aplicación para proceder con el cambio de contraseña.

Si no solicitaste este cambio de contraseña, puedes ignorar este mensaje de forma segura.

© ${new Date().getFullYear()} NovaFact. Todos los derechos reservados.
  `.trim();

  return await sendEmail({ to, subject, html, text });
}
