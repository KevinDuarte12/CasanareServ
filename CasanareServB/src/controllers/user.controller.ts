import { Response, Request } from "express";
import bcrypt from "bcrypt";
import crypto from 'crypto';
// ❌ ELIMINAR ESTA LÍNEA:
// import sgMail from '@sendgrid/mail';
import { Op } from "sequelize";
import User from "../db/models/user";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from 'cloudinary';
import Image from '../db/models/image';
import sequelize from '../db/conection';
// Función para verificar si es un correo institucional
const isInstitutionalEmail = (email: string): boolean => {
  const institutionalDomains = [
    '@gov.co',          // Gobierno colombiano
    '@edu.co',          // Instituciones educativas
    '@mil.co',          // Fuerzas militares
    '@pol.co',          // Policía Nacional
    '@empresa.gov.co',  // Empresas del estado
    '@alcaldia.gov.co', // Alcaldías
    '@gobernacion.gov.co', // Gobernaciones
    // Agrega más dominios según tus necesidades
    '@ministerio.gov.co',
    '@dane.gov.co',
    '@icbf.gov.co',
    '@sena.edu.co'
  ];

  return institutionalDomains.some(domain => email.toLowerCase().endsWith(domain.toLowerCase()));
};
// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

// Interfaces
export interface UserAttributes {
  id?: number;
  name: string;
  password: string;
  email: string;
  rol?: 'usuario' | 'admin' | 'vendedor';
  estado?: boolean;
  isVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
}

// ✅ Interfaces para SendGrid
interface SendGridResponse {
  statusCode: number;
  headers: { [key: string]: string };
  body: any;
}

interface SendGridError {
  response?: {
    statusCode: number;
    body: {
      errors?: Array<{ message: string; field?: string; help?: string }>;
    };
  };
  message: string;
}

// ✅ MANTENER SOLO ESTA DECLARACIÓN:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// ✅ Resto de las funciones sin cambios...
async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  try {
    console.log('🚀 Iniciando envío de email a:', email);
    console.log('🔑 API Key configurada:', process.env.SENDGRID_API_KEY ? 'Sí' : 'No');
    console.log('📧 Email FROM:', process.env.EMAIL_FROM);

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    // ✅ FUNCIÓN PARA CREAR BOTONES COMPATIBLES CON OUTLOOK
    function createOutlookCompatibleButton(text: string, url: string, backgroundColor: string): string {
      return `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="border-radius: 8px; background: ${backgroundColor};">
                            <a href="${url}" 
                               style="background: ${backgroundColor}; 
                                      border: 2px solid ${backgroundColor}; 
                                      color: #ffffff; 
                                      font-family: Arial, sans-serif; 
                                      font-size: 16px; 
                                      font-weight: bold; 
                                      line-height: 120%; 
                                      margin: 0; 
                                      text-decoration: none; 
                                      text-transform: none; 
                                      padding: 16px 32px; 
                                      display: block; 
                                      border-radius: 8px;">
                                ${text}
                            </a>
                        </td>
                    </tr>
                </table>
            `;
    }

    const msg = {
      to: email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Equipo de Soporte'
      },
      subject: 'Confirma tu registro en CasanareServ',
      text: `Hola,\n\nGracias por registrarte en CasanareServ, la plataforma líder de compra y venta en Casanare.\n\nPara completar tu registro, confirma tu cuenta visitando el siguiente enlace:\n${verificationUrl}\n\nEste enlace es válido por 24 horas por motivos de seguridad.\n\nSi no creaste esta cuenta, puedes ignorar este mensaje.\n\nSaludos cordiales,\nEquipo de CasanareServ\nCasanare, Colombia`,
      html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <title>Confirma tu registro - CasanareServ</title>
                    <!--[if mso]>
                    <noscript>
                        <xml>
                            <o:OfficeDocumentSettings>
                                <o:PixelsPerInch>96</o:PixelsPerInch>
                            </o:OfficeDocumentSettings>
                        </xml>
                    </noscript>
                    <![endif]-->
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
                        <tr>
                            <td style="padding: 40px 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px;">
                                    
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: #2c3e50; padding: 30px 40px; text-align: center; border-radius: 12px 12px 0 0;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300;">CasanareServ</h1>
                                            <p style="margin: 8px 0 0 0; color: #ecf0f1; font-size: 14px;">Tu marketplace de confianza en Casanare</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="text-align: center; padding: 20px 0;">
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #27ae60; border-radius: 20px; display: inline-block;">
                                                            <tr>
                                                                <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 14px;">
                                                                    ✨ BIENVENIDO A CASANARESERV
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <h2 style="margin: 25px 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600; text-align: center;">
                                                            ¡Bienvenido a nuestra comunidad!
                                                        </h2>
                                                        <p style="margin: 0 0 16px 0; color: #555; font-size: 16px;">Hola,</p>
                                                        <p style="margin: 0 0 24px 0; color: #555; font-size: 16px;">
                                                            Gracias por unirte a <strong>CasanareServ</strong>, la plataforma líder de compra y venta en Casanare. 
                                                            Para garantizar la seguridad de tu cuenta, necesitamos confirmar tu dirección de correo electrónico.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Action Button -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="text-align: center; padding: 35px 0;">
                                                        ${createOutlookCompatibleButton('✓ Confirmar mi cuenta', verificationUrl, '#27ae60')}
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- URL Manual -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px; margin: 30px 0;">
                                                <tr>
                                                    <td style="padding: 16px;">
                                                        <p style="margin: 0 0 8px 0; color: #2c3e50; font-size: 14px;">
                                                            <strong>📱 ¿Problemas con el botón?</strong><br>
                                                            Copia y pega este enlace en tu navegador:
                                                        </p>
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                            <tr>
                                                                <td style="background-color: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #e1e8ed;">
                                                                    <a href="${verificationUrl}" style="font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all; color: #3498db; text-decoration: none;">
                                                                        ${verificationUrl}
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Security Info -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; margin: 25px 0;">
                                                <tr>
                                                    <td style="padding: 16px;">
                                                        <p style="margin: 0; color: #856404; font-size: 14px;">
                                                            <strong>🔒 Información de seguridad:</strong><br>
                                                            Este enlace expirará automáticamente en <strong>24 horas</strong> por motivos de seguridad.
                                                            Si no creaste esta cuenta, puedes ignorar este mensaje sin ninguna acción adicional.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Benefits Section -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #e8f5e8; border-left: 4px solid #27ae60; border-radius: 6px; margin: 25px 0;">
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <h4 style="margin: 0 0 15px 0; color: #155724; font-size: 16px;">
                                                            🚀 ¿Qué puedes hacer en CasanareServ?
                                                        </h4>
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                            <tr>
                                                                <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                                                                    <ul style="margin: 0; color: #155724; line-height: 1.6; padding-left: 15px; font-size: 14px;">
                                                                        <li>🛒 Comprar productos locales</li>
                                                                        <li>💰 Vender tus productos</li>
                                                                        <li>🔄 Realizar trueques seguros</li>
                                                                    </ul>
                                                                </td>
                                                                <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                                                                    <ul style="margin: 0; color: #155724; line-height: 1.6; padding-left: 15px; font-size: 14px;">
                                                                        <li>📞 Contactar vendedores directamente</li>
                                                                        <li>⭐ Calificar productos y servicios</li>
                                                                        <li>🔐 Transacciones 100% seguras</li>
                                                                    </ul>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Separator -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="border-top: 1px solid #e1e8ed; margin: 30px 0; padding: 30px 0 0 0;">
                                                        <p style="margin: 0 0 8px 0; color: #777; font-size: 14px;">
                                                            ¿Tienes preguntas? Estamos aquí para ayudarte.
                                                        </p>
                                                        <p style="margin: 0; color: #777; font-size: 14px;">
                                                            Contáctanos en: <a href="mailto:soporte@casanareserv.me" style="color: #3498db; text-decoration: none;">soporte@casanareserv.me</a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                                            <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 13px;">
                                                <strong>CasanareServ</strong> - Conectando compradores y vendedores en Casanare
                                            </p>
                                            <p style="margin: 0 0 12px 0; color: #95a5a6; font-size: 12px;">
                                                Casanare, Colombia • ${new Date().getFullYear()}
                                            </p>
                                            <p style="margin: 0; color: #7f8c8d; font-size: 11px;">
                                                Este correo fue enviado a ${email}. 
                                                <a href="#" style="color: #3498db; text-decoration: none;">Política de Privacidad</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
    };

    console.log('📤 Enviando mensaje:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    return sgMail
      .send(msg)
      .then((response: SendGridResponse[]) => {
        console.log('✅ Email de verificación compatible con Outlook enviado exitosamente');
        console.log('📊 Status Code:', response[0].statusCode);
        console.log('📋 Headers:', response[0].headers);
        return true;
      })
      .catch((error: SendGridError) => {
        console.error('❌ Error al enviar email de verificación:');
        console.error('📋 Error completo:', error);

        if (error.response) {
          console.error('📊 Status Code:', error.response.statusCode);
          console.error('📝 Response Body:', error.response.body);

          if (error.response.body.errors) {
            error.response.body.errors.forEach((err: { message: string; field?: string }) => {
              console.error(`🚨 SendGrid Error: ${err.message}`);
            });
          }
        }
        return false;
      });
  } catch (error: any) {
    console.error('❌ Error general al preparar el email de verificación:', error);
    return false;
  }
}

async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  try {
    console.log('🚀 Enviando email de reset a:', email);

    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword?token=${token}`;

    // ✅ FUNCIÓN PARA CREAR BOTONES COMPATIBLES CON OUTLOOK
    function createOutlookCompatibleButton(text: string, url: string, backgroundColor: string): string {
      return `
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                        <td style="border-radius: 8px; background: ${backgroundColor};">
                            <a href="${url}" 
                               style="background: ${backgroundColor}; 
                                      border: 2px solid ${backgroundColor}; 
                                      color: #ffffff; 
                                      font-family: Arial, sans-serif; 
                                      font-size: 16px; 
                                      font-weight: bold; 
                                      line-height: 120%; 
                                      margin: 0; 
                                      text-decoration: none; 
                                      text-transform: none; 
                                      padding: 16px 32px; 
                                      display: block; 
                                      border-radius: 8px;">
                                ${text}
                            </a>
                        </td>
                    </tr>
                </table>
            `;
    }

    const msg = {
      to: email,
      from: {
        email: 'noreply@casanareserv.me',
        name: 'CasanareServ - Seguridad'
      },
      subject: 'Solicitud de restablecimiento de contraseña - CasanareServ',
      text: `Hola,\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta en CasanareServ.\n\nPara crear una nueva contraseña, visita el siguiente enlace:\n${resetUrl}\n\nEste enlace es válido por 1 hora por motivos de seguridad.\n\nSi no solicitaste este cambio, tu cuenta permanece segura y puedes ignorar este mensaje.\n\nSaludos,\nEquipo de Seguridad de CasanareServ\nCasanare, Colombia`,
      html: `
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <title>Restablece tu contraseña - CasanareServ</title>
                    <!--[if mso]>
                    <noscript>
                        <xml>
                            <o:OfficeDocumentSettings>
                                <o:PixelsPerInch>96</o:PixelsPerInch>
                            </o:OfficeDocumentSettings>
                        </xml>
                    </noscript>
                    <![endif]-->
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
                        <tr>
                            <td style="padding: 40px 20px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px;">
                                    
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: #e74c3c; padding: 30px 40px; text-align: center; border-radius: 12px 12px 0 0;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 300;">🔒 CasanareServ</h1>
                                            <p style="margin: 8px 0 0 0; color: #ecf0f1; font-size: 14px;">Centro de Seguridad</p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="text-align: center; padding: 20px 0;">
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #f39c12; border-radius: 20px; display: inline-block;">
                                                            <tr>
                                                                <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 14px;">
                                                                    🔐 RESTABLECIMIENTO DE CONTRASEÑA
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <h2 style="margin: 25px 0 20px 0; color: #2c3e50; font-size: 24px; font-weight: 600; text-align: center;">
                                                            Solicitud de restablecimiento de contraseña
                                                        </h2>
                                                        <p style="margin: 0 0 16px 0; color: #555; font-size: 16px;">Hola,</p>
                                                        <p style="margin: 0 0 24px 0; color: #555; font-size: 16px;">
                                                            Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>CasanareServ</strong>. 
                                                            Si fuiste tú quien realizó esta solicitud, puedes crear una nueva contraseña haciendo clic en el botón de abajo.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Action Button -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="text-align: center; padding: 35px 0;">
                                                        ${createOutlookCompatibleButton('🔑 Restablecer mi contraseña', resetUrl, '#f39c12')}
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- URL Manual -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px; margin: 30px 0;">
                                                <tr>
                                                    <td style="padding: 16px;">
                                                        <p style="margin: 0 0 8px 0; color: #2c3e50; font-size: 14px;">
                                                            <strong>📱 ¿Problemas con el botón?</strong><br>
                                                            Copia y pega este enlace en tu navegador:
                                                        </p>
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                            <tr>
                                                                <td style="background-color: #ffffff; padding: 8px; border-radius: 4px; border: 1px solid #e1e8ed;">
                                                                    <a href="${resetUrl}" style="font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all; color: #3498db; text-decoration: none;">
                                                                        ${resetUrl}
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Security Warnings -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; margin: 25px 0;">
                                                <tr>
                                                    <td style="padding: 16px;">
                                                        <p style="margin: 0 0 12px 0; color: #856404; font-size: 14px;">
                                                            <strong>⚠️ Información importante de seguridad:</strong>
                                                        </p>
                                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                            <tr>
                                                                <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                                                                    <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.6;">
                                                                        <li>Este enlace expira en <strong>1 hora</strong></li>
                                                                        <li>Solo puedes usarlo una vez</li>
                                                                    </ul>
                                                                </td>
                                                                <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                                                                    <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 14px; line-height: 1.6;">
                                                                        <li>Nunca compartas este enlace</li>
                                                                        <li>Si no lo solicitaste, ignóralo</li>
                                                                    </ul>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Security Notice -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f1f2f6; border-radius: 6px; margin: 25px 0;">
                                                <tr>
                                                    <td style="padding: 20px; text-align: center;">
                                                        <p style="margin: 0 0 8px 0; color: #2c3e50; font-size: 14px;">
                                                            <strong>¿No solicitaste este cambio?</strong>
                                                        </p>
                                                        <p style="margin: 0; color: #666; font-size: 14px;">
                                                            Puedes ignorar este correo de forma segura. Tu contraseña actual no ha cambiado 
                                                            y tu cuenta permanece protegida.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                            
                                            <!-- Separator -->
                                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                                <tr>
                                                    <td style="border-top: 1px solid #e1e8ed; margin: 30px 0; padding: 30px 0 0 0;">
                                                        <p style="margin: 0 0 8px 0; color: #777; font-size: 14px;">
                                                            ¿Necesitas ayuda con tu cuenta?
                                                        </p>
                                                        <p style="margin: 0; color: #777; font-size: 14px;">
                                                            Contáctanos en: <a href="mailto:seguridad@casanareserv.me" style="color: #3498db; text-decoration: none;">seguridad@casanareserv.me</a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center; border-radius: 0 0 12px 12px;">
                                            <p style="margin: 0 0 8px 0; color: #bdc3c7; font-size: 13px;">
                                                <strong>CasanareServ</strong> - Equipo de Seguridad
                                            </p>
                                            <p style="margin: 0 0 12px 0; color: #95a5a6; font-size: 12px;">
                                                Casanare, Colombia • ${new Date().getFullYear()}
                                            </p>
                                            <p style="margin: 0; color: #7f8c8d; font-size: 11px;">
                                                Este correo fue enviado a ${email} por motivos de seguridad.
                                                <a href="#" style="color: #3498db; text-decoration: none;">Política de Privacidad</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
    };

    return sgMail
      .send(msg)
      .then((response: SendGridResponse[]) => {
        console.log('✅ Email de reset compatible con Outlook enviado exitosamente');
        console.log('📊 Status:', response[0].statusCode);
        return true;
      })
      .catch((error: SendGridError) => {
        console.error('❌ Error enviando reset email:', error);
        if (error.response) {
          console.error('Status:', error.response.statusCode);
          console.error('Body:', error.response.body);
        }
        return false;
      });
  } catch (error: any) {
    console.error('❌ Error general en reset email:', error);
    return false;
  }
}

// Controlador para crear nuevos usuarios
export const newUser = async (req: Request, res: Response): Promise<any> => {
  try {
    console.log('📝 Datos recibidos:', req.body);
    const { name, password, email, document_type, document_number, department, city, phone } = req.body;

    if (!name || !password || !email) {
      return res.status(400).json({
        msg: 'Todos los campos son requeridos',
        received: { name, email, hasPassword: !!password }
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        msg: 'El email ya está registrado',
        code: 'EMAIL_EXISTS'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Verificar si es correo institucional
    const isInstitutional = isInstitutionalEmail(email);
    console.log(`📧 Email ${email} es institucional: ${isInstitutional}`);

    // TODOS los usuarios (institucionales y regulares) requieren verificación
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const isVerified = false;
    const estado = false; // Todos inician inactivos hasta verificar

    if (isInstitutional) {
      console.log('🏛️ Correo institucional detectado - También requiere verificación por email');
    } else {
      console.log('📨 Correo regular - Requiere verificación por email');
    }

    // Crear usuario con configuración estándar (todos requieren verificación)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      rol: 'usuario',
      isVerified, // Siempre false inicialmente
      estado, // Siempre false inicialmente
      verificationToken, // Siempre se genera
      verificationTokenExpires, // Siempre se genera
      document_type: document_type || null,
      document_number: document_number || null,
      department: department || null,
      city: city || null,
      phone: phone || null
    });

    // TODOS los usuarios reciben email de verificación
    await sendVerificationEmail(email, verificationToken);

    const userJson = user.toJSON();
    console.log('✅ Usuario creado:', {
      id: userJson.id,
      email: userJson.email,
      name: userJson.name,
      isVerified: userJson.isVerified,
      estado: userJson.estado,
      isInstitutional,
      document_type: userJson.document_type,
      city: userJson.city
    });

    // Respuesta estándar para todos los usuarios
    const responseMessage = 'Usuario creado exitosamente. Por favor verifica tu email antes de iniciar sesión.';

    return res.status(201).json({
      msg: responseMessage,
      isInstitutional,
      needsVerification: true, // TODOS necesitan verificación
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        isVerified: userJson.isVerified // Siempre será false
      }
    });
  } catch (error: any) {
    console.error('❌ Error al crear usuario:', error);
    return res.status(400).json({
      msg: 'Error al crear el usuario',
      error: error.message
    });
  }
};

// Controlador para el login
export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
      return res.status(400).json({
        msg: 'Se requieren email y password',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Verificar si existe el usuario
    const user = await User.findOne({
      where: {
        email,
        estado: true // ¡Usar 'estado' en lugar de 'status'!
      }
    });

    if (!user) {
      return res.status(400).json({
        msg: 'Usuario o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar que el usuario esté verificado
    if (user.get('isVerified') === false) {
      return res.status(401).json({
        msg: 'Usuario no verificado',
        code: 'UNVERIFIED_USER'
      });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(
      password,
      user.get('password') as string
    );

    if (!validPassword) {
      return res.status(400).json({
        msg: 'Usuario o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      {
        id: user.get('id'),
        email: user.get('email'),
        name: user.get('name'),
        rol: user.get('rol')
      },
      process.env.SECRET_KEY || "hola123",
      { expiresIn: '24h' }
    );

    // Preparar datos del usuario para retornar (sin información sensible)
    const userForResponse = {
      id: user.get('id'),
      name: user.get('name'),
      email: user.get('email'),
      rol: user.get('rol')
    };

    console.log('✅ Login exitoso:', user.get('email'));

    // Respuesta exitosa
    return res.status(200).json({
      msg: 'Login exitoso',
      token,
      user: userForResponse,
      expiresIn: 86400 // 24 horas en segundos
    });
  } catch (error: any) {
    console.error('❌ Error en login:', error);
    return res.status(500).json({
      msg: 'Error interno del servidor',
      code: 'SERVER_ERROR'
    });
  }
};

// Controlador para verificar email (función existente)
export const verifyEmail = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        msg: 'Token de verificación no proporcionado',
        code: 'MISSING_TOKEN'
      });
    }

    const user = await User.findOne({
      where: {
        verificationToken: token,
        verificationTokenExpires: { [Op.gt]: new Date() },
        isVerified: false // Asegurarse de que solo funcione para usuarios no verificados
      }
    });

    if (!user) {
      return res.status(400).json({
        msg: 'Token inválido o expirado, o la cuenta ya está verificada',
        code: 'INVALID_TOKEN'
      });
    }

    // Update con campos reseteados usando undefined en lugar de null
    await User.update({
      isVerified: true,
      verificationToken: undefined,
      verificationTokenExpires: undefined,
      estado: true // Activar la cuenta
    }, {
      where: { id: user.getDataValue('id') }
    });

    console.log('✅ Email verificado:', user.get('email'));

    return res.status(200).json({
      msg: 'Email verificado exitosamente'
    });
  } catch (error: any) {
    console.error('❌ Error en verificación:', error);
    return res.status(500).json({
      msg: 'Error al verificar email',
      error: error.message
    });
  }
};

// Controlador para obtener usuarios
export const getUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado']
    });

    return res.status(200).json(users);
  } catch (error: any) {
    console.error('❌ Error al obtener usuarios:', error);
    return res.status(500).json({
      msg: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Buscar usuario con sus imágenes asociadas usando el alias correcto
    const user = await User.findOne({
      where: { id },
      attributes: [
        'id', 'name', 'email', 'rol', 'isVerified', 'estado',
        // Añadir estos campos adicionales
        'document_type', 'document_number', 'department', 'city', 'phone'
      ],
      include: [{
        model: Image,
        as: 'userImages',
        required: false,
        attributes: ['id', 'url', 'is_main']
      }]
    });

    if (!user) {
      return res.status(404).json({
        msg: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    return res.status(200).json(user);
  } catch (error: any) {
    console.error('❌ Error al obtener usuario por ID:', error);
    return res.status(500).json({
      msg: 'Error al obtener el usuario',
      error: error.message
    });
  }
};
// Controlador para actualizar usuario
export const updateUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, email, password, rol, image_url } = req.body;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({
        msg: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (rol) updates.rol = rol;

    // Hashear la contraseña si se proporciona una nueva
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    // Actualizar el usuario
    await user.update(updates);

    // Si se proporciona una URL de imagen, actualizarla en el sistema de imágenes
    if (image_url) {
      // Verificar si ya existe una imagen principal para este usuario
      const mainImage = await Image.findOne({
        where: {
          entity_type: 'user',
          entity_id: parseInt(id),
          is_main: true
        }
      });

      if (mainImage) {
        // Actualizar la imagen existente
        await mainImage.update({ url: image_url });
      } else {
        // Crear una nueva imagen principal
        await Image.create({
          url: image_url,
          entity_type: 'user',
          entity_id: parseInt(id),
          is_main: true
        });
      }
    }

    // Obtener el usuario actualizado con sus imágenes
    const updatedUser = await User.findOne({
      where: { id },
      attributes: ['id', 'name', 'email', 'rol', 'isVerified', 'estado'],
      include: [{
        model: Image,
        as: 'userImages', // ¡Cambiado a 'userImages'!
        required: false,
        attributes: ['id', 'url', 'is_main']
      }]
    });

    console.log('✅ Usuario actualizado:', user.get('email'));

    return res.status(200).json({
      msg: 'Usuario actualizado exitosamente',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar usuario:', error);
    return res.status(500).json({
      msg: 'Error al actualizar usuario',
      error: error.message
    });
  }
};

// Controlador para eliminar usuario (actualizado)
// Modificación de la función deleteUser:
// Controlador para eliminar usuario (CORREGIDO)
export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const isHardDelete = req.query.hard === 'true';

    console.log(`🔄 Iniciando ${isHardDelete ? 'eliminación permanente' : 'desactivación'} del usuario ${id}`);

    // Iniciar una transacción para asegurar consistencia
    const transaction = await sequelize.transaction();

    try {
      // Buscar usuario
      const user = await User.findByPk(id);

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({
          msg: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        });
      }

      if (isHardDelete) {
        console.log(`🗑️ Iniciando eliminación PERMANENTE del usuario ${id}`);

        // 🔑 ORDEN CORRECTO DE ELIMINACIÓN (de dependientes a padre)

        // 1. Obtener productos del usuario PRIMERO
        const products = await getProductsByUserId(id);
        console.log(`🔄 Encontrados ${products.length} productos del usuario ${id}`);

        // 2. Para cada producto, eliminar TODAS sus dependencias
        for (const product of products) {
          try {
            const productId = product.get('id');
            console.log(`🗑️ Procesando producto ID: ${productId}`);

            // 2a. Eliminar trueques relacionados con el producto
            await handleProductBarters(productId, transaction);

            // 2b. Eliminar items del carrito que contienen este producto
            await handleProductCarts(productId, transaction);

            // 2c. Eliminar comentarios/reviews del producto
            await handleProductReviews(productId, transaction);

            // 2d. Eliminar imágenes del producto
            await handleProductImages(productId, transaction);

            // 2e. ¡IMPORTANTE! Eliminar el producto mismo
            await product.destroy({ transaction });

            console.log(`✅ Producto ${productId} y sus dependencias eliminados`);
          } catch (productError) {
            console.error(`❌ Error al eliminar producto ${product.get('id')}:`, productError);
            throw productError;
          }
        }

        // 3. Eliminar dependencias directas del usuario

        // 3a. Eliminar notificaciones del usuario
        await handleUserNotifications(id, transaction);

        // 3b. Eliminar carrito de compras del usuario
        await handleUserCart(id, transaction);

        // 3c. Eliminar trueques donde el usuario es solicitante
        await handleUserBarters(id, transaction);

        // 3d. Eliminar direcciones del usuario
        await handleUserAddresses(id, transaction);

        // 3e. Eliminar imágenes del usuario
        await handleUserImages(id, transaction);

        // 4. Finalmente, eliminar al usuario
        await user.destroy({ transaction });
        console.log(`✅ Usuario ${id} eliminado permanentemente`);

        var responseMsg = 'Usuario y todos sus datos relacionados eliminados permanentemente';
      } else {
        // Eliminación lógica (soft delete)
        await user.update({ estado: false }, { transaction });
        console.log(`✅ Usuario ${id} desactivado (soft delete)`);
        var responseMsg = 'Usuario desactivado correctamente';
      }

      // Confirmar transacción
      await transaction.commit();

      return res.status(200).json({
        msg: responseMsg
      });
    } catch (error) {
      // Revertir transacción en caso de error
      await transaction.rollback();
      console.error('❌ Error en transacción, rollback ejecutado:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Error al eliminar usuario:', error);
    return res.status(500).json({
      msg: 'Error al eliminar usuario',
      error: error.message,
      details: 'Verifique que no existan dependencias del usuario en otras tablas'
    });
  }
};
// Función auxiliar para manejar las imágenes del usuario
async function handleUserImages(userId: string | number, transaction: any) {
  try {
    // Obtener las imágenes asociadas al usuario
    const images = await Image.findAll({
      where: {
        entity_type: 'user',
        entity_id: parseInt(userId.toString())
      }
    });

    console.log(`Procesando ${images.length} imágenes del usuario ${userId}`);

    // Eliminar imágenes de Cloudinary
    for (const image of images) {
      const publicId = image.get('public_id');
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId as string);
          console.log(`Imagen eliminada de Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error('Error al eliminar imagen de Cloudinary:', cloudinaryError);
          // Continuamos aunque falle la eliminación en Cloudinary
        }
      }
    }

    // Eliminar registros de imágenes
    if (images.length > 0) {
      const deleted = await Image.destroy({
        where: {
          entity_type: 'user',
          entity_id: parseInt(userId.toString())
        },
        transaction
      });
      console.log(`${deleted} imágenes de usuario eliminadas`);
    }
  } catch (error) {
    console.error('Error al eliminar imágenes del usuario:', error);
    throw error;
  }
}

async function getProductsByUserId(userId: string | number): Promise<any[]> {
  try {
    // Importar modelo Product
    const Product = require('../db/models/product').default;
    
    if (!Product) {
      console.warn('El modelo Product no está definido');
      return [];
    }
    
    const products = await Product.findAll({
      where: {
        id_user: parseInt(userId.toString())
      },
      attributes: ['id', 'name', 'id_user'] // Solo los campos necesarios
    });
    
    console.log(`📦 Encontrados ${products.length} productos para usuario ${userId}`);
    return products;
  } catch (error) {
    console.error('❌ Error al obtener productos del usuario:', error);
    return [];
  }
}


// Función auxiliar para manejar las imágenes de un producto
async function handleProductImages(productId: string | number | undefined | null, transaction: any) {
  // Validar que productId no sea undefined o null
  if (productId === undefined || productId === null) {
    console.warn('ID de producto indefinido o null en handleProductImages');
    return; // Salir temprano de la función
  }

  try {
    // Convertir productId a número de forma segura
    const numericProductId = parseInt(String(productId));

    // Verificar que sea un número válido
    if (isNaN(numericProductId)) {
      console.warn(`ID de producto inválido en handleProductImages: ${productId}`);
      return;
    }

    // Obtener las imágenes asociadas al producto
    const images = await Image.findAll({
      where: {
        entity_type: 'product',
        entity_id: numericProductId
      }
    });

    console.log(`Procesando ${images.length} imágenes del producto ${numericProductId}`);

    // Eliminar imágenes de Cloudinary
    for (const image of images) {
      const publicId = image.get('public_id');
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId as string);
          console.log(`Imagen de producto eliminada de Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error('Error al eliminar imagen de producto de Cloudinary:', cloudinaryError);
        }
      }
    }

    // Eliminar registros de imágenes
    if (images.length > 0) {
      await Image.destroy({
        where: {
          entity_type: 'product',
          entity_id: numericProductId
        },
        transaction
      });
      console.log(`${images.length} imágenes de producto eliminadas`);
    }
  } catch (error) {
    console.error(`Error al procesar imágenes del producto ${productId}:`, error);
    // Opcional: aquí puedes decidir si propagar el error o manejarlo silenciosamente
    throw error; // Si quieres que interrumpa la transacción
  }
}
// Función auxiliar para manejar los trueques relacionados con un producto
async function handleProductBarters(productId: string | number, transaction: any) {
  try {
    // Importar directamente el modelo
    const Barter = require('../db/models/barter').default; // Ajusta la ruta

    // Si el modelo no existe, salir sin error
    if (!Barter) {
      console.warn('El modelo Barter no está definido');
      return;
    }

    // Eliminar trueques donde este producto está involucrado
    await Barter.destroy({
      where:
      {
        [Op.or]: [
          { id_product_offered: parseInt(productId.toString()) },
          { id_product_requested: parseInt(productId.toString()) }
        ]
      },
      transaction
    });
    console.log(`Trueques relacionados con el producto ${productId} eliminados`);
  } catch (error) {
    console.error('Error al eliminar trueques del producto:', error);
    // No interrumpir el proceso
  }
}

// Función auxiliar para manejar los carritos que contienen un producto
async function handleProductCarts(productId: string | number, transaction: any) {
  try {
    // Intentar con diferentes nombres de modelo
    let CartItem;
    try {
      CartItem = require('../db/models/cartItem').default;
    } catch {
      try {
        CartItem = require('../db/models/itemcart').default;
      } catch {
        try {
          CartItem = require('../db/models/cart_item').default;
        } catch {
          console.warn('❌ No se encontró modelo CartItem con ningún nombre');
          return;
        }
      }
    }
    
    if (!CartItem) {
      console.warn('El modelo CartItem no está definido');
      return;
    }
    
    // Eliminar items de carrito que contienen este producto
    const deleted = await CartItem.destroy({
      where: {
        id_product: parseInt(productId.toString())
      },
      transaction
    });
    
    console.log(`🗑️ ${deleted} items de carrito eliminados para producto ${productId}`);
  } catch (error) {
    console.error(`❌ Error al eliminar items de carrito del producto ${productId}:`, error);
    // No interrumpir el proceso
    console.log('⚠️ Continuando eliminación a pesar del error...');
  }
}

// Función auxiliar para manejar comentarios y valoraciones de un producto
async function handleProductReviews(productId: string | number, transaction: any) {
  try {
    // Importar directamente el modelo
    const Review = require('../db/models/review').default;

    // Si el modelo no existe, salir sin error
    if (!Review) {
      console.warn('El modelo Review no está definido');
      return;
    }

    await Review.destroy({
      where: {
        id_product: parseInt(productId.toString())
      },
      transaction
    });
    console.log(`Reseñas del producto ${productId} eliminadas`);
  } catch (error) {
    console.error('Error al eliminar reseñas del producto:', error);
    // No interrumpir el proceso
  }
}

// Función auxiliar para manejar los trueques solicitados por un usuario
async function handleUserBarters(userId: string | number, transaction: any) {
  try {
    // Importar directamente el modelo
    const Barter = require('../db/models/barter').default;

    // Si el modelo no existe, salir sin error
    if (!Barter) {
      console.warn('El modelo Barter no está definido');
      return;
    }

    // Eliminar trueques donde este usuario es el solicitante
    await Barter.destroy({
      where: {
        id_user_requester: parseInt(userId.toString())
      },
      transaction
    });
    console.log(`Trueques solicitados por el usuario ${userId} eliminados`);
  } catch (error) {
    console.error('Error al eliminar trueques del usuario:', error);
    // No interrumpir el proceso
  }
}
// Función auxiliar para manejar el carrito de compras del usuario
async function handleUserCart(userId: string | number, transaction: any) {
  try {
    // Importar modelos
    const Cart = require('../db/models/cart').default;
    const CartItem = require('../db/models/itemcart').default;
    
    if (!Cart) {
      console.warn('El modelo Cart no está definido, saltando...');
      return;
    }
    
    // Obtener el carrito del usuario
    const cart = await Cart.findOne({
      where: {
        id_user: parseInt(userId.toString())
      }
    });
    
    if (cart) {
      const cartId = cart.get('id_cart') || cart.get('id');
      console.log(`🛒 Encontrado carrito ID: ${cartId} para usuario ${userId}`);
      
      // Si existe CartItem, eliminar items primero
      if (CartItem) {
        const deletedItems = await CartItem.destroy({
          where: {
            id_cart: cartId
          },
          transaction
        });
        console.log(`🗑️ ${deletedItems} items de carrito eliminados`);
      }
      
      // Eliminar el carrito
      await cart.destroy({ transaction });
      console.log(`✅ Carrito eliminado para usuario ${userId}`);
    } else {
      console.log(`ℹ️ No se encontró carrito para usuario ${userId}`);
    }
  } catch (error) {
    console.error('❌ Error al eliminar carrito del usuario:', error);
    // No propagar el error para continuar con otros elementos
    console.log('⚠️ Continuando eliminación a pesar del error de carrito...');
  }
}


// Función auxiliar para manejar las direcciones del usuario
async function handleUserAddresses(userId: string | number, transaction: any) {
  try {
    // Verificar si existe el módulo sin interrumpir el flujo
    let Address;
    try {
      Address = require('../db/models/address').default;
    } catch (importError) {
      console.log(`ℹ️ No se encontró el modelo Address en tu proyecto, continuando sin error...`);
      return; // Salir de la función sin error
    }

    // Si llegamos aquí, el modelo existe y podemos continuar
    if (!Address) {
      console.warn('El modelo Address no está definido');
      return;
    }

    const deleted = await Address.destroy({
      where: {
        id_user: parseInt(userId.toString())
      },
      transaction
    });
    console.log(`${deleted} direcciones del usuario ${userId} eliminadas`);
  } catch (error) {
    console.error('Error al eliminar direcciones del usuario:', error);
    // No propagar el error para evitar interrumpir el proceso
    console.log('Continuando con la eliminación del usuario a pesar del error con direcciones...');
  }
}
// Reemplazar la función de resetPassword también

// Controlador para solicitar restablecimiento de contraseña
export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;

    // Validación básica
    if (!email) {
      return res.status(400).json({
        msg: 'El email es requerido',
        code: 'MISSING_EMAIL'
      });
    }

    // Buscar usuario verificado
    const user = await User.findOne({
      where: {
        email,
        isVerified: true,
        estado: true
      }
    });

    if (!user) {
      return res.status(404).json({
        msg: 'No existe una cuenta verificada con este email',
        code: 'EMAIL_NOT_FOUND'
      });
    }

    // Generar token y establecer expiración
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hora

    // Actualizar usuario con el token
    await user.update({
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpires
    });

    // Enviar email
    await sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({
      msg: 'Se ha enviado un email con las instrucciones'
    });

  } catch (error: any) {
    console.error('❌ Error al solicitar restablecimiento:', error);
    return res.status(500).json({
      msg: 'Error al procesar la solicitud',
      error: error.message
    });
  }
};

// Controlador para restablecer la contraseña
export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const { token, newPassword } = req.body;

    // Validaciones
    if (!token || !newPassword) {
      return res.status(400).json({
        msg: 'Token y nueva contraseña son requeridos',
        code: 'MISSING_FIELDS'
      });
    }

    // Buscar usuario con token válido
    const user = await User.findOne({
      where:
      {
        passwordResetToken: token,
        passwordResetExpires: { [Op.gt]: new Date() },
        estado: true
      }
    });

    if (!user) {
      return res.status(400).json({
        msg: 'Token inválido o expirado',
        code: 'INVALID_TOKEN'
      });
    }

    // Encriptar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Opción 1: Usar el ID con tipo explícito
    const userId = Number(user.get('id'));

    // Actualizar usuario usando el método update directo de Sequelize
    await User.update({
      password: hashedPassword,
      passwordResetToken: '',  // Usar string vacío en lugar de null
      passwordResetExpires: new Date(0)  // Usar una fecha pasada en lugar de null
    }, {
      where: { id: userId }  // Usar el ID con tipo numérico explícito
    });



    console.log('✅ Contraseña restablecida:', user.get('email'));

    return res.status(200).json({
      msg: 'Contraseña actualizada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error al restablecer contraseña:', error);
    return res.status(500).json({
      msg: 'Error al restablecer la contraseña',
      error: error.message
    });
  }
};

// Actualización del método getUserProfile para incluir los nuevos campos
export const getUserProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = (req as any).user.id;

    console.log(`🔍 Obteniendo perfil para usuario ID: ${userId}`);

    if (!userId) {
      return res.status(401).json({
        msg: 'No autorizado',
        code: 'UNAUTHORIZED'
      });
    }

    // Modificar esta consulta para incluir los campos adicionales
    const user = await User.findOne({
      where: {
        id: userId,
        estado: true
      },
      attributes: [
        'id', 'name', 'email', 'rol', 'isVerified', 'estado',
        'document_type', 'document_number', 'department', 'city', 'phone' // Asegúrate de que estos campos estén definidos en el modelo
      ],
      include: [{
        model: Image,
        as: 'userImages',
        required: false,
        attributes: ['id', 'url', 'is_main']
      }]
    });

    if (!user) {
      return res.status(404).json({
        msg: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Encontrar la imagen principal
    let profileImage = null;
    const images = user.get('userImages') as any[];

    if (images && images.length > 0) {
      const mainImage = images.find(img => img.is_main);
      profileImage = mainImage ? mainImage.url : images[0].url;
    }

    console.log(`✅ Perfil obtenido para ${user.get('email')}`);

    return res.status(200).json({
      id: user.get('id'),
      name: user.get('name'),
      email: user.get('email'),
      rol: user.get('rol'),
      isVerified: user.get('isVerified'),
      estado: user.get('estado'),
      // Añadir estos campos que faltan:
      document_type: user.get('document_type'),
      document_number: user.get('document_number'),
      department: user.get('department'),
      city: user.get('city'),
      phone: user.get('phone'),
      profileImage,
      userImages: images
    });
  } catch (error: any) {
    console.error('❌ Error al obtener perfil de usuario:', error);
    return res.status(500).json({
      msg: 'Error interno del servidor',
      error: error.message
    });
  }
};
// Nuevo controlador para subir imagen de perfil
export const uploadProfileImage = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = parseInt(req.params.id);
    const imageUrl = req.body.image_url; // URL de imagen procesada por el controlador de imágenes

    if (!imageUrl) {
      return res.status(400).json({
        msg: 'URL de imagen requerida',
        code: 'MISSING_IMAGE_URL'
      });
    }

    // Verificar si el usuario existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        msg: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si ya existe una imagen principal
    const existingMainImage = await Image.findOne({
      where: {
        entity_type: 'user',
        entity_id: userId,
        is_main: true
      }
    });

    if (existingMainImage) {
      // Actualizar imagen existente
      await existingMainImage.update({
        url: imageUrl
      });

      console.log(`✅ Imagen de perfil actualizada para usuario ${userId}`);
      return res.status(200).json({
        msg: 'Imagen de perfil actualizada exitosamente',
        image: existingMainImage
      });
    } else {
      // Crear nueva imagen
      const newImage = await Image.create({
        url: imageUrl,
        entity_type: 'user',
        entity_id: userId,
        is_main: true
      });

      console.log(`✅ Imagen de perfil creada para usuario ${userId}`);
      return res.status(201).json({
        msg: 'Imagen de perfil creada exitosamente',
        image: newImage
      });
    }
  } catch (error: any) {
    console.error('❌ Error al subir imagen de perfil:', error);
    return res.status(500).json({
      msg: 'Error al subir imagen de perfil',
      error: error.message
    });
  }
};

// Contador de intentos fallidos por usuario
const failedAttempts: Record<number, number> = {};
// Máximo de intentos permitidos
const MAX_ATTEMPTS = 3;

export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // Obtener el ID del usuario directamente del token
    const userId = (req as any).user.id;

    if (!userId) {
      res.status(401).json({
        msg: 'Usuario no autenticado'
      });
      return;
    }

    console.log(`📝 Actualizando perfil para usuario ID: ${userId}`);

    // Si se proporciona contraseña, verificarla
    if (req.body.password) {
      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ msg: 'Usuario no encontrado' });
        return;
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(
        req.body.password,
        user.getDataValue('password')
      );

      if (!validPassword) {
        // Incrementar contador de intentos fallidos
        failedAttempts[userId] = (failedAttempts[userId] || 0) + 1;

        // Si alcanza el máximo de intentos, señalar que debe cerrarse la sesión
        if (failedAttempts[userId] >= MAX_ATTEMPTS) {
          delete failedAttempts[userId]; // Resetear contador
          res.status(401).json({
            msg: 'Contraseña incorrecta. Demasiados intentos fallidos.',
            forceLogout: true
          });
          return;
        }

        res.status(401).json({
          msg: `Contraseña incorrecta. Intentos restantes: ${MAX_ATTEMPTS - failedAttempts[userId]}`,
          attemptsLeft: MAX_ATTEMPTS - failedAttempts[userId]
        });
        return;
      }

      // Resetear contador si la contraseña es correcta
      delete failedAttempts[userId];
    }

    // Continuar con la actualización del perfil
    const { name, phone, department, city, document_type, document_number } = req.body;
    const updateData: any = {};

    // Agregar solo los campos que se enviaron en la solicitud
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (department !== undefined) updateData.department = department;
    if (city !== undefined) updateData.city = city;
    if (document_type !== undefined) updateData.document_type = document_type;
    if (document_number !== undefined) updateData.document_number = document_number;

    // Buscar el usuario para actualizarlo
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({ msg: 'Usuario no encontrado' });
      return;
    }

    // Actualizar el usuario
    await user.update(updateData);

    // Obtener el usuario actualizado con sus imágenes
    const updatedUser = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'name', 'email', 'rol', 'phone', 'department', 'city',
        'document_type', 'document_number'],
      include: [{
        model: Image,
        as: 'userImages',
        required: false,
        attributes: ['id', 'url', 'is_main']
      }]
    });

    console.log(`✅ Perfil actualizado para usuario ${userId}`);

    res.status(200).json({
      msg: 'Perfil actualizado correctamente',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar perfil:', error);
    res.status(500).json({
      msg: 'Error al actualizar el perfil',
      error: error.message
    });
  }
};

// Función auxiliar para manejar las notificaciones del usuario
async function handleUserNotifications(userId: string | number, transaction: any) {
  try {
    // Importar directamente el modelo
    const Notification = require('../db/models/notifications').default;

    // Si el modelo no existe, salir sin error
    if (!Notification) {
      console.warn('El modelo Notification no está definido');
      return;
    }

    // Eliminar todas las notificaciones del usuario
    const deleted = await Notification.destroy({
      where: {
        id_user: parseInt(userId.toString())
      },
      transaction
    });

    console.log(`✅ ${deleted} notificaciones del usuario ${userId} eliminadas`);
  } catch (error) {
    console.error('❌ Error al eliminar notificaciones del usuario:', error);
    throw error; // Propagar el error para el manejo de la transacción
  }
}