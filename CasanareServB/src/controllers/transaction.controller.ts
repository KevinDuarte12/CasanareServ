/**
 * Controlador para manejo de pagos a través de PayU Latam
 * Incluye funciones para crear pagos, recibir notificaciones y verificar estados
 */
import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import sgMail from '@sendgrid/mail';
import { checkAndUpdateBarterCompletion } from './barter.controller';
import Barter from '../db/models/barter';
import Transaction from '../db/models/transaction';
import Cart from '../db/models/cart';
import ItemCart from '../db/models/itemcart';
import User from '../db/models/user';
import Product from '../db/models/product';
import Notification from '../db/models/notifications';
import Image from '../db/models/image';
import DeliveryAddress from '../db/models/deliveryAddress';
// Configuración de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
// Variables de configuración para PayU desde .env
const PAYU_API_URL = process.env.NODE_ENV === 'production'
  ? (process.env.PAYU_API_URL_PRODUCTION || 'https://api.payulatam.com/payments-api/4.0/service.cgi')
  : (process.env.PAYU_API_URL_SANDBOX || 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi');

const PAYU_API_KEY = process.env.PAYU_API_KEY;
const PAYU_MERCHANT_ID = process.env.PAYU_MERCHANT_ID;
const PAYU_ACCOUNT_ID = process.env.PAYU_ACCOUNT_ID;
const PAYU_API_LOGIN = process.env.PAYU_API_LOGIN;
//const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3006';
 const BACKEND_URL = process.env.BACKEND_URL || 'https://casanareserv.me';
 const FRONTEND_URL = process.env.FRONTEND_URL || 'https://casanareserv.me';
//const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
/**
 * Envía un correo electrónico de notificación de pago
 */
async function sendPaymentNotificationEmail(to: string, status: string, transactionInfo: any): Promise<boolean> {
  try {
    console.log('🚀 Enviando notificación de pago a:', to);

    let subject = '';
    let emailContent = '';
    let buttonText = '';
    let buttonColor = '';
    let statusIcon = '';

    // Formatear monto y fecha
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(transactionInfo.amount);

    const formattedDate = new Date(transactionInfo.date).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });

    // ✅ DETECTAR SI ES TRUEQUE
    const isBarter = transactionInfo.paymentMethod === 'Servicio de trueque' ||
      transactionInfo.products?.some((p: any) => p.name === 'Servicio de trueque');

    // ✅ FUNCIÓN PARA CREAR BOTONES COMPATIBLES CON OUTLOOK
    function createOutlookCompatibleButton(text: string, url: string, backgroundColor: string): string {
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 6px; background: ${backgroundColor};">
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
                        padding: 12px 25px; 
                        display: block; 
                        border-radius: 6px;">
                ${text}
              </a>
            </td>
          </tr>
        </table>
      `;
    }

    // Construir lista de productos profesional
    let productsList = '';
    if (transactionInfo.products && transactionInfo.products.length > 0) {
      if (isBarter) {
        productsList = `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
            <tr>
              <td style="padding: 0;">
                <h3 style="color: #333; margin-bottom: 15px; font-size: 18px; font-weight: 600;">
                  🔄 Servicio Contratado
                </h3>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 8px;">
                  <tr>
                    <td style="padding: 20px;">
                      <h4 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">
                        ✅ Servicio de Trueque Seguro
                      </h4>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td style="color: #666; font-size: 14px; line-height: 1.5; padding: 10px 0;">
                            • Plataforma segura para intercambios entre usuarios<br>
                            • Gestión completa del proceso de trueque<br>
                            • Soporte técnico especializado<br>
                            • Garantía y protección del intercambio
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top: 1px solid #e9ecef; padding-top: 15px; margin-top: 15px;">
                            <strong style="color: #007bff;">Valor del Servicio: ${formattedAmount}</strong>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
      } else {
        productsList = `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
            <tr>
              <td style="padding: 0;">
                <h3 style="color: #333; margin-bottom: 15px; font-size: 18px; font-weight: 600;">
                  📦 Productos Adquiridos
                </h3>
                ${transactionInfo.products.map((product: any) => `
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; margin: 10px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">${product.name}</h4>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="color: #666; font-size: 14px; width: 50%;">
                              <strong>Cantidad:</strong> ${product.quantity}
                            </td>
                            <td style="color: #666; font-size: 14px; width: 50%;">
                              <strong>Precio:</strong> ${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(product.price)}
                            </td>
                          </tr>
                          <tr>
                            <td colspan="2" style="text-align: right; padding-top: 10px; border-top: 1px solid #e9ecef; margin-top: 10px;">
                              <strong style="color: #007bff; font-size: 16px;">
                                Total: ${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(product.price * product.quantity)}
                              </strong>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                `).join('')}
              </td>
            </tr>
          </table>
        `;
      }
    }

    // ✅ CONTENIDO SEGÚN ESTADO
    switch (status) {
      case 'completada':
        statusIcon = '✅';
        buttonColor = '#28a745';
        if (isBarter) {
          subject = 'Confirmación de Pago - Servicio de Trueque | CasanareServ';
          buttonText = 'Acceder a Mis Trueques';
          emailContent = `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="text-align: center; padding: 20px 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #28a745; border-radius: 20px; display: inline-block;">
                    <tr>
                      <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 14px;">
                        ${statusIcon} PAGO CONFIRMADO
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <h2 style="color: #333; margin: 25px 0 20px 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-align: center;">
                    Su pago del servicio de trueque ha sido procesado exitosamente
                  </h2>
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                    Estimado usuario, nos complace confirmar que su pago ha sido recibido y procesado correctamente. 
                    El servicio de trueque seguro está ahora disponible para su uso.
                  </p>
                </td>
              </tr>
            </table>
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #e8f5e8; border-left: 4px solid #28a745; border-radius: 8px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <h4 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px;">Detalles de la Transacción</h4>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                      <td style="font-size: 14px; padding: 5px 0; width: 50%;">
                        <strong>Referencia:</strong><br>${transactionInfo.reference}
                      </td>
                      <td style="font-size: 14px; padding: 5px 0; width: 50%;">
                        <strong>Monto:</strong><br>${formattedAmount}
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size: 14px; padding: 5px 0;">
                        <strong>Fecha:</strong><br>${formattedDate}
                      </td>
                      <td style="font-size: 14px; padding: 5px 0;">
                        <strong>Servicio:</strong><br>Trueque Seguro
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            ${productsList}
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #e8f5e8; border-left: 4px solid #28a745; border-radius: 8px; margin: 25px 0;">
              <tr>
                <td style="padding: 20px;">
                  <h4 style="margin: 0 0 15px 0; color: #155724; font-size: 16px;">
                    🎯 Próximos Pasos
                  </h4>
                  <ul style="margin: 0; color: #155724; line-height: 1.6; padding-left: 20px;">
                    <li>Acceda a su panel de trueques para coordinar el intercambio</li>
                    <li>Utilice nuestro sistema de mensajería integrado</li>
                    <li>Realice el intercambio en un lugar público y seguro</li>
                    <li>Confirme la recepción una vez completado el trueque</li>
                  </ul>
                </td>
              </tr>
            </table>
          `;
        } else {
          subject = 'Confirmación de Pago - Compra Exitosa | CasanareServ';
          buttonText = 'Ver Mis Compras';
          emailContent = `
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
              <tr>
                <td style="text-align: center; padding: 20px 0;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #28a745; border-radius: 20px; display: inline-block;">
                    <tr>
                      <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 14px;">
                        ${statusIcon} PAGO CONFIRMADO
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <h2 style="color: #333; margin: 25px 0 20px 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-align: center;">
                    Su compra ha sido procesada exitosamente
                  </h2>
                  <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                    Estimado cliente, nos complace confirmar que su pago ha sido recibido y procesado correctamente. 
                    Su pedido está siendo preparado y pronto recibirá información sobre el envío.
                  </p>
                </td>
              </tr>
            </table>
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #e8f5e8; border-left: 4px solid #28a745; border-radius: 8px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <h4 style="margin: 0 0 15px 0; color: #007bff; font-size: 16px;">Detalles de la Transacción</h4>
                  <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                    <tr>
                      <td style="font-size: 14px; padding: 5px 0; width: 50%;">
                        <strong>Referencia:</strong><br>${transactionInfo.reference}
                      </td>
                      <td style="font-size: 14px; padding: 5px 0; width: 50%;">
                        <strong>Monto:</strong><br>${formattedAmount}
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size: 14px; padding: 5px 0;">
                        <strong>Fecha:</strong><br>${formattedDate}
                      </td>
                      <td style="font-size: 14px; padding: 5px 0;">
                        <strong>Método de Pago:</strong><br>${transactionInfo.paymentMethod || 'PayU'}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            
            ${productsList}
            
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #e8f5e8; border-left: 4px solid #28a745; border-radius: 8px; margin: 25px 0;">
              <tr>
                <td style="padding: 20px;">
                  <p style="margin: 0; color: #155724; font-size: 15px; line-height: 1.6;">
                    <strong>🚚 Información de Envío:</strong><br>
                    Recibirá un correo electrónico con el número de seguimiento una vez que su pedido sea despachado. 
                    El tiempo estimado de entrega es de 3 a 5 días hábiles.
                  </p>
                </td>
              </tr>
            </table>
          `;
        }
        break;

      case 'pendiente':
        statusIcon = '⏳';
        buttonColor = '#ffc107';
        subject = isBarter ? 'Procesamiento de Pago - Servicio de Trueque | CasanareServ' : 'Procesamiento de Pago - Su Compra | CasanareServ';
        buttonText = isBarter ? 'Ver Estado del Trueque' : 'Verificar Estado';
        emailContent = `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #ffc107; border-radius: 20px; display: inline-block;">
                  <tr>
                    <td style="padding: 8px 16px; color: #212529; font-weight: 600; font-size: 14px;">
                      ${statusIcon} EN PROCESAMIENTO
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <h2 style="color: #333; margin: 25px 0 20px 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-align: center;">
                  Su pago está siendo verificado
                </h2>
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                  Estimado ${isBarter ? 'usuario' : 'cliente'}, hemos recibido su solicitud de pago. 
                  Actualmente se encuentra en proceso de verificación por parte de nuestra entidad financiera.
                </p>
              </td>
            </tr>
          </table>
          
          ${productsList}
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; margin: 25px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6;">
                  <strong>⏰ Tiempo Estimado:</strong><br>
                  El proceso de verificación puede tomar entre 5 a 15 minutos. Le notificaremos inmediatamente 
                  cuando el pago sea confirmado.
                </p>
              </td>
            </tr>
          </table>
        `;
        break;

      case 'fallida':
        statusIcon = '❌';
        buttonColor = '#dc3545';
        subject = isBarter ? 'Pago No Procesado - Servicio de Trueque | CasanareServ' : 'Pago No Procesado - Su Compra | CasanareServ';
        buttonText = 'Intentar Nuevamente';
        emailContent = `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #dc3545; border-radius: 20px; display: inline-block;">
                  <tr>
                    <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 14px;">
                      ${statusIcon} PAGO NO PROCESADO
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <h2 style="color: #333; margin: 25px 0 20px 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-align: center;">
                  No pudimos procesar su pago
                </h2>
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                  Estimado ${isBarter ? 'usuario' : 'cliente'}, lamentamos informar que su pago no pudo ser procesado.
                </p>
              </td>
            </tr>
          </table>
          
          ${productsList}
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8d7da; border-left: 4px solid #dc3545; border-radius: 8px; margin: 25px 0;">
            <tr>
              <td style="padding: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #721c24; font-size: 16px;">💡 Recomendaciones</h4>
                <ul style="margin: 0; color: #721c24; line-height: 1.6; padding-left: 20px;">
                  <li>Verifique que los datos de su tarjeta sean correctos</li>
                  <li>Asegúrese de tener fondos suficientes disponibles</li>
                  <li>Contacte a su banco si el problema persiste</li>
                  <li>Intente con otro método de pago disponible</li>
                </ul>
              </td>
            </tr>
          </table>
        `;
        break;

      case 'reembolsada':
        statusIcon = '💰';
        buttonColor = '#17a2b8';
        subject = 'Reembolso Procesado Exitosamente | CasanareServ';
        buttonText = 'Ver Detalles';
        emailContent = `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="text-align: center; padding: 20px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #17a2b8; border-radius: 20px; display: inline-block;">
                  <tr>
                    <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 14px;">
                      ${statusIcon} REEMBOLSO PROCESADO
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <h2 style="color: #333; margin: 25px 0 20px 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-align: center;">
                  Su reembolso ha sido procesado exitosamente
                </h2>
                <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
                  Estimado ${isBarter ? 'usuario' : 'cliente'}, le confirmamos que el reembolso ha sido procesado.
                </p>
              </td>
            </tr>
          </table>
          
          ${productsList}
          
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #d1ecf1; border-left: 4px solid #17a2b8; border-radius: 8px; margin: 25px 0;">
            <tr>
              <td style="padding: 20px;">
                <p style="margin: 0; color: #0c5460; font-size: 15px; line-height: 1.6;">
                  <strong>🏦 Tiempo de Acreditación:</strong><br>
                  El monto será acreditado en su cuenta según las políticas de su entidad financiera. 
                  Generalmente toma entre 3 a 5 días hábiles.
                </p>
              </td>
            </tr>
          </table>
        `;
        break;
    }

    // ✅ PLANTILLA PRINCIPAL OPTIMIZADA PARA OUTLOOK
    const emailHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${subject}</title>
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
      <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: Arial, sans-serif; line-height: 1.6;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f6f9;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px;">
                
                <!-- Header -->
                <tr>
                  <td style="background: #667eea; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      CasanareServ
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e6e9ff; font-size: 14px;">
                      Tu plataforma de confianza para compras y trueques
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    ${emailContent}
                    
                    <!-- Action Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center; padding: 35px 0;">
                          ${createOutlookCompatibleButton(
      buttonText,
      isBarter ? `${FRONTEND_URL}/user-profile?tab=trueques` : `${FRONTEND_URL}/user-profile?tab=compras`,
      buttonColor
    )}
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Support Section -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 16px;">¿Necesita Ayuda?</h4>
                          <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.5;">
                            Nuestro equipo de soporte está disponible las 24 horas<br>
                            <a href="mailto:soporte@casanareserv.me" style="color: #007bff; text-decoration: none;">soporte@casanareserv.me</a> | 
                            <a href="tel:+573001234567" style="color: #007bff; text-decoration: none;">+57 300 123 4567</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 12px; line-height: 1.4;">
                      Este es un mensaje automático generado por el sistema. Por favor no responda a este correo.
                    </p>
                    <p style="margin: 0; color: #adb5bd; font-size: 11px;">
                      © ${new Date().getFullYear()} CasanareServ. Todos los derechos reservados.<br>
                      Casanare, Colombia
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // ✅ CREAR MENSAJE OPTIMIZADO
    const msg = {
      to,
      from: {
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject,
      text: `
        ${subject}
        
        Estimado ${isBarter ? 'usuario' : 'cliente'},
        
        ${status === 'completada' ? 'Su pago ha sido procesado exitosamente.' :
          status === 'pendiente' ? 'Su pago está siendo procesado.' :
            status === 'fallida' ? 'Su pago no pudo ser procesado.' :
              'Su reembolso ha sido procesado.'}
        
        Detalles:
        - Referencia: ${transactionInfo.reference}
        - Monto: ${formattedAmount}
        - Fecha: ${formattedDate}
        - Estado: ${status}
        
        Para más información, visite: ${FRONTEND_URL}
        
        Atentamente,
        Equipo CasanareServ
      `,
      html: emailHTML,
      headers: {
        'X-Mailer': 'CasanareServ Notification System',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal'
      },
      categories: [
        isBarter ? 'barter-notification' : 'payment-notification',
        status === 'completada' ? 'transaction-success' :
          status === 'pendiente' ? 'transaction-pending' :
            status === 'fallida' ? 'transaction-failed' : 'transaction-refund'
      ],
      customArgs: {
        transaction_type: isBarter ? 'barter' : 'purchase',
        transaction_status: status,
        reference: transactionInfo.reference
      }
    };

    return sgMail
      .send(msg)
      .then((response) => {
        console.log(`✅ Email compatible con Outlook enviado correctamente`);
        console.log(`📊 Status: ${response[0].statusCode}, Message ID: ${response[0].headers['x-message-id']}`);
        return true;
      })
      .catch((error) => {
        console.error(`❌ Error al enviar email compatible con Outlook`);
        if (error.response) {
          console.error(`📊 Status: ${error.response.statusCode}`);
          console.error(`📋 Body:`, error.response.body);
        } else {
          console.error(`💥 Error:`, error.message);
        }
        return false;
      });
  } catch (error: any) {
    console.error('❌ Error general al preparar email compatible con Outlook:', error);
    return false;
  }
}
/**
 * Envía un correo de notificación al vendedor cuando le compran un producto
 */
async function sendSellerNotificationEmail(
  sellerEmail: string,
  sellerName: string,
  buyerName: string,
  transactionInfo: any
): Promise<boolean> {
  try {
    console.log('🚀 Enviando notificación de venta al vendedor:', sellerEmail);

    // Formatear monto y fecha
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(transactionInfo.amount);

    const formattedDate = new Date(transactionInfo.date).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });

    // ✅ FUNCIÓN PARA CREAR BOTONES COMPATIBLES CON OUTLOOK
    function createOutlookCompatibleButton(text: string, url: string, backgroundColor: string): string {
      return `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 6px; background: ${backgroundColor};">
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
                        padding: 12px 25px; 
                        display: block; 
                        border-radius: 6px;">
                ${text}
              </a>
            </td>
          </tr>
        </table>
      `;
    }

    // ✅ CONSTRUIR LISTA DE PRODUCTOS PROFESIONAL
    let productsList = '';
    let totalEarnings = 0;

    if (transactionInfo.products && transactionInfo.products.length > 0) {
      productsList = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0;">
          <tr>
            <td style="padding: 0;">
              <h3 style="color: #333; margin-bottom: 15px; font-size: 18px; font-weight: 600;">
                📦 Productos Vendidos
              </h3>
              ${transactionInfo.products.map((product: any) => {
        const productTotal = product.price * product.quantity;
        totalEarnings += productTotal;

        return `
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #ffffff; border: 1px solid #e9ecef; border-radius: 8px; margin: 10px 0;">
                    <tr>
                      <td style="padding: 15px;">
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td style="width: 80%;">
                              <h4 style="margin: 0; color: #28a745; font-size: 16px;">
                                ✅ ${product.name}
                              </h4>
                            </td>
                            <td style="width: 20%; text-align: right;">
                              <span style="background: #28a745; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                VENDIDO
                              </span>
                            </td>
                          </tr>
                        </table>
                        
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 15px 0;">
                          <tr>
                            <td style="font-size: 14px; color: #666; width: 50%;">
                              <strong>Cantidad:</strong><br>
                              <span style="color: #28a745; font-weight: 600;">${product.quantity} unidades</span>
                            </td>
                            <td style="font-size: 14px; color: #666; width: 50%;">
                              <strong>Precio unitario:</strong><br>
                              <span style="color: #28a745; font-weight: 600;">${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(product.price)}</span>
                            </td>
                          </tr>
                        </table>
                        
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid #e9ecef; padding-top: 15px; margin-top: 15px;">
                          <tr>
                            <td style="text-align: right;">
                              <span style="font-size: 16px; color: #155724; font-weight: 700;">
                                Total ganado: ${new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0
        }).format(productTotal)}
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                `;
      }).join('')}
            </td>
          </tr>
        </table>
      `;
    }

    // ✅ PLANTILLA PRINCIPAL OPTIMIZADA PARA OUTLOOK
    const emailHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Nueva Venta Realizada - CasanareServ</title>
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
      <body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: Arial, sans-serif; line-height: 1.6;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f6f9;">
          <tr>
            <td style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px;">
                
                <!-- Header -->
                <tr>
                  <td style="background: #28a745; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                      CasanareServ
                    </h1>
                    <p style="margin: 8px 0 0 0; color: #e6fff2; font-size: 14px;">
                      Notificación de Venta para Vendedores
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center; padding: 20px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background: #28a745; border-radius: 20px; display: inline-block;">
                            <tr>
                              <td style="padding: 8px 16px; color: white; font-weight: 600; font-size: 16px;">
                                🎉 ¡NUEVA VENTA REALIZADA!
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <h2 style="color: #333; margin: 25px 0 20px 0; font-size: 24px; font-weight: 700; line-height: 1.3; text-align: center;">
                            ¡Felicidades ${sellerName}! Has realizado una venta exitosa
                          </h2>
                          <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
                            Nos complace informarte que uno de tus productos ha sido <strong>comprado exitosamente</strong>. 
                            Tu negocio está creciendo en CasanareServ.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #d4edda; border-left: 4px solid #28a745; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h4 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">
                            📋 Detalles de la Venta
                          </h4>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="font-size: 14px; padding: 5px 0; width: 50%;">
                                <strong>Comprador:</strong><br>
                                <span style="color: #155724; font-weight: 600;">${buyerName}</span>
                              </td>
                              <td style="font-size: 14px; padding: 5px 0; width: 50%;">
                                <strong>Referencia:</strong><br>
                                <span style="font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 4px;">${transactionInfo.reference}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="font-size: 14px; padding: 5px 0;">
                                <strong>Fecha de compra:</strong><br>
                                <span style="color: #155724;">${formattedDate}</span>
                              </td>
                              <td style="font-size: 14px; padding: 5px 0;">
                                <strong>Método de pago:</strong><br>
                                <span style="color: #155724;">${transactionInfo.paymentMethod || 'PayU'}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    ${productsList}

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #e8f5e8; border: 2px solid #28a745; border-radius: 12px; margin: 25px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <h3 style="margin: 0 0 10px 0; color: #155724; font-size: 20px;">💰 Total de Ganancias</h3>
                          <div style="font-size: 28px; font-weight: 700; color: #28a745; margin: 10px 0;">
                            ${formattedAmount}
                          </div>
                          <p style="margin: 10px 0 0 0; color: #155724; font-size: 14px;">
                            Esta cantidad será procesada según los términos de CasanareServ
                          </p>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h4 style="margin: 0 0 15px 0; color: #856404; font-size: 18px;">
                            📦 Próximos Pasos Importantes
                          </h4>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                                <h5 style="margin: 0 0 8px 0; color: #856404;">🚀 Preparación</h5>
                                <ul style="margin: 0; color: #856404; line-height: 1.6; padding-left: 15px; font-size: 14px;">
                                  <li>Prepara el producto para envío</li>
                                  <li>Verifica la calidad del producto</li>
                                  <li>Empaqueta de forma segura</li>
                                </ul>
                              </td>
                              <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                                <h5 style="margin: 0 0 8px 0; color: #856404;">📞 Comunicación</h5>
                                <ul style="margin: 0; color: #856404; line-height: 1.6; padding-left: 15px; font-size: 14px;">
                                  <li>Coordina la entrega con ${buyerName}</li>
                                  <li>Mantén comunicación activa</li>
                                  <li>Actualiza el estado del pedido</li>
                                </ul>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Action Buttons -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center; padding: 35px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                            <tr>
                              <td style="padding: 0 5px;">
                                ${createOutlookCompatibleButton('📊 Ver Mis Ventas', `${FRONTEND_URL}/user-profile?tab=vendidas`, '#28a745')}
                              </td>
                              <td style="padding: 0 5px;">
                                ${createOutlookCompatibleButton('💬 Contactar Comprador', `${FRONTEND_URL}/messages`, '#007bff')}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Support Section -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <h4 style="margin: 0 0 10px 0; color: #495057; font-size: 16px;">🛠️ Soporte para Vendedores</h4>
                          <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.5;">
                            ¿Necesitas ayuda con tu venta? Nuestro equipo está disponible 24/7<br>
                            <a href="mailto:vendedores@casanareserv.me" style="color: #28a745; text-decoration: none; font-weight: 600;">vendedores@casanareserv.me</a> | 
                            <a href="tel:+573001234567" style="color: #28a745; text-decoration: none; font-weight: 600;">+57 300 123 4567</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Success Stats -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: #fff8e1; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px; text-align: center;">
                          <h4 style="margin: 0 0 10px 0; color: #ff8f00; font-size: 16px;">🎯 ¡Sigue Así!</h4>
                          <p style="margin: 0; color: #ef6c00; font-size: 14px;">
                            Cada venta te acerca más a ser un vendedor estrella en CasanareServ.<br>
                            <strong>¡Gracias por confiar en nosotros!</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 12px; line-height: 1.4;">
                      Este es un mensaje automático generado por una venta exitosa. Por favor no responda a este correo.
                    </p>
                    <p style="margin: 0; color: #adb5bd; font-size: 11px;">
                      © ${new Date().getFullYear()} CasanareServ. Todos los derechos reservados.<br>
                      Casanare, Colombia
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // ✅ CREAR MENSAJE OPTIMIZADO
    const msg = {
      to: sellerEmail,
      from: {
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ Ventas'
      },
      subject: `🎉 ¡Nueva venta realizada por ${formattedAmount}! - CasanareServ`,
      text: `
        ¡Felicidades ${sellerName}!
        
        Has realizado una nueva venta en CasanareServ:
        
        - Comprador: ${buyerName}
        - Monto total: ${formattedAmount}
        - Referencia: ${transactionInfo.reference}
        - Fecha: ${formattedDate}
        
        Para ver más detalles, visita: ${FRONTEND_URL}/user-profile?tab=vendidas
        
        ¡Gracias por vender en CasanareServ!
      `,
      html: emailHTML,
      headers: {
        'X-Mailer': 'CasanareServ Seller Notification System',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'Importance': 'Normal'
      },
      categories: [
        'seller-notification',
        'sale-success',
        'vendor-alert'
      ],
      customArgs: {
        notification_type: 'seller_sale',
        seller_email: sellerEmail,
        buyer_name: buyerName,
        transaction_reference: transactionInfo.reference,
        sale_amount: transactionInfo.amount.toString()
      }
    };

    return sgMail
      .send(msg)
      .then((response) => {
        console.log('✅ Email compatible con Outlook enviado correctamente al vendedor');
        console.log(`📊 Status: ${response[0].statusCode}`);
        return true;
      })
      .catch((error) => {
        console.error('❌ Error al enviar email compatible con Outlook al vendedor');
        if (error.response) {
          console.error(`📊 Status: ${error.response.statusCode}`);
          console.error(`📋 Body:`, error.response.body);
        } else {
          console.error(`💥 Error:`, error.message);
        }
        return false;
      });
  } catch (error: any) {
    console.error('❌ Error general al preparar email compatible con Outlook del vendedor:', error);
    return false;
  }
}
/**
 * Guarda una notificación interna en el sistema
 */
async function saveInternalNotification(
  userId: number,
  title: string,
  message: string,
  type: string,
  entityType?: string,
  entityId?: number
): Promise<void> {
  try {
    const notificationData: any = {
      id_user: userId,
      title,
      message,
      type,
      entity_type: entityType || 'system', // ✅ MANTENER VALOR POR DEFECTO
      entity_id: entityId || 0, // ✅ MANTENER VALOR POR DEFECTO
      is_read: false,
      created_at: new Date()
    };

    console.log('📨 Creando notificación:', notificationData); // ✅ MANTENER LOG

    await Notification.create(notificationData);
    console.log(`✅ Notificación creada para usuario ${userId}: ${title}`);
  } catch (error) {
    console.error('❌ Error al crear notificación interna:', error);
  }
}
/**
 * Inicia una transacción de pago con PayU
 * POST /api/payment/create
 */
export const createPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.userId || req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        msg: 'Usuario no autenticado'
      });
      return;
    }

    // Extraer datos necesarios
    const { id_cart, delivery_address_id } = req.body;

    // Obtener información del usuario
    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        data: {
          code: 'ERROR',
          error: 'Usuario no encontrado',
          transactionResponse: null
        }
      });
      return;
    }

    // Obtener información del carrito y calcular monto total
    const cart = await Cart.findOne({
      where: { id_cart, id_user: userId },
      include: [
        {
          model: ItemCart,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        },
        {
          model: User,
          as: 'cartUser'
        }
      ]
    });

    if (!cart) {
      res.status(404).json({
        success: false,
        data: {
          code: 'ERROR',
          error: 'Carrito no encontrado',
          transactionResponse: null
        }
      });
      return;
    }

    // Calcular montos - Corregido para usar get() y definir tipos
    const items = cart.get('items') as any[];
    const subtotal = items.reduce((sum: number, item: any) => {
      const product = item.get('product');
      const price = product ? product.get('price') : 0;
      return sum + (price * item.get('quantity'));
    }, 0);

    const shipping = 10000; // Valor fijo de envío
    const tax = subtotal * 0.19; // IVA 19%
    const total = subtotal + shipping + tax;

    // Generar referencia única
    const reference = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Asegurarnos de usar los tipos correctos para Transaction
    let mappedStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';

    // Crear transacción en la base de datos con el estado correcto
    const transaction = await Transaction.create({
      id_user: userId,
      id_cart,
      delivery_address_id,
      status: mappedStatus,
      reference,
      total_amount: total, // Cambia amount por total_amount
      currency: 'COP',
      payment_method: req.body.paymentMethod || 'CREDIT_CARD',
      transaction_date: new Date() // Usa transaction_date en lugar de created_at
    } as any); // Usar 'as any' temporalmente mientras arreglas los tipos

    // En entorno de desarrollo, usar configuración de sandbox
    const payuConfig = {
      apiKey: 'your_payu_api_key',         // Reemplaza con tu API Key de PayU Sandbox
      apiLoginKey: 'your_payu_login_key',  // Reemplaza con tu Login Key de PayU Sandbox
      merchantId: 'your_merchant_id',      // Reemplaza con tu Merchant ID de PayU Sandbox
      accountId: 'your_account_id',        // Reemplaza con tu Account ID de PayU Sandbox
      isTest: true,                        // true para Sandbox, false para producción
      paymentUrl: 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi'
    };

    // En un entorno real, aquí harías la solicitud HTTP a PayU
    // Para sandbox, simulamos la respuesta exitosa

    // Respuesta simulada de PayU para redirección
    const payuResponse = {
      success: true,
      transactionId: transaction.get('id_transaction'),
      data: {
        code: 'SUCCESS',
        transactionResponse: {
          orderId: reference,
          transactionId: `PAY-TX-${Date.now()}`,
          state: 'PENDING',
          paymentNetworkResponseCode: 'PENDING_TRANSACTION_CONFIRMATION',
          responseCode: 'PENDING_TRANSACTION_CONFIRMATION',
          responseMessage: 'Transacción pendiente de aprobación',
          trazabilityCode: `TR-${Date.now()}`,
          authorizationCode: `AUTH-${Math.floor(Math.random() * 10000)}`,
          pendingReason: 'PENDING_REVIEW',
          extraParameters: {
            URL_PAYMENT_REDIRECT: `https://casanareserv.me/payment-sandbox?ref=${reference}&amount=${total}`
            //URL_PAYMENT_REDIRECT: `https://casanareserv.me/payment-sandbox?ref=${reference}&amount=${total}`
          }
        }
      }
    };

    res.json(payuResponse);
  } catch (error) {
    console.error('Error al procesar pago:', error);
    res.status(500).json({
      success: false,
      data: {
        code: 'ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
        transactionResponse: null
      }
    });
  }
};
/**
 * Maneja la respuesta cuando el usuario regresa de PayU (PRODUCTOS NORMALES)
 * GET /api/transaction/payu-response
 */
export const payuResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 USUARIO REGRESÓ DE PAYU (PRODUCTOS):', req.query);

    // ✅ DECLARAR userId AL INICIO
    let userId: number | null = null;

    // Obtener parámetros de la URL que PayU envía
    const {
      referenceCode,
      reference_sale,
      transactionState,
      lapTransactionState,
      polTransactionState,
      TX_VALUE,
      currency,
      transactionId,
      transaction_id,
      state_pol,
      response_code_pol,
      lapResponseCode,
      polResponseCode,
      response_message_pol,
      signature,
      merchantId
    } = req.query;

    // Obtener referencia con cualquier nombre que PayU envíe
    const reference = (referenceCode || reference_sale) as string;

    // Obtener estado con cualquier nombre que PayU envíe
    const state = (transactionState || lapTransactionState || polTransactionState || state_pol) as string;
    const txId = (transactionId || transaction_id) as string;

    console.log(`🔍 Procesando respuesta para referencia: ${reference}, estado: ${state}`);

    if (!reference) {
      console.error('❌ No se recibió referencia en respuesta de PayU');
      const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
      return res.redirect(`${frontendUrl}/payment-response?error=no_reference`);
    }

    // Buscar transacción en la base de datos
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference }
    });

    if (!transaction) {
      console.error(`❌ Transacción no encontrada: ${reference}`);
      const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
      return res.redirect(`${frontendUrl}/payment-response?error=transaction_not_found&reference=${reference}`);
    }

    // ✅ ASIGNAR userId AQUÍ, DESPUÉS DE ENCONTRAR LA TRANSACCIÓN
    userId = transaction.get('id_user') as number;

    console.log(`📊 Estado actual de la transacción: ${transaction.get('status')}`);
    console.log(`📊 Estado recibido de PayU: ${state}`);

    // Mapear estado de PayU a estado interno (IGUAL QUE EN BARTER)
    let dbStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';

    switch (state) {
      case '4':     // Aprobado
      case 'APPROVED':
      case 'APPROVAL':
        dbStatus = 'completada';
        break;
      case '6':     // Rechazado
      case '5':     // Expirado
      case 'DECLINED':
      case 'EXPIRED':
      case 'REJECTED':
        dbStatus = 'fallida';
        break;
      case '7':     // Pendiente
      case 'PENDING':
        dbStatus = 'pendiente';
        break;
      case '11':    // Reembolsada
      case 'REFUNDED':
        dbStatus = 'reembolsada';
        break;
      default:
        // En desarrollo, si no reconoce el estado pero viene de la pasarela, asumir completada
        if (process.env.NODE_ENV !== 'production') {
          console.log(`⚠️ Estado no reconocido en sandbox, forzando a completada: ${state}`);
          dbStatus = 'completada';
        } else {
          dbStatus = 'pendiente';
        }
        break;
    }

    console.log(`🔄 Estado determinado: ${dbStatus}`);

    // Actualizar estado si es necesario
    const oldStatus = transaction.get('status');
    if (oldStatus !== dbStatus) {
      console.log(`🔄 Actualizando transacción de ${oldStatus} a ${dbStatus}`);

      // Preparar datos de actualización
      const updateData: any = {
        status: dbStatus
      };

      // Solo agregar campos si tienen valores válidos
      if (txId) {
        updateData.payu_transaction_id = txId;
      }

      if (state) {
        updateData.payu_state = state;
      }

      if (response_code_pol || polResponseCode) {
        updateData.payu_response_code = (response_code_pol || polResponseCode) as string;
      }

      if (response_message_pol) {
        updateData.payu_response_message = response_message_pol as string;
      }

      // Actualizar la transacción
      await transaction.update(updateData);

      // Si se completó el pago, actualizar el carrito y stock
      if (dbStatus === 'completada') {
        const cartId = transaction.get('id_cart') as number;

        if (cartId) {
          console.log(`🛒 Actualizando carrito ${cartId} a "comprado"`);

          // Marcar el carrito como comprado
          await Cart.update(
            { status: 'comprado' },
            { where: { id_cart: cartId } }
          );

          // Actualizar stock de productos
          await updateStockAfterPayment(transaction);

          console.log('✅ Carrito y stock actualizados');
        }

        // ✅ CORREGIDO: VERIFICAR SI ES TRANSACCIÓN DE TRUEQUE
        const barterId = transaction.get('id_barter') as number | null;
        if (barterId) {
          console.log(`🔄 Transacción de trueque completada vía respuesta - Actualizando barter ${barterId}`);
          await updateBarterPaymentStatus(transaction);

          // ✅ CORREGIDO: ENVIAR EMAIL DE TRUEQUE AL USUARIO (userId ya está definido)
          try {
            const user = await User.findByPk(userId);
            if (user && user.get('email')) {
              await sendPaymentNotificationEmail(
                user.get('email') as string,
                dbStatus,
                {
                  reference,
                  amount: transaction.get('total_amount'),
                  date: transaction.get('transaction_date'),
                  paymentMethod: 'Servicio de trueque',
                  message: response_message_pol as string || '',
                  products: [{
                    name: 'Servicio de trueque',
                    quantity: 1,
                    price: transaction.get('total_amount'),
                    total: transaction.get('total_amount')
                  }]
                }
              );
              console.log(`📧 Email de trueque enviado a ${user.get('email')}`);
            }
          } catch (emailError) {
            console.error('❌ Error enviando email de trueque:', emailError);
          }
        }
      }

      // ✅ ENVIAR NOTIFICACIÓN AL USUARIO (userId ya está definido)
      if (userId) {
        let notificationTitle = '';
        let notificationMessage = '';

        switch (dbStatus) {
          case 'completada':
            notificationTitle = '🎉 ¡Pago confirmado!';
            notificationMessage = `Tu pago ha sido confirmado exitosamente. Referencia: ${reference}`;
            break;
          case 'fallida':
            notificationTitle = '❌ Pago rechazado';
            notificationMessage = `Tu pago ha sido rechazado. Referencia: ${reference}`;
            break;
          case 'pendiente':
            notificationTitle = '⏳ Pago en proceso';
            notificationMessage = `Tu pago está siendo procesado. Referencia: ${reference}`;
            break;
        }

        if (notificationTitle) {
          await saveInternalNotification(
            userId,
            notificationTitle,
            notificationMessage,
            'payment'
          );

          // Enviar email al usuario (solo para productos normales, no trueques)
          const barterId = transaction.get('id_barter') as number | null;
          if (!barterId) { // ✅ Solo enviar email de productos si NO es trueque
            try {
              const user = await User.findByPk(userId);
              if (user && user.get('email')) {
                // Obtener productos del carrito para el email
                const cartId = transaction.get('id_cart') as number;
                let products: any[] = [];

                if (cartId) {
                  const cartItems = await ItemCart.findAll({
                    where: { id_cart: cartId },
                    include: [{ model: Product, as: 'product' }]
                  });

                  products = cartItems.map((item: any) => ({
                    name: item.get('product')?.get('name') || 'Producto',
                    quantity: item.get('quantity') || 1,
                    price: item.get('price') || item.get('product')?.get('price') || 0
                  }));
                }

                await sendPaymentNotificationEmail(
                  user.get('email') as string,
                  dbStatus,
                  {
                    reference,
                    amount: transaction.get('total_amount'),
                    date: transaction.get('transaction_date'),
                    paymentMethod: transaction.get('payment_method'),
                    products: products
                  }
                );
                console.log(`📧 Email de productos enviado a ${user.get('email')}`);
              }
            } catch (emailError) {
              console.error('❌ Error enviando email de productos:', emailError);
            }
          }
        }
      }

      // ✅ NOTIFICAR A VENDEDORES SI SE COMPLETÓ (solo para productos normales)
      if (dbStatus === 'completada') {
        const barterId = transaction.get('id_barter') as number | null;

        if (!barterId) { // ✅ Solo notificar vendedores si NO es trueque
          console.log('💰 PAGO COMPLETADO - PROCESANDO NOTIFICACIONES A VENDEDORES');

          try {
            const cartId = transaction.get('id_cart') as number;

            if (cartId) {
              // Obtener items del carrito con vendedores
              const cartItems = await ItemCart.findAll({
                where: { id_cart: cartId },
                include: [
                  {
                    model: Product,
                    as: 'product',
                    include: [
                      {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                      }
                    ]
                  }
                ]
              });

              // Agrupar productos por vendedor
              const sellerProducts = new Map<number, { seller: any; products: any[] }>();

              for (const item of cartItems) {
                const product = item.get('product') as any;
                const seller = product?.get('user');

                if (seller) {
                  const sellerId = seller.get('id') as number;

                  if (!sellerProducts.has(sellerId)) {
                    sellerProducts.set(sellerId, {
                      seller: seller,
                      products: []
                    });
                  }

                  sellerProducts.get(sellerId)!.products.push({
                    name: product.get('name'),
                    quantity: item.get('quantity'),
                    price: item.get('price') || product.get('price'),
                    productId: product.get('id_product')
                  });
                }
              }

              // Enviar notificaciones a cada vendedor
              for (const [sellerId, data] of sellerProducts) {
                const seller = data.seller;
                const products = data.products;

                const totalForSeller = products.reduce((sum: number, p: any) =>
                  sum + (Number(p.price) * Number(p.quantity)), 0
                );

                console.log(`📧 Notificando al vendedor ${seller.get('name')} (ID: ${sellerId})`);

                // Enviar email al vendedor
                if (seller.get('email')) {
                  try {
                    const buyerUser = await User.findByPk(userId!);

                    await sendSellerNotificationEmail(
                      seller.get('email'),
                      seller.get('name'),
                      buyerUser?.get('name') as string || 'Cliente',
                      {
                        reference: reference,
                        amount: totalForSeller,
                        date: transaction.get('transaction_date'),
                        paymentMethod: transaction.get('payment_method'),
                        products: products
                      }
                    );
                    console.log(`✅ Email enviado al vendedor: ${seller.get('email')}`);
                  } catch (sellerEmailError) {
                    console.error(`❌ Error enviando email al vendedor:`, sellerEmailError);
                  }
                }

                // Crear notificación interna al vendedor
                const productNames = products.map((p: any) => p.name).join(', ');
                const formattedAmount = new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP'
                }).format(totalForSeller);

                try {
                  await saveInternalNotification(
                    sellerId,
                    '🎉 ¡Nueva venta realizada!',
                    `Tu producto "${productNames}" ha sido comprado por ${formattedAmount}. Referencia: ${reference}`,
                    'sale_notification',
                    'transaction',
                    transaction.get('id_transaction') as number
                  );
                  console.log(`✅ Notificación interna creada para vendedor ID: ${sellerId}`);
                } catch (sellerNotificationError) {
                  console.error(`❌ Error creando notificación para vendedor:`, sellerNotificationError);
                }
              }
            }
          } catch (sellerNotificationError) {
            console.error('❌ Error general al notificar vendedores:', sellerNotificationError);
          }
        }
      }
    } else {
      console.log(`ℹ️ Estado no cambió (${oldStatus}), no se requiere actualización`);
    }

    // Redirigir al frontend con el resultado
    const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
    const redirectUrl = `${frontendUrl}/payu-response?` +
      `reference=${reference}&` +
      `status=${dbStatus}&` +
      `transactionId=${txId || ''}&` +
      `amount=${TX_VALUE || transaction.get('total_amount')}&` +
      `timestamp=${Date.now()}`;

    console.log(`🔗 Redirigiendo a: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Error procesando respuesta de PayU:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
    res.redirect(`${frontendUrl}/payment-response?error=processing_error&timestamp=${Date.now()}`);
  }
};
// Función auxiliar para actualizar stock después del pago (CÓPIALA DE BARTER)
async function updateStockAfterPayment(transaction: any): Promise<void> {
  try {
    const cartId = transaction.get('id_cart');

    if (!cartId) {
      console.warn('⚠️ Transacción sin carrito asociado');
      return;
    }

    console.log(`📦 Actualizando stock para carrito ${cartId}`);

    // Obtener items del carrito con productos
    const cartItems = await ItemCart.findAll({
      where: { id_cart: cartId },
      include: [
        {
          model: Product,
          as: 'product'
        }
      ]
    });

    console.log(`📦 Encontrados ${cartItems.length} items para actualizar stock`);

    for (const item of cartItems) {
      try {
        const product = item.get('product') as any;
        if (!product) {
          console.warn(`⚠️ Item sin producto: ${item.get('id_item')}`);
          continue;
        }

        const currentStock = product.get('stock') as number;
        const quantity = item.get('quantity') as number;
        const productId = product.get('id_product') as number;

        console.log(`📦 ANTES - Producto ${productId}: Stock ${currentStock}, Vendidos ${quantity}`);

        if (currentStock >= quantity) {
          const newStock = currentStock - quantity;

          await Product.update(
            {
              stock: newStock,
              status: newStock === 0 ? 'vendido' : 'disponible'
            },
            { where: { id_product: productId } }
          );

          console.log(`📦 DESPUÉS - Producto ${productId}: Stock ${newStock}`);
        } else {
          console.error(`❌ Stock insuficiente para producto ${productId}`);
        }
      } catch (itemError) {
        console.error(`❌ Error actualizando item:`, itemError);
      }
    }
    console.log(`✅ Stock actualizado correctamente`);
  } catch (error) {
    console.error('❌ Error actualizando stock:', error);
  }
  // ✅ AGREGAR: ACTUALIZAR ESTADO DE PAGO DEL BARTER
  const barterId = transaction.get('id_barter') as number;
  if (barterId) {
    console.log(`🔄 Transacción de trueque completada vía notificación - Actualizando barter ${barterId}`);
    // await updateBarterPaymentStatus(transaction);
  }
}
/**
 * Maneja las notificaciones de pago enviadas por PayU (webhook)
 * Procesa el estado del pago y envía notificaciones correspondientes a compradores y vendedores
 */
export const paymentNotification = async (req: Request, res: Response) => {
  try {
    console.log('Notificación de PayU recibida:', req.body);

    // PayU puede enviar notificaciones en formato form o JSON
    const data = req.body;

    // Validar que la notificación venga de PayU (firma)
    // En producción debes validar la firma con el merchant_id, referencia y estado

    // Obtener referencia de la transacción
    const reference = data.reference_sale || data.referenceCode;
    if (!reference) {
      console.error('Notificación sin referencia');
      return res.status(400).send('FAILED: No reference code');
    }

    // Buscar la transacción por referencia
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference },
      include: [
        { model: Cart, as: 'cartInfo' },
        { model: User, as: 'transactionUser' }
      ]
    });

    if (!transaction) {
      console.error('Transacción no encontrada:', reference);
      return res.status(404).send('FAILED: Transaction not found');
    }

    // Obtener el usuario y el carrito para las notificaciones
    const user = transaction.get('transactionUser') as any;
    const cart = transaction.get('cartInfo') as any;

    // Actualizar estado según la notificación
    // Códigos de estado: https://developers.payulatam.com/latam/es/docs/integrations/webcheckout-integration/response-codes.html
    let newStatus = 'pendiente';

    // status_pol para Colombia o status para otros países
    const payuStatus = data.status_pol || data.status || data.state_pol;

    switch (payuStatus) {
      case '4': // Aprobado
      case 'APPROVED':
        newStatus = 'completada';
        break;
      case '5': // Expirado
      case '6': // Rechazado
      case 'DECLINED':
      case 'EXPIRED':
        newStatus = 'fallida';
        break;
      case '7': // Pendiente
      case 'PENDING':
        newStatus = 'pendiente';
        break;
    }

    // Actualizar transacción
    await transaction.update({
      status: newStatus as 'pendiente' | 'completada' | 'fallida' | 'reembolsada',
      payment_method: data.payment_method_name || data.payment_method || transaction.get('payment_method')
    });

    // Solo enviar notificaciones si el estado ha cambiado
    const oldStatus = transaction.get('status');
    if (oldStatus !== newStatus) {
      // Obtener los items del carrito para incluirlos en la notificación
      const cartItems = await ItemCart.findAll({
        where: { id_cart: cart.id_cart },
        include: [{ model: Product, as: 'product' }]
      });

      const productsList = cartItems.map((item: any) => ({
        name: item.get('product').get('name'),
        quantity: item.get('quantity'),
        price: item.get('unit_price') || item.get('product').get('price')
      }));

      // Preparar datos para la notificación
      const transactionInfo = {
        reference: reference,
        amount: transaction.get('total_amount'),
        date: transaction.get('transaction_date'),
        paymentMethod: transaction.get('payment_method'),
        message: payuStatus === 'PENDING' ? 'Transacción pendiente de aprobación' : data.response_message_pol || data.message || '', // ✅ CORRECTO
        products: productsList
      };

      // Enviar email según el estado
      if (user && user.email) {
        await sendPaymentNotificationEmail(user.email, newStatus, transactionInfo);
      }

      // Guardar notificación interna
      let notificationTitle = '';
      let notificationMessage = '';

      switch (newStatus) {
        case 'completada':
          notificationTitle = '¡Pago confirmado!'; // ✅ AGREGAR ESTA LÍNEA
          notificationMessage = `Tu pago por ${transaction.get('total_amount')} COP ha sido confirmado. Referencia: ${reference}`;
          break;
        case 'fallida':
          notificationTitle = 'Pago rechazado'; // ✅ YA ESTÁ
          notificationMessage = `Tu pago por ${transaction.get('total_amount')} COP ha sido rechazado. Referencia: ${reference}`;
          break;
        case 'pendiente':
          notificationTitle = 'Pago en proceso'; // ✅ YA ESTÁ
          notificationMessage = `Tu pago por ${transaction.get('total_amount')} COP está siendo procesado. Referencia: ${reference}`;
          break;
        case 'reembolsada':
          notificationTitle = 'Pago reembolsado'; // ✅ YA ESTÁ
          notificationMessage = `Tu pago por ${transaction.get('total_amount')} COP ha sido reembolsado. Referencia: ${reference}`;
          break;
      }

      await saveInternalNotification(
        transaction.get('id_user') as number,
        notificationTitle,
        notificationMessage,
        'payment'
      );

      // ✅ AGREGAR: NOTIFICAR A LOS VENDEDORES cuando el pago se complete
      if (newStatus === 'completada') {
        console.log('💰 PAGO COMPLETADO - NOTIFICANDO A VENDEDORES');
        const isBarterTransaction = transaction.get('id_barter') !== null && transaction.get('id_barter') !== undefined;

        if (isBarterTransaction) {
          console.log(`💰 [NOTIFICATION] Pago de trueque completado, actualizando estado del barter...`);
          await updateBarterPaymentStatus(transaction);
          console.log(`✅ [NOTIFICATION] Estado del barter actualizado`);
        }
        try {
          // Obtener todos los productos y sus vendedores
          const cartItems = await ItemCart.findAll({
            where: { id_cart: cart.id_cart },
            include: [
              {
                model: Product,
                as: 'product',
                include: [
                  {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                  }
                ]
              }
            ]
          });

          // Agrupar productos por vendedor
          const sellerProducts = new Map();

          for (const item of cartItems) {
            const product = item.get('product') as any;
            const seller = product?.get('user');

            if (seller) {
              const sellerId = seller.get('id');

              if (!sellerProducts.has(sellerId)) {
                sellerProducts.set(sellerId, {
                  seller: seller,
                  products: []
                });
              }

              sellerProducts.get(sellerId).products.push({
                name: product.get('name'),
                quantity: item.get('quantity'),
                price: item.get('price') || product.get('price'),
                productId: product.get('id_product')
              });
            }
          }

          // Enviar notificaciones a cada vendedor
          for (const [sellerId, data] of sellerProducts) {
            const seller = data.seller;
            const products = data.products;

            const totalForSeller = products.reduce((sum: number, p: any) =>
              sum + (p.price * p.quantity), 0
            );

            console.log(`📧 Notificando al vendedor ${seller.get('name')} (${seller.get('email')})`);

            // ✅ ENVIAR EMAIL AL VENDEDOR
            if (seller.get('email')) {
              await sendSellerNotificationEmail(
                seller.get('email'),
                seller.get('name'),
                user?.get('name') || 'Cliente',
                {
                  reference: reference,
                  amount: totalForSeller,
                  date: transaction.get('transaction_date'),
                  paymentMethod: transaction.get('payment_method'),
                  products: products
                }
              );
            }

            // ✅ CREAR NOTIFICACIÓN INTERNA AL VENDEDOR
            const productNames = products.map((p: any) => p.name).join(', ');
            const formattedAmount = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP'
            }).format(totalForSeller);

            await saveInternalNotification(
              sellerId,
              '🎉 ¡Has realizado una venta!',
              `Tu producto "${productNames}" ha sido comprado por ${formattedAmount}. Referencia: ${reference}`,
              'sale_notification',
              'transaction',
              transaction.get('id_transaction') as number
            );
          }
        } catch (sellerNotificationError) {
          console.error('❌ Error al notificar vendedores:', sellerNotificationError);
        }
      }
      // ✅ AGREGAR: DETECTAR Y ENVIAR EMAIL PARA TRUEQUES
      const isBarterTransaction = transaction.get('id_barter') !== null;

      if (isBarterTransaction && user && user.email) {
        console.log('📧 Enviando email específico para trueque');

        try {
          await sendPaymentNotificationEmail(user.email, newStatus, {
            reference: reference,
            amount: transaction.get('total_amount'),
            date: transaction.get('transaction_date'),
            paymentMethod: 'Servicio de trueque',
            message: data.response_message_pol || data.message || '',
            products: [{
              name: 'Servicio de trueque',
              quantity: 1,
              price: transaction.get('total_amount'),
              total: transaction.get('total_amount')
            }]
          });
          console.log(`📧 Email de trueque enviado desde notification a ${user.email}`);
        } catch (emailError) {
          console.error('❌ Error enviando email de trueque desde notification:', emailError);
        }
      }
    }
  } catch (error: any) {
    console.error('Error en notificación de pago:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error procesando notificación'
    });
  }
};
/**
 * Verifica el estado de un pago consultando a PayU y actualiza la base de datos
 * Maneja errores de conexión devolviendo el estado almacenado localmente
 */
export const checkPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el código de referencia'
      });
    }

    // Buscar en base de datos primero
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference },
      include: [
        {
          model: Cart,
          as: 'cartInfo',
          include: [
            {
              model: ItemCart,
              as: 'items',
              include: [{ model: Product, as: 'product' }]
            }
          ]
        },
        {
          model: User,
          as: 'transactionUser'
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    console.log(`📊 Estado actual de la transacción: ${transaction.get('status')}`);

    // Validar configuración
    if (!PAYU_API_KEY || !PAYU_API_LOGIN || !PAYU_MERCHANT_ID) {
      console.error('❌ Faltan credenciales de PayU');
      return res.status(500).json({
        success: false,
        message: 'Error de configuración de PayU'
      });
    }

    // ✅ USAR EL FORMATO CORRECTO SEGÚN LA DOCUMENTACIÓN
    const payload = {
      language: "es",
      command: "ORDER_DETAIL_BY_REFERENCE_CODE",
      merchant: {
        apiKey: PAYU_API_KEY,
        apiLogin: PAYU_API_LOGIN
      },
      details: {
        referenceCode: reference
      },
      test: process.env.NODE_ENV !== 'production'
    };

    console.log('📤 Enviando consulta a PayU:', JSON.stringify(payload, null, 2));
    console.log('🔗 URL de PayU:', PAYU_API_URL);

    try {
      const response = await axios.post(PAYU_API_URL as string, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('📥 Respuesta de PayU:', JSON.stringify(response.data, null, 2));

      // ✅ PROCESAR RESPUESTA EXITOSA
      if (response.data.code === 'SUCCESS') {
        const payuResult = response.data.result;

        if (payuResult && payuResult.payload) {
          let newStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';

          // Verificar el estado de la orden
          const orderStatus = payuResult.payload.status;
          console.log(`🔍 Estado en PayU: ${orderStatus}`);

          switch (orderStatus) {
            case 'CAPTURED':
            case 'APPROVED':
              newStatus = 'completada';
              break;
            case 'DECLINED':
            case 'EXPIRED':
            case 'CANCELLED':
              newStatus = 'fallida';
              break;
            case 'PENDING':
            default:
              newStatus = 'pendiente';
              break;
          }

          // Si hay cambio de estado, actualizar
          const oldStatus = transaction.get('status');
          if (oldStatus !== newStatus) {
            console.log(`🔄 Actualizando transacción de ${oldStatus} a ${newStatus}`);

            await transaction.update({
              status: newStatus,
              payu_transaction_id: payuResult.payload.transactions?.[0]?.id || null,
              payu_order_id: payuResult.payload.id || null,
              payu_state: orderStatus || null
            });

            // ✅ PROCESAR CAMBIO DE ESTADO
            if (newStatus === 'completada') {
              console.log('💰 PAGO CONFIRMADO - PROCESANDO ORDEN');
              // Aquí puedes agregar lógica adicional como actualizar stock, enviar emails, etc.
            }
          }

          return res.status(200).json({
            success: true,
            localStatus: false,
            data: {
              status: newStatus,
              paymentMethod: transaction.get('payment_method'),
              amount: transaction.get('total_amount'),
              date: transaction.get('transaction_date'),
              reference: reference,
              payuResponse: response.data
            }
          });
        }
      }

      // ✅ MANEJAR OTROS CÓDIGOS DE RESPUESTA
      if (response.data.code === 'ERROR') {
        console.log('❌ PayU devolvió ERROR:', response.data.error);

        // Si es error por no encontrar la transacción, mantener estado actual
        if (response.data.error === 'The order with the given reference code was not found') {
          console.log('⚠️ PayU no encontró la transacción - manteniendo estado actual');

          return res.status(200).json({
            success: true,
            localStatus: true,
            data: {
              status: transaction.get('status'),
              paymentMethod: transaction.get('payment_method'),
              amount: transaction.get('total_amount'),
              date: transaction.get('transaction_date'),
              reference: reference,
              message: 'PayU no encontró la transacción - usando estado de base de datos'
            }
          });
        }

        // Para otros errores, devolver el error
        return res.status(400).json({
          success: false,
          message: 'Error en PayU',
          error: response.data.error,
          payuResponse: response.data
        });
      }

      // ✅ RESPUESTA NO RECONOCIDA
      console.log('⚠️ Respuesta no reconocida de PayU');

      return res.status(200).json({
        success: true,
        localStatus: true,
        data: {
          status: transaction.get('status'),
          paymentMethod: transaction.get('payment_method'),
          amount: transaction.get('total_amount'),
          date: transaction.get('transaction_date'),
          reference: reference,
          message: 'Respuesta no reconocida de PayU - usando estado de base de datos'
        }
      });

    } catch (axiosError: any) {
      console.error('❌ Error en consulta a PayU:', axiosError.message);

      // ✅ EN CASO DE ERROR DE CONEXIÓN
      console.log('🔌 Error de conexión con PayU - usando estado de base de datos');

      return res.status(200).json({
        success: true,
        localStatus: true,
        data: {
          status: transaction.get('status'),
          paymentMethod: transaction.get('payment_method'),
          amount: transaction.get('total_amount'),
          date: transaction.get('transaction_date'),
          reference: reference,
          message: 'Error de conexión con PayU - usando estado de base de datos',
          error: axiosError.message
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error general al verificar pago:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar estado del pago',
      error: error.message
    });
  }
};
/**
 * Obtiene el historial de transacciones de un usuario
 * GET /api/payment/history/:userId
 */
export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      });
    }

    // Buscar transacciones del usuario
    const transactions = await Transaction.findAll({
      where: { id_user: userId },
      order: [['transaction_date', 'DESC']],
      include: [
        {
          model: Cart,
          as: 'cartInfo',
          include: [
            {
              model: ItemCart,
              as: 'items',
              include: [{ association: 'product' }]
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    console.error('Error al obtener historial de transacciones:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historial de transacciones',
      error: error.message
    });
  }
};
/**
 * Obtiene los productos comprados por un usuario
 * GET /api/payment/purchased/:userId
 */
export const getPurchasedProducts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID del usuario'
      });
    }

    console.log(`🔍 Buscando productos comprados para usuario: ${userId}`);

    // Buscar transacciones completadas del usuario
    const transactions = await Transaction.findAll({
      where: {
        id_user: userId,
        status: 'completada'
      },
      include: [
        {
          model: Cart,
          as: 'cartInfo',
          include: [
            {
              model: ItemCart,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  include: [
                    {
                      model: Image,
                      as: 'productImages',
                      where: { entity_type: 'product' },
                      required: false
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      order: [['transaction_date', 'DESC']]
    });

    console.log(`📊 Encontradas ${transactions.length} transacciones completadas`);

    // Procesar los datos para crear la lista de productos comprados
    const purchasedProducts: any[] = [];

    for (const transaction of transactions) {
      const cartInfo = transaction.get('cartInfo') as any;

      if (cartInfo && cartInfo.items && Array.isArray(cartInfo.items)) {
        console.log(`🛒 Procesando carrito ${cartInfo.id_cart} con ${cartInfo.items.length} items`);

        for (const item of cartInfo.items) {
          const product = item.product;

          if (product) {
            // ✅ USAR campos correctos según tu modelo ItemCart
            const itemPrice = item.price; // Campo price de ItemCart
            const productPrice = product.price; // Campo price de Product
            const quantity = item.quantity || 1;

            // Usar precio del item si existe, sino el del producto
            const finalPrice = itemPrice || productPrice;

            const purchasedProduct = {
              // Información del producto
              id_product: product.id_product,
              name: product.name,
              description: product.description,
              price: finalPrice,
              original_price: productPrice,
              quantity: quantity,
              category: product.category,

              // ✅ INFORMACIÓN DE LA TRANSACCIÓN - USAR get() consistentemente
              transaction_reference: transaction.get('reference_payu'),
              reference_payu: transaction.get('reference_payu'),
              transaction_id: transaction.get('id_transaction'),
              transaction_date: transaction.get('transaction_date'),
              transaction_amount: transaction.get('total_amount'),
              transaction_status: transaction.get('status'),
              payment_method: transaction.get('payment_method'),

              // Fecha de compra (alias para compatibilidad)
              purchase_date: transaction.get('transaction_date'),
              total: finalPrice * quantity,

              // Imágenes del producto
              productImages: product.productImages || [],

              // Información adicional de la transacción
              payu_transaction_id: transaction.get('payu_transaction_id'),
              payu_order_id: transaction.get('payu_order_id'),
              buyer_email: transaction.get('buyer_email'),
              buyer_name: transaction.get('buyer_name')
            };

            purchasedProducts.push(purchasedProduct);
            console.log(`✅ Producto agregado: ${product.name} (ID: ${product.id_product})`);
          } else {
            console.warn(`⚠️ Item sin producto en carrito ${cartInfo.id_cart}`);
          }
        }
      } else {
        console.warn(`⚠️ Transacción sin items en carrito`);
      }
    }

    console.log(`📦 Total productos comprados encontrados: ${purchasedProducts.length}`);

    // ✅ RETORNAR DIRECTAMENTE EL ARRAY
    res.json(purchasedProducts);
  } catch (error) {
    console.error('❌ Error al obtener productos comprados:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Completa una transacción de pago
 * POST /api/payment/complete
 */
export const completePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference, status, paymentMethod, transactionId } = req.body;

    // Buscar la transacción por referencia
    // Según tus datos de BD, deberías usar reference_payu como campo
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        msg: 'Transacción no encontrada'
      });
      return;
    }

    // Mapear el estado externo (APPROVED, DECLINED) al interno (pendiente, completada, fallida)
    let dbStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada';

    switch (status) {
      case 'APPROVED':
        dbStatus = 'completada';
        break;
      case 'DECLINED':
        dbStatus = 'fallida';
        break;
      default:
        dbStatus = 'pendiente';
    }

    // Actualizar el estado de la transacción con los campos correctos
    await transaction.update({
      status: dbStatus,
      payment_method: paymentMethod,
      reference_payu: transactionId // Asegúrate de usar el campo correcto
      // Elimina updated_at si no existe en tu modelo o usa transaction_date
      // Si necesitas una fecha, tal vez ya existe un campo transaction_date
    });

    // Si el pago fue aprobado, actualizar el carrito a "comprado"
    if (status === 'APPROVED') {
      const cartId = transaction.get('id_cart');

      if (cartId) {
        await Cart.update(
          { status: 'comprado' },
          {
            where: {
              id_cart: cartId as number
            }
          }
        );
      }
    }

    res.json({
      success: true,
      msg: 'Transacción actualizada correctamente',
      transaction: {
        id: transaction.get('id_transaction'),
        reference: transaction.get('reference'), // O transaction.get('reference_payu')
        status: dbStatus
      }
    });
  } catch (error) {
    console.error('Error al completar pago:', error);
    res.status(500).json({
      success: false,
      msg: 'Error al actualizar la transacción'
    });
  }
};
/**
 * Crea una transacción usando WebCheckout de PayU
 * POST /api/transaction/web-checkout
 */
export const createWebCheckoutPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id_user,
      id_cart,
      delivery_address_id,
      buyerEmail,
      buyerName,
      buyerPhone,
      total,
      description = 'Compra en CasanareServ'
    } = req.body;

    // Validar datos de entrada
    if (!id_user || !id_cart || !total) {
      res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios para el pago'
      });
      return;
    }

    // Generar referencia única para la transacción
    const reference = `CASASERV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Cargar información de la dirección de entrega si se proporciona
    let deliveryAddressData = null;
    if (delivery_address_id) {
      deliveryAddressData = await DeliveryAddress.findByPk(delivery_address_id);
    }

    // Crear transacción en la base de datos con todos los campos necesarios
    const transaction = await Transaction.create({
      id_user,
      id_cart,
      status: 'pendiente',
      reference_payu: reference,
      total_amount: total,
      currency: 'COP',
      payment_method: 'CREDIT_CARD',
      transaction_date: new Date(),
      delivery_address_id: delivery_address_id || null,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_phone: buyerPhone || null
    });

    // === CONFIGURACIÓN DE PAYU WEBCHECKOUT ===
    const payuConfig = {
      apiKey: process.env.PAYU_API_KEY || '4Vj8eK4rloUd272L48hsrarnUA',
      merchantId: process.env.PAYU_MERCHANT_ID || '508029',
      accountId: process.env.PAYU_ACCOUNT_ID || '512321',
      url: process.env.PAYU_URL || 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
      // ✅ CORREGIR: Usar endpoints normales (NO barter)
     //responseUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/payu-response` : 'http://localhost:3006/api/transaction/payu-response',
     //confirmationUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/barter-payu-confirmation` : 'http://localhost:3006/api/transaction/barter-payu-confirmation', test: process.env.NODE_ENV !== 'production' ? 1 : 0
      responseUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/payu-response` : 'https://casanareserv.me/api/transaction/payu-response',
      confirmationUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/barter-payu-confirmation` : 'https://casanareserv.me/api/transaction/barter-payu-confirmation', test: process.env.NODE_ENV !== 'production' ? 1 : 0
    };

    // Datos para la firma
    const amount = total.toString();
    const currency = 'COP';

    // Generar firma con MD5 (PayU requiere esta firma para seguridad)
    const signature = crypto
      .createHash('md5')
      .update(`${payuConfig.apiKey}~${payuConfig.merchantId}~${reference}~${amount}~${currency}`)
      .digest('hex');

    // Guardar la firma en la transacción para validación posterior
    await transaction.update({
      signature,
      response_url: payuConfig.responseUrl
    });

    // Preparar datos de dirección para PayU si existe
    let shippingAddress = {};
    if (deliveryAddressData) {
      shippingAddress = {
        shippingAddress: deliveryAddressData.get('address'),
        shippingCity: deliveryAddressData.get('city'),
        shippingCountry: 'CO', // Colombia
        shippingPhone: buyerPhone || ''
      };
    }

    // Datos que se enviarán al frontend para redirigir a PayU
    const webCheckoutData = {
      url: payuConfig.url,
      reference: reference,
      formData: {
        merchantId: payuConfig.merchantId,
        accountId: payuConfig.accountId,
        description: description,
        referenceCode: reference,
        amount: amount,
        tax: '0',
        taxReturnBase: '0',
        currency: currency,
        signature: signature,
        test: payuConfig.test,
        buyerEmail: buyerEmail,
        buyerFullName: buyerName,
        responseUrl: payuConfig.responseUrl,
        confirmationUrl: payuConfig.confirmationUrl,
        ...shippingAddress
      }
    };

    // Enviar respuesta al frontend
    res.json(webCheckoutData);
  } catch (error) {
    console.error('Error al crear pago con WebCheckout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el pago',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Endpoint de confirmación para PayU (webhook)
 * POST /api/transaction/payu-confirmation
 */
export const payuConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    // AGREGAR MÁS LOGS PARA DEBUGGING
    console.log('🔔 CONFIRMACIÓN DE PAYU RECIBIDA:');
    console.log('- Headers:', req.headers);
    console.log('- Body:', JSON.stringify(req.body, null, 2));
    console.log('- Method:', req.method);
    console.log('- URL:', req.url);

    const payuResponse = req.body;

    // ✅ VALIDAR FIRMA DE SEGURIDAD (MUY IMPORTANTE)
    const signature = payuResponse.sign;
    const expectedSignature = generatePayUSignature({
      merchantId: payuResponse.merchant_id,
      referenceCode: payuResponse.reference_sale,
      amount: payuResponse.value,
      currency: payuResponse.currency,
      transactionState: payuResponse.state_pol
    });

    if (signature !== expectedSignature) {
      console.error('❌ Firma de seguridad inválida');
      console.log('Firma recibida:', signature);
      console.log('Firma esperada:', expectedSignature);
      res.status(400).send('FAILED: Invalid signature');
      return;
    }

    // ✅ OBTENER REFERENCIA CON MÚLTIPLES OPCIONES
    const reference = payuResponse.reference_sale ||
      payuResponse.referenceCode ||
      payuResponse.reference_code;

    if (!reference) {
      console.error('❌ Notificación sin referencia');
      res.status(400).send('FAILED: No reference code');
      return;
    }

    console.log(`🔍 Procesando confirmación para referencia: ${reference}`);

    // Buscar la transacción por referencia
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference },
      include: [
        {
          model: Cart,
          as: 'cartInfo',
          include: [
            {
              model: ItemCart,
              as: 'items',
              include: [{ model: Product, as: 'product' }]
            }
          ]
        },
        { model: User, as: 'transactionUser' }
      ]
    });

    if (!transaction) {
      console.error('❌ Transacción no encontrada:', reference);
      res.status(404).send('FAILED: Transaction not found');
      return;
    }

    console.log(`📊 Transacción encontrada. Estado actual: ${transaction.get('status')}`);

    // Obtener el usuario y el carrito
    const user = transaction.get('transactionUser') as any;
    const cart = transaction.get('cartInfo') as any;

    // ✅ MAPEO CORRECTO DE ESTADOS DE PAYU
    let newStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';
    const payuStatus = payuResponse.state_pol || payuResponse.status_pol || payuResponse.status;

    console.log(`🔍 Estado de PayU recibido: ${payuStatus}`);

    switch (String(payuStatus)) {
      case '4': // Transacción aprobada
      case 'APPROVED':
      case 'CAPTURED':
        newStatus = 'completada';
        break;
      case '5': // Transacción expirada
      case '6': // Transacción rechazada  
      case '104': // Error
      case 'DECLINED':
      case 'EXPIRED':
      case 'ERROR':
        newStatus = 'fallida';
        break;
      case '7': // Transacción pendiente
      case '15': // Pendiente de validación
      case 'PENDING':
        newStatus = 'pendiente';
        break;
      case '13': // Reembolso parcial
      case '14': // Reembolso total
      case 'REFUNDED':
        newStatus = 'reembolsada';
        break;
      default:
        console.warn(`⚠️ Estado de PayU no reconocido: ${payuStatus}`);
        newStatus = 'pendiente';
        break;
    }

    console.log(`🔄 Estado determinado: ${newStatus}`);

    const oldStatus = transaction.get('status');

    // ✅ ACTUALIZAR TRANSACCIÓN CON MÁS INFORMACIÓN
    await transaction.update({
      status: newStatus,
      payment_method: payuResponse.payment_method_name ||
        payuResponse.payment_method ||
        transaction.get('payment_method'),
      payu_transaction_id: payuResponse.transaction_id || null,
      payu_order_id: payuResponse.reference_pol || null,
      payu_state: String(payuStatus),
      payu_response_message: payuResponse.response_message_pol || null
    });

    console.log(`✅ Transacción actualizada: ${oldStatus} → ${newStatus}`);

    // ✅ PROCESAR CAMBIO DE ESTADO
    if (oldStatus !== newStatus) {
      console.log(`🔔 Estado cambió, procesando notificaciones...`);

      // Obtener items del carrito si no están incluidos
      let cartItems = cart?.get('items') || [];

      if (!cartItems.length && cart) {
        cartItems = await ItemCart.findAll({
          where: { id_cart: cart.get('id_cart') },
          include: [{ model: Product, as: 'product' }]
        });
      }

      const productsList = cartItems.map((item: any) => ({
        name: item.get('product')?.get('name') || 'Producto',
        quantity: item.get('quantity') || 1,
        price: item.get('unit_price') || item.get('price') || item.get('product')?.get('price') || 0
      }));

      // Preparar datos para la notificación
      const transactionInfo = {
        reference: reference,
        amount: transaction.get('total_amount'),
        date: transaction.get('transaction_date'),
        paymentMethod: transaction.get('payment_method'),
        message: payuResponse.response_message_pol || payuResponse.message || '',
        products: productsList
      };

      // ✅ ENVIAR EMAIL AL COMPRADOR
      if (user && user.get('email')) {
        try {
          await sendPaymentNotificationEmail(user.get('email'), newStatus, transactionInfo);
          console.log(`📧 Email enviado a comprador: ${user.get('email')}`);
        } catch (emailError) {
          console.error('❌ Error enviando email al comprador:', emailError);
        }
      }

      // ✅ GUARDAR NOTIFICACIÓN INTERNA
      let notificationTitle = '';
      let notificationMessage = '';

      switch (newStatus) {
        case 'completada':
          notificationTitle = '🎉 ¡Pago confirmado!';
          notificationMessage = `Tu pago por ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
          }).format(transaction.get('total_amount') as number)} ha sido confirmado. Referencia: ${reference}`;
          break;
        case 'fallida':
          notificationTitle = '❌ Pago rechazado';
          notificationMessage = `Tu pago por ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
          }).format(transaction.get('total_amount') as number)} ha sido rechazado. Referencia: ${reference}`;
          break;
        case 'pendiente':
          notificationTitle = '⏳ Pago en proceso';
          notificationMessage = `Tu pago por ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
          }).format(transaction.get('total_amount') as number)} está siendo procesado. Referencia: ${reference}`;
          break;
        case 'reembolsada':
          notificationTitle = '💰 Pago reembolsado';
          notificationMessage = `Tu pago por ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
          }).format(transaction.get('total_amount') as number)} ha sido reembolsado. Referencia: ${reference}`;
          break;
      }

      if (notificationTitle) {
        try {
          await saveInternalNotification(
            transaction.get('id_user') as number,
            notificationTitle,
            notificationMessage,
            'payment'
          );
          console.log(`🔔 Notificación interna guardada para usuario: ${transaction.get('id_user')}`);
        } catch (notificationError) {
          console.error('❌ Error guardando notificación interna:', notificationError);
        }
      }

      // ✅ NOTIFICAR A VENDEDORES SOLO CUANDO SE COMPLETE EL PAGO
      if (newStatus === 'completada') {
        console.log('💰 PAGO COMPLETADO - PROCESANDO NOTIFICACIONES A VENDEDORES');

        try {
          // Agrupar productos por vendedor
          const sellerProducts = new Map<number, { seller: any; products: any[] }>();

          for (const item of cartItems) {
            const product = item.get('product') as any;
            if (!product) continue;

            // Obtener el vendedor del producto
            let seller = product.get('user');
            if (!seller) {
              // Si no está incluido, buscarlo
              const productWithSeller = await Product.findByPk(product.get('id_product'), {
                include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
              });
              seller = productWithSeller?.get('user');
            }

            if (seller) {
              const sellerId = seller.get('id') as number;

              if (!sellerProducts.has(sellerId)) {
                sellerProducts.set(sellerId, {
                  seller: seller,
                  products: []
                });
              }

              sellerProducts.get(sellerId)!.products.push({
                name: product.get('name'),
                quantity: item.get('quantity'),
                price: item.get('unit_price') || item.get('price') || product.get('price'),
                productId: product.get('id_product')
              });
            }
          }

          // Enviar notificaciones a cada vendedor
          for (const [sellerId, data] of sellerProducts) {
            const seller = data.seller;
            const products = data.products;

            const totalForSeller = products.reduce((sum: number, p: any) =>
              sum + (Number(p.price) * Number(p.quantity)), 0
            );

            console.log(`📧 Notificando al vendedor ${seller.get('name')} (ID: ${sellerId})`);

            // ✅ ENVIAR EMAIL AL VENDEDOR
            if (seller.get('email')) {
              try {
                await sendSellerNotificationEmail(
                  seller.get('email'),
                  seller.get('name'),
                  user?.get('name') || 'Cliente',
                  {
                    reference: reference,
                    amount: totalForSeller,
                    date: transaction.get('transaction_date'),
                    paymentMethod: transaction.get('payment_method'),
                    products: products
                  }
                );
                console.log(`✅ Email enviado al vendedor: ${seller.get('email')}`);
              } catch (sellerEmailError) {
                console.error(`❌ Error enviando email al vendedor ${seller.get('email')}:`, sellerEmailError);
              }
            }

            // ✅ CREAR NOTIFICACIÓN INTERNA AL VENDEDOR
            const productNames = products.map((p: any) => p.name).join(', ');
            const formattedAmount = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP'
            }).format(totalForSeller);

            try {
              await saveInternalNotification(
                sellerId,
                '🎉 ¡Nueva venta realizada!',
                `Tu producto "${productNames}" ha sido comprado por ${formattedAmount}. Referencia: ${reference}. Comprador: ${user?.get('name') || 'Cliente'}`,
                'sale_notification',
                'transaction',
                transaction.get('id_transaction') as number
              );
              console.log(`✅ Notificación interna creada para vendedor ID: ${sellerId}`);
            } catch (sellerNotificationError) {
              console.error(`❌ Error creando notificación para vendedor ${sellerId}:`, sellerNotificationError);
            }
          }

          console.log(`✅ Procesadas ${sellerProducts.size} notificaciones de vendedores`);

        } catch (sellerNotificationError) {
          console.error('❌ Error general al notificar vendedores:', sellerNotificationError);
        }
      }
    } else {
      console.log(`ℹ️ Estado no cambió (${oldStatus}), no se envían notificaciones`);
    }

    console.log('✅ Confirmación de PayU procesada exitosamente');
    res.status(200).send('OK');

  } catch (error: any) {
    console.error('❌ Error en confirmación de pago:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).send('FAILED: Internal server error');
  }
};

// FUNCIÓN AUXILIAR PARA GENERAR FIRMA DE SEGURIDAD
function generatePayUSignature(params: {
  merchantId: string;
  referenceCode: string;
  amount: string;
  currency: string;
  transactionState: string;
}): string {
  const { merchantId, referenceCode, amount, currency, transactionState } = params;
  const apiKey = process.env.PAYU_API_KEY || '';

  // Formato: ApiKey~merchant_id~reference_sale~value~currency~state_pol
  const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~${currency}~${transactionState}`;

  // Generar MD5
  const crypto = require('crypto');
  return crypto.createHash('md5').update(signatureString).digest('hex');
}
/**
 * Verifica el estado de un pago de trueque consultando a PayU y actualiza la base de datos
 * Simula el pago completado en modo desarrollo y maneja errores de conexión
 */
export const verifyBarterPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;

    if (!reference) {
      res.status(400).json({
        success: false,
        message: 'Se requiere el código de referencia'
      });
      return;
    }

    console.log('🔍 Verificando pago de trueque con referencia:', reference);

    // Buscar la transacción
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference }
    });

    if (!transaction) {
      console.error('❌ Transacción de trueque no encontrada:', reference);
      res.status(404).json({
        success: false,
        message: 'Transacción de trueque no encontrada'
      });
      return;
    }

    console.log(`📊 Estado actual de la transacción: ${transaction.get('status')}`);

    // ✅ DECLARAR newStatus AL INICIO DE LA FUNCIÓN
    let newStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';

    // Validar configuración de PayU
    if (!PAYU_API_KEY || !PAYU_API_LOGIN || !PAYU_MERCHANT_ID) {
      console.error('❌ Faltan credenciales de PayU');
      res.status(500).json({
        success: false,
        message: 'Error de configuración de PayU'
      });
      return;
    }

    // ✅ CONSULTAR ESTADO EN PAYU CON EL FORMATO CORRECTO
    const payload = {
      language: "es",
      command: "ORDER_DETAIL",
      merchant: {
        apiKey: PAYU_API_KEY,
        apiLogin: PAYU_API_LOGIN
      },
      details: {
        orderId: reference
      },
      test: process.env.NODE_ENV !== 'production'
    };

    console.log('📤 Enviando consulta a PayU:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(PAYU_API_URL as string, payload, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('📥 Respuesta de PayU:', JSON.stringify(response.data, null, 2));

      // ✅ PROCESAR RESPUESTA DE PAYU
      if (response.data.code === 'SUCCESS') {
        const payuResult = response.data.result;

        if (payuResult && payuResult.payload) {
          // ✅ AHORA SOLO ASIGNAR VALOR, NO DECLARAR
          // Verificar el estado de la orden
          const orderStatus = payuResult.payload.status;
          console.log(`🔍 Estado en PayU: ${orderStatus}`);

          switch (orderStatus) {
            case 'CAPTURED':
            case 'APPROVED':
              newStatus = 'completada';
              break;
            case 'DECLINED':
            case 'EXPIRED':
            case 'CANCELLED':
              newStatus = 'fallida';
              break;
            case 'PENDING':
            default:
              newStatus = 'pendiente';
              break;
          }

          // Actualizar estado si cambió
          const oldStatus = transaction.get('status');
          if (oldStatus !== newStatus) {
            console.log(`🔄 Actualizando transacción de ${oldStatus} a ${newStatus}`);

            await transaction.update({
              status: newStatus,
              payu_transaction_id: payuResult.payload.transactions?.[0]?.id || null,
              payu_order_id: payuResult.payload.id || null,
              payu_state: orderStatus || null
            });

            // ✅ SI EL PAGO SE COMPLETÓ, ACTUALIZAR EL TRUEQUE
            if (newStatus === 'completada') {
              console.log('💰 PAGO DE TRUEQUE CONFIRMADO');

              const barterId = transaction.get('id_barter') as number | null;
              if (barterId) {
                await updateBarterPaymentStatus(transaction);

                const barter = await Barter.findByPk(barterId);
                if (barter && barter.get('status') === 'pendiente') {
                  await barter.update({ status: 'completado' });
                  console.log('✅ Estado del trueque actualizado a activo');
                }

                // ✅ AGREGAR: NOTIFICACIÓN INTERNA AL USUARIO QUE PAGÓ
                const userId = transaction.get('id_user') as number;
                await saveInternalNotification(
                  userId,
                  '✅ ¡Pago de trueque confirmado!',
                  `Tu pago del servicio de trueque ha sido confirmado exitosamente. Referencia: ${transaction.get('reference_payu')}`,
                  'barter_payment_success',
                  'transaction',
                  transaction.get('id_transaction') as number
                );
                console.log(`🔔 Notificación interna de pago exitoso enviada al usuario ${userId}`);

                // ✅ ENVIAR EMAIL AL USUARIO
                try {
                  const user = await User.findByPk(transaction.get('id_user') as number);
                  if (user && user.get('email')) {
                    await sendPaymentNotificationEmail(
                      user.get('email') as string,
                      newStatus,
                      {
                        reference: transaction.get('reference_payu') as string,
                        amount: transaction.get('total_amount'),
                        date: transaction.get('transaction_date'),
                        paymentMethod: 'Servicio de trueque',
                        message: 'Pago de trueque confirmado exitosamente',
                        products: [{
                          name: 'Servicio de trueque',
                          quantity: 1,
                          price: transaction.get('total_amount'),
                          total: transaction.get('total_amount')
                        }]
                      }
                    );
                    console.log(`📧 Email de verificación de trueque enviado a ${user.get('email')}`);
                  }
                } catch (emailError) {
                  console.error('❌ Error enviando email de verificación de trueque:', emailError);
                }
              }
            }
          }

          // Obtener datos del trueque para la respuesta
          const barterId = transaction.get('id_barter') as number | null;
          let barter = null;

          if (barterId && typeof barterId === 'number') {
            barter = await Barter.findByPk(barterId);
          }

          res.json({
            success: true,
            transaction: {
              id: transaction.get('id_transaction'),
              status: newStatus,
              reference: transaction.get('reference_payu'),
              amount: transaction.get('total_amount'),
              date: transaction.get('transaction_date'),
              paymentMethod: transaction.get('payment_method')
            },
            barter: barter ? {
              id_barter: barter.get('id_barter'),
              status: barter.get('status'),
              value: barter.get('value'),
              exchange_type: barter.get('exchange_type')
            } : null,
            payuResponse: response.data
          });
          return;
        }
      }

      // ✅ SI PAYU NO ENCUENTRA LA TRANSACCIÓN O HAY ERROR, MANEJAR SEGÚN EL CONTEXTO
      console.log('⚠️ PayU no encontró la transacción o hay un error');

      // Para desarrollo/testing, simular completado
      if (process.env.NODE_ENV !== 'production') {
        console.log('🎭 MODO DESARROLLO - SIMULANDO PAGO COMPLETADO');

        const oldStatus = transaction.get('status');
        if (oldStatus === 'pendiente') {
          newStatus = 'completada'; // ✅ ASIGNAR VALOR AQUÍ

          await transaction.update({
            status: newStatus
          });

          // Actualizar trueque también
          const barterId = transaction.get('id_barter') as number | null;
          if (barterId) {
            await updateBarterPaymentStatus(transaction);

            const barter = await Barter.findByPk(barterId);
            if (barter && barter.get('status') === 'pendiente') {
              await barter.update({ status: 'en_proceso' }); // ✅ CORREGIR: cambiar a 'en_proceso'
            }

            // ✅ AGREGAR: NOTIFICACIÓN INTERNA EN MODO DESARROLLO TAMBIÉN
            const userId = transaction.get('id_user') as number;
            await saveInternalNotification(
              userId,
              '✅ ¡Pago de trueque confirmado!',
              `Tu pago del servicio de trueque ha sido confirmado exitosamente (modo desarrollo). Referencia: ${transaction.get('reference_payu')}`,
              'barter_payment_success',
              'transaction',
              transaction.get('id_transaction') as number
            );
            console.log(`🔔 Notificación interna de pago exitoso (desarrollo) enviada al usuario ${userId}`);

            // ✅ ENVIAR EMAIL EN MODO DESARROLLO TAMBIÉN
            try {
              const user = await User.findByPk(transaction.get('id_user') as number);
              if (user && user.get('email')) {
                await sendPaymentNotificationEmail(
                  user.get('email') as string,
                  newStatus,
                  {
                    reference: transaction.get('reference_payu') as string,
                    amount: transaction.get('total_amount'),
                    date: transaction.get('transaction_date'),
                    paymentMethod: 'Servicio de trueque',
                    message: 'Pago de trueque confirmado en desarrollo',
                    products: [{
                      name: 'Servicio de trueque',
                      quantity: 1,
                      price: transaction.get('total_amount'),
                      total: transaction.get('total_amount')
                    }]
                  }
                );
                console.log(`📧 Email de desarrollo enviado a ${user.get('email')}`);
              }
            } catch (emailError) {
              console.error('❌ Error enviando email en desarrollo:', emailError);
            }
          }
        }
      }

      // Obtener datos actuales para la respuesta
      const barterId = transaction.get('id_barter') as number | null;
      let barter = null;

      if (barterId && typeof barterId === 'number') {
        barter = await Barter.findByPk(barterId);
      }

      res.json({
        success: true,
        simulated: process.env.NODE_ENV !== 'production',
        transaction: {
          id: transaction.get('id_transaction'),
          status: transaction.get('status'),
          reference: transaction.get('reference_payu'),
          amount: transaction.get('total_amount'),
          date: transaction.get('transaction_date'),
          paymentMethod: transaction.get('payment_method')
        },
        barter: barter ? {
          id_barter: barter.get('id_barter'),
          status: barter.get('status'),
          value: barter.get('value'),
          exchange_type: barter.get('exchange_type')
        } : null,
        message: process.env.NODE_ENV !== 'production' ? 'Pago simulado en desarrollo' : 'Consultado desde base de datos'
      });

    } catch (axiosError: any) {
      console.error('❌ Error en consulta a PayU:', axiosError.message);

      // En caso de error de PayU, devolver el estado actual
      const barterId = transaction.get('id_barter') as number | null;
      let barter = null;

      if (barterId && typeof barterId === 'number') {
        barter = await Barter.findByPk(barterId);
      }

      // Para desarrollo, simular completado en caso de error
      if (process.env.NODE_ENV !== 'production') {
        console.log('🎭 Error de PayU en desarrollo - SIMULANDO COMPLETADO');

        const oldStatus = transaction.get('status');
        if (oldStatus === 'pendiente') {
          newStatus = 'completada'; // ✅ ASIGNAR VALOR AQUÍ TAMBIÉN

          await transaction.update({
            status: newStatus
          });

          // ✅ AGREGAR: NOTIFICACIÓN INTERNA EN CASO DE ERROR TAMBIÉN
          const userId = transaction.get('id_user') as number;
          await saveInternalNotification(
            userId,
            '✅ ¡Pago de trueque confirmado!',
            `Tu pago del servicio de trueque ha sido confirmado exitosamente (simulado por error PayU). Referencia: ${transaction.get('reference_payu')}`,
            'barter_payment_success',
            'transaction',
            transaction.get('id_transaction') as number
          );
          console.log(`🔔 Notificación interna de pago exitoso (error PayU) enviada al usuario ${userId}`);

          if (barter && barter.get('status') === 'pendiente') {
            await barter.update({ status: 'en_proceso' }); // ✅ CORREGIR AQUÍ TAMBIÉN
          }
        }
      }

      res.json({
        success: true,
        simulated: process.env.NODE_ENV !== 'production',
        transaction: {
          id: transaction.get('id_transaction'),
          status: transaction.get('status'),
          reference: transaction.get('reference_payu'),
          amount: transaction.get('total_amount'),
          date: transaction.get('transaction_date'),
          paymentMethod: transaction.get('payment_method')
        },
        barter: barter ? {
          id_barter: barter.get('id_barter'),
          status: barter.get('status'),
          value: barter.get('value'),
          exchange_type: barter.get('exchange_type')
        } : null,
        message: 'Error de PayU - usando estado de base de datos'
      });
    }

  } catch (error: any) {
    console.error('❌ Error general al verificar pago de trueque:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar el pago de trueque',
      error: error.message
    });
  }
};
/**
 * Actualiza el estado de pago del barter cuando se completa una transacción
 * @param transaction Instancia de la transacción completada
 */
async function updateBarterPaymentStatus(transaction: any): Promise<void> {
  let barterId: number | null = null; // ✅ Declarar barterId fuera del try-catch

  try {
    barterId = transaction.get('id_barter') as number;
    const userId = transaction.get('id_user') as number;

    // ✅ AGREGAR ESTOS LOGS AL INICIO
    console.log(`🔍 [DEBUG-BARTER] =====================================`);
    console.log(`🔍 [DEBUG-BARTER] Iniciando updateBarterPaymentStatus`);
    console.log(`🔍 [DEBUG-BARTER] Usuario que pagó: ${userId} (tipo: ${typeof userId})`);
    console.log(`🔍 [DEBUG-BARTER] Barter ID: ${barterId} (tipo: ${typeof barterId})`);
    console.log(`🔍 [DEBUG-BARTER] =====================================`);

    if (!barterId || !userId) {
      console.warn('⚠️ Transacción sin barter o usuario asociado');
      return;
    }

    console.log(`💰 Actualizando estado de pago para barter ${barterId}, usuario ${userId}`);

    // Buscar el barter
    const barter = await Barter.findByPk(barterId);

    if (!barter) {
      console.error(`❌ Barter ${barterId} no encontrado`);
      return;
    }

    // ✅ AGREGAR ESTOS LOGS DETALLADOS
    console.log(`🔍 [DEBUG-BARTER] Estado ANTES del pago:`, {
      id_barter: barter.get('id_barter'),
      id_user_offer: barter.get('id_user_offer'),
      id_user_receiving: barter.get('id_user_receiving'),
      offer_payment_completed: barter.get('offer_payment_completed'),
      request_payment_completed: barter.get('request_payment_completed'),
      offer_payment_date: barter.get('offer_payment_date'),
      request_payment_date: barter.get('request_payment_date')
    });

    console.log(`🔍 [DEBUG-BARTER] Análisis de usuario:`, {
      'userId === id_user_offer': userId === barter.get('id_user_offer'),
      'userId === id_user_receiving': userId === barter.get('id_user_receiving'),
      'Comparación estricta offer': userId === barter.get('id_user_offer'),
      'Comparación estricta receiving': userId === barter.get('id_user_receiving'),
      'userId': userId,
      'id_user_offer': barter.get('id_user_offer'),
      'id_user_receiving': barter.get('id_user_receiving'),
      'Tipos': {
        userId: typeof userId,
        id_user_offer: typeof barter.get('id_user_offer'),
        id_user_receiving: typeof barter.get('id_user_receiving')
      }
    });

    // Determinar si es el usuario oferente (A) o receptor (B)
    const isOfferingUser = barter.get('id_user_offer') === userId;
    const isReceivingUser = barter.get('id_user_receiving') === userId;

    console.log(`🔍 [DEBUG-BARTER] Resultado de identificación:`, {
      isOfferingUser,
      isReceivingUser,
      'Debería ser oferente': userId === barter.get('id_user_offer'),
      'Debería ser receptor': userId === barter.get('id_user_receiving')
    });

    if (!isOfferingUser && !isReceivingUser) {
      console.error(`❌ [DEBUG-BARTER] Usuario ${userId} no pertenece al barter ${barterId}`);
      console.error(`❌ [DEBUG-BARTER] VALORES EXACTOS:`, {
        userId: { valor: userId, tipo: typeof userId },
        id_user_offer: { valor: barter.get('id_user_offer'), tipo: typeof barter.get('id_user_offer') },
        id_user_receiving: { valor: barter.get('id_user_receiving'), tipo: typeof barter.get('id_user_receiving') }
      });
      return;
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (isOfferingUser) {
      updateData.offer_payment_completed = true;
      updateData.offer_payment_date = new Date();
      console.log(`✅ [DEBUG-BARTER] Usuario OFERENTE ${userId} completó el pago para barter ${barterId}`);
      console.log(`📝 [DEBUG-BARTER] Datos a actualizar (OFERENTE):`, updateData);
    } else if (isReceivingUser) {
      updateData.request_payment_completed = true;
      updateData.request_payment_date = new Date();
      console.log(`✅ [DEBUG-BARTER] Usuario RECEPTOR ${userId} completó el pago para barter ${barterId}`);
      console.log(`📝 [DEBUG-BARTER] Datos a actualizar (RECEPTOR):`, updateData);
    }

    // ✅ AGREGAR LOG ANTES DE LA ACTUALIZACIÓN
    console.log(`🔄 [DEBUG-BARTER] EJECUTANDO UPDATE en barter ${barterId}...`);
    console.log(`📝 [DEBUG-BARTER] WHERE clause: { id_barter: ${barterId} }`);
    console.log(`📝 [DEBUG-BARTER] UPDATE data:`, updateData);

    // Actualizar el barter
    const [affectedRows] = await Barter.update(updateData, {
      where: { id_barter: barterId }
    });

    console.log(`📊 [DEBUG-BARTER] RESULTADO UPDATE: ${affectedRows} filas afectadas`);

    if (affectedRows === 0) {
      console.error(`❌ [DEBUG-BARTER] ¡¡¡ NO SE ACTUALIZÓ NINGUNA FILA !!! para barter ${barterId}`);
      console.error(`❌ [DEBUG-BARTER] Posible problema en la condición WHERE`);
    } else {
      console.log(`✅ [DEBUG-BARTER] Barter ${barterId} actualizado exitosamente`);
    }

    // ✅ VERIFICAR ESTADO DESPUÉS DE LA ACTUALIZACIÓN
    const updatedBarter = await Barter.findByPk(barterId);
    if (updatedBarter) {
      console.log(`🔍 [DEBUG-BARTER] Estado DESPUÉS del pago:`, {
        id_barter: updatedBarter.get('id_barter'),
        offer_payment_completed: updatedBarter.get('offer_payment_completed'),
        request_payment_completed: updatedBarter.get('request_payment_completed'),
        offer_payment_date: updatedBarter.get('offer_payment_date'),
        request_payment_date: updatedBarter.get('request_payment_date')
      });

      // Verificar si realmente cambió
      const offerBefore = barter.get('offer_payment_completed');
      const requestBefore = barter.get('request_payment_completed');
      const offerAfter = updatedBarter.get('offer_payment_completed');
      const requestAfter = updatedBarter.get('request_payment_completed');

      console.log(`🔍 [DEBUG-BARTER] COMPARACIÓN ANTES vs DESPUÉS:`, {
        offer_payment_completed: `${offerBefore} → ${offerAfter}`,
        request_payment_completed: `${requestBefore} → ${requestAfter}`,
        'Offer cambió': offerBefore !== offerAfter,
        'Request cambió': requestBefore !== requestAfter
      });
    } else {
      console.error(`❌ [DEBUG-BARTER] No se pudo recargar el barter ${barterId} después de la actualización`);
    }

  } catch (error) {
    console.error('❌ [DEBUG-BARTER] Error actualizando estado de pago del barter:', error);
  }

  // ✅ VERIFICACIÓN FINAL - Ahora barterId está disponible aquí
  if (barterId) {
    try {
      console.log(`🔄 [DEBUG-BARTER] Verificando si ambos usuarios han pagado para barter ${barterId}...`);

      // ✅ AQUÍ ESTÁ LA LLAMADA QUE FALTA:
      const { checkAndUpdateBarterCompletion } = require('./barter.controller');
      await checkAndUpdateBarterCompletion(barterId);

      console.log(`✅ [DEBUG-BARTER] Verificación de completion completada para barter ${barterId}`);
    } catch (completionError) {
      console.error(`❌ [DEBUG-BARTER] Error en checkAndUpdateBarterCompletion para barter ${barterId}:`, completionError);
    }
  } else {
    console.warn(`⚠️ [DEBUG-BARTER] No se pudo verificar completion - barterId no disponible`);
  }

  console.log(`🔍 [DEBUG-BARTER] updateBarterPaymentStatus TERMINADO`);
  console.log(`🔍 [DEBUG-BARTER] =====================================`);
}
/**
 * Maneja la respuesta cuando el usuario regresa de PayU después de un pago de trueque
 * Procesa el estado del pago y actualiza tanto la transacción como el estado del barter
 */
export const barterPayuResponse = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔄 Procesando respuesta de PayU para trueque:', req.query);

    const {
      referenceCode,
      reference_sale,
      transactionState,
      lapTransactionState,
      TX_VALUE,
      currency,
      transactionId,
      transaction_id,
      state_pol,
      response_code_pol,
      response_message_pol
    } = req.query;

    // Obtener la referencia (PayU puede enviarla con diferentes nombres)
    const reference = (referenceCode || reference_sale) as string;
    const state = (transactionState || lapTransactionState || state_pol) as string;
    const txId = (transactionId || transaction_id) as string;

    if (!reference) {
      console.error('❌ No se recibió referencia en respuesta de PayU para trueque');
      // Redirigir al frontend con error
      const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
      res.redirect(`${frontendUrl}/barter-payment-response?error=no_reference`);
      return;
    }

    console.log(`🔍 Procesando respuesta para trueque con referencia: ${reference}, estado: ${state}`);

    // Buscar la transacción de trueque
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference }
    });

    if (!transaction) {
      console.error(`❌ Transacción de trueque no encontrada: ${reference}`);
      const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
      res.redirect(`${frontendUrl}/barter-payment-response?error=transaction_not_found&reference=${reference}`);
      return;
    }

    // Mapear estado de PayU a estado interno
    let dbStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';

    switch (state) {
      case '4': // Aprobada
      case 'APPROVED':
        dbStatus = 'completada';
        break;
      case '6': // Rechazada
      case '5': // Expirada
      case 'DECLINED':
      case 'EXPIRED':
      case 'REJECTED':
        dbStatus = 'fallida';
        break;
      case '7': // Pendiente
      case 'PENDING':
        dbStatus = 'pendiente';
        break;
      default:
        console.warn(`⚠️ Estado de PayU no reconocido para trueque: ${state}`);
        dbStatus = 'pendiente';
    }

    console.log(`🔄 Actualizando transacción de trueque ${reference}: ${transaction.get('status')} → ${dbStatus}`);

    // ✅ CORRECCIÓN: Usar undefined en lugar de null y valores por defecto
    const updateData: any = {
      status: dbStatus
    };

    // Solo agregar campos si tienen valores válidos
    if (txId) {
      updateData.payu_transaction_id = txId;
    }

    if (state) {
      updateData.payu_state = state;
    }

    if (response_code_pol) {
      updateData.payu_response_code = response_code_pol as string;
    }

    if (response_message_pol) {
      updateData.payu_response_message = response_message_pol as string;
    }

    // Actualizar la transacción
    await transaction.update(updateData);

    // ✅ CLAVE: Si el pago fue exitoso, actualizar el trueque
    if (dbStatus === 'completada') {
      const barterId = transaction.get('id_barter') as number | null;

      if (barterId && typeof barterId === 'number') {
        console.log(`✅ Pago de trueque exitoso - Actualizando trueque ${barterId}`);

        const barter = await Barter.findByPk(barterId);

        if (barter) {
          const currentUserId = transaction.get('id_user') as number;
          const isOfferingUser = barter.get('id_user_offer') === currentUserId;

          // Marcar el checkout correspondiente como completado
          const barterUpdateData: any = {};

          if (isOfferingUser) {
            barterUpdateData.offer_checkout_completed = true;
            console.log(`👤 Usuario oferente ${currentUserId} completó su pago`);
          } else {
            barterUpdateData.request_checkout_completed = true;
            console.log(`👤 Usuario receptor ${currentUserId} completó su pago`);
          }

          // Actualizar el barter
          await barter.update(barterUpdateData);

          // Recargar para verificar estado completo
          await barter.reload();

          // Si ambos usuarios completaron sus pagos, cambiar estado del trueque
          if (barter.get('offer_checkout_completed') && barter.get('request_checkout_completed')) {
            await barter.update({
              status: 'en_proceso',
              checkout_date: new Date()
            });

            console.log('🎉 Ambos usuarios completaron el checkout - Trueque en proceso');

            // Notificar a ambos usuarios
            const userIds = [barter.get('id_user_offer'), barter.get('id_user_receiving')];

            for (const userId of userIds) {
              if (userId) {
                await saveInternalNotification(
                  userId as number,
                  '🎉 Trueque listo para intercambio',
                  'Ambos usuarios han completado el checkout. El trueque está en proceso.',
                  'barter_ready'
                );
              }
            }
          } else {
            // Solo un usuario completó, notificar al otro
            const otherUserId = isOfferingUser
              ? barter.get('id_user_receiving')
              : barter.get('id_user_offer');

            if (otherUserId) {
              await saveInternalNotification(
                otherUserId as number,
                '💰 Pago de trueque completado',
                'El otro usuario completó su pago. Ahora completa tu parte del trueque.',
                'barter_payment_completed'
              );
            }
          }
        }
      }
    }

    // Notificar al usuario que realizó el pago
    const userId = transaction.get('id_user') as number;
    if (userId) {
      let notificationTitle = '';
      let notificationMessage = '';

      switch (dbStatus) {
        case 'completada':
          notificationTitle = '✅ Pago de trueque confirmado';
          notificationMessage = `Tu pago del servicio de trueque ha sido confirmado exitosamente.`;
          break;
        case 'fallida':
          notificationTitle = '❌ Pago de trueque rechazado';
          notificationMessage = `Tu pago del servicio de trueque ha sido rechazado. Intenta con otro método de pago.`;
          break;
        case 'pendiente':
          notificationTitle = '⏳ Pago de trueque en proceso';
          notificationMessage = `Tu pago del servicio de trueque está siendo procesado.`;
          break;
      }

      if (notificationTitle) {
        // ✅ Crear notificación interna
        await saveInternalNotification(
          userId,
          notificationTitle,
          notificationMessage,
          'barter_payment'
        );

        // ✅ AGREGAR: Enviar email al usuario
        try {
          const user = await User.findByPk(userId);
          if (user && user.get('email')) {
            await sendPaymentNotificationEmail(
              user.get('email') as string,
              dbStatus,
              {
                reference,
                amount: transaction.get('total_amount'),
                date: transaction.get('transaction_date'),
                paymentMethod: 'Servicio de trueque',
                products: [{
                  name: 'Servicio de trueque',
                  quantity: 1,
                  price: transaction.get('total_amount'),
                  total: transaction.get('total_amount')
                }]
              }
            );
            console.log(`📧 Email de trueque enviado a ${user.get('email')}`);
          }
        } catch (emailError) {
          console.error('❌ Error enviando email de trueque:', emailError);
        }
      }
    }

    // ✅ REDIRIGIR AL FRONTEND con los parámetros necesarios
    const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
    const redirectUrl = `${frontendUrl}/barter-payment-response?` +
      `referenceCode=${reference}&` +
      `transactionState=${state}&` +
      `TX_VALUE=${TX_VALUE ? String(TX_VALUE) : transaction.get('total_amount')}&` +
      `currency=${currency || 'COP'}&` +
      `transactionId=${txId || ''}&` +
      `timestamp=${Date.now()}`;

    console.log(`🔗 Redirigiendo a: ${redirectUrl}`);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error al procesar respuesta de PayU para trueque:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://casanareserv.me';
    res.redirect(`${frontendUrl}/barter-payment-response?error=processing_error`);
  }
};
/**
 * Verifica el estado de un pago consultando a PayU y actualiza la base de datos
 * Maneja la lógica de notificaciones a compradores y vendedores cuando cambia el estado
 */
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference } = req.params;

    if (!reference) {
      res.status(400).json({
        success: false,
        message: 'Se requiere el código de referencia'
      });
      return;
    }

    console.log(`🔍 Verificando pago con referencia: ${reference}`);

    // ✅ BUSCAR TRANSACCIÓN
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference }
    });

    if (!transaction) {
      res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
      return;
    }

    // ✅ OBTENER DATOS POR SEPARADO
    const userId = transaction.get('id_user') as number;
    const cartId = transaction.get('id_cart') as number;

    const user = await User.findByPk(userId);
    const cart = await Cart.findOne({
      where: { id_cart: cartId },
      include: [
        {
          model: ItemCart,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ]
    });

    console.log(`📊 Estado actual de la transacción: ${transaction.get('status')}`);

    // Validar configuración de PayU
    if (!PAYU_API_KEY || !PAYU_API_LOGIN || !PAYU_MERCHANT_ID) {
      console.error('❌ Faltan credenciales de PayU');
      res.status(500).json({
        success: false,
        message: 'Error de configuración de PayU'
      });
      return;
    }

    // ✅ FORMATO CORREGIDO DEL PAYLOAD
    const payload = {
      language: "es",
      command: "ORDER_DETAIL_BY_REFERENCE_CODE",
      merchant: {
        apiKey: PAYU_API_KEY,
        apiLogin: PAYU_API_LOGIN
      },
      details: {
        referenceCode: reference
      },
      test: process.env.NODE_ENV !== 'production'
    };

    console.log('📤 Enviando consulta a PayU:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(PAYU_API_URL as string, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('📥 Respuesta de PayU:', JSON.stringify(response.data, null, 2));

      // ✅ PROCESAR RESPUESTA DE PAYU
      if (response.data.code === 'SUCCESS') {
        const payuResult = response.data.result;

        if (payuResult && payuResult.payload) {
          let newStatus: 'pendiente' | 'completada' | 'fallida' | 'reembolsada' = 'pendiente';

          // ✅ CORREGIR EL ACCESO AL ESTADO
          const orderStatus = payuResult.payload.status;
          console.log(`🔍 Estado en PayU: ${orderStatus}`);

          switch (orderStatus) {
            case 'CAPTURED':
            case 'APPROVED':
              newStatus = 'completada';
              break;
            case 'DECLINED':
            case 'EXPIRED':
            case 'CANCELLED':
              newStatus = 'fallida';
              break;
            case 'PENDING':
            default:
              newStatus = 'pendiente';
              break;
          }

          console.log(`🔄 Estado determinado: ${newStatus}`);

          const oldStatus = transaction.get('status');

          // ✅ ACTUALIZAR TRANSACCIÓN
          console.log(`📝 Actualizando transacción: ${oldStatus} → ${newStatus}`);

          await transaction.update({
            status: newStatus,
            payu_transaction_id: payuResult.payload.transactions?.[0]?.id || null,
            payu_order_id: payuResult.payload.id || null,
            payu_state: orderStatus || null
          });

          console.log(`✅ Transacción actualizada correctamente`);

          // Verificar cambio de estado para notificaciones
          if (oldStatus !== newStatus) {
            console.log(`📧 Estado cambió, enviando notificaciones...`);

            if (user && user.get('email') && cart) {
              const cartItems = (cart.get('items') as any[]) || [];

              const productsList = cartItems.map((item: any) => ({
                name: item.get('product').get('name'),
                quantity: item.get('quantity'),
                price: item.get('price') || item.get('product').get('price')
              }));

              await sendPaymentNotificationEmail(user.get('email') as string, newStatus, {
                reference,
                amount: transaction.get('total_amount'),
                date: transaction.get('transaction_date'),
                paymentMethod: transaction.get('payment_method'),
                products: productsList
              });

              let notificationTitle = '';
              let notificationMessage = '';

              switch (newStatus) {
                case 'completada':
                  notificationTitle = '¡Pago confirmado!';
                  notificationMessage = `Tu pago por ${transaction.get('total_amount')} COP ha sido confirmado. Referencia: ${reference}`;
                  break;
                case 'fallida':
                  notificationTitle = 'Pago rechazado';
                  notificationMessage = `Tu pago por ${transaction.get('total_amount')} COP ha sido rechazado. Referencia: ${reference}`;
                  break;
              }

              if (notificationTitle) {
                await saveInternalNotification(
                  user.get('id') as number,
                  notificationTitle,
                  notificationMessage,
                  'payment'
                );

                // ✅ NOTIFICAR A VENDEDORES SOLO SI SE COMPLETÓ
                if (newStatus === 'completada') {
                  await updateStockAfterPayment(transaction);
                  console.log('💰 PAGO COMPLETADO - NOTIFICANDO A VENDEDORES');

                  try {
                    const cartItems = await ItemCart.findAll({
                      where: { id_cart: cartId },
                      include: [
                        {
                          model: Product,
                          as: 'product',
                          include: [
                            {
                              model: User,
                              as: 'user',
                              attributes: ['id', 'name', 'email']
                            }
                          ]
                        }
                      ]
                    });

                    const sellerProducts = new Map<number, { seller: any; products: any[] }>();

                    for (const item of cartItems) {
                      const product = item.get('product') as any;
                      const seller = product?.get('user');

                      if (seller) {
                        const sellerId = seller.get('id') as number;

                        if (!sellerProducts.has(sellerId)) {
                          sellerProducts.set(sellerId, {
                            seller: seller,
                            products: []
                          });
                        }

                        sellerProducts.get(sellerId)!.products.push({
                          name: product.get('name'),
                          quantity: item.get('quantity'),
                          price: item.get('price') || product.get('price'),
                          productId: product.get('id_product')
                        });
                      }
                    }

                    for (const [sellerId, data] of sellerProducts) {
                      const seller = data.seller;
                      const products = data.products;

                      const totalForSeller = products.reduce((sum: number, p: any) =>
                        sum + (p.price * p.quantity), 0
                      );

                      if (seller.get('email')) {
                        await sendSellerNotificationEmail(
                          seller.get('email'),
                          seller.get('name'),
                          (user?.get('name') as string) || 'Cliente',
                          {
                            reference: reference,
                            amount: totalForSeller,
                            date: transaction.get('transaction_date'),
                            paymentMethod: transaction.get('payment_method'),
                            products: products
                          }
                        );
                      }

                      const productNames = products.map((p: any) => p.name).join(', ');
                      const formattedAmount = new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP'
                      }).format(totalForSeller);

                      await saveInternalNotification(
                        sellerId as number,
                        '🎉 ¡Has realizado una venta!',
                        `Tu producto "${productNames}" ha sido comprado por ${formattedAmount}. Referencia: ${reference}`,
                        'sale_notification',
                        'transaction',
                        transaction.get('id_transaction') as number
                      );
                    }
                  } catch (sellerNotificationError) {
                    console.error('❌ Error al notificar vendedores:', sellerNotificationError);
                  }
                }
              }
            }
          } else {
            console.log(`ℹ️ Estado no cambió: ${oldStatus}`);
          }

          // ✅ RETORNAR ESTADO ACTUALIZADO
          res.status(200).json({
            success: true,
            data: {
              status: newStatus,
              paymentMethod: transaction.get('payment_method'),
              amount: transaction.get('total_amount'),
              date: transaction.get('transaction_date'),
              reference: reference,
              payuResponse: response.data
            }
          });
          return;
        }
      }

      // ✅ SI PAYU NO ENCUENTRA LA TRANSACCIÓN
      console.log('⚠️ PayU no encontró la transacción');

      res.status(200).json({
        success: true,
        data: {
          status: transaction.get('status'),
          paymentMethod: transaction.get('payment_method'),
          amount: transaction.get('total_amount'),
          date: transaction.get('transaction_date'),
          reference: reference,
          message: 'PayU no encontró la transacción - usando estado de BD'
        }
      });

    } catch (axiosError: any) {
      console.error('❌ Error en consulta a PayU:', axiosError.message);

      // En caso de error, devolver estado actual
      res.status(200).json({
        success: true,
        data: {
          status: transaction.get('status'),
          paymentMethod: transaction.get('payment_method'),
          amount: transaction.get('total_amount'),
          date: transaction.get('transaction_date'),
          reference: reference,
          error: 'Error consultando PayU'
        }
      });
    }

  } catch (error: any) {
    console.error('❌ Error general al verificar pago:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al verificar estado del pago',
      error: error.message
    });
  }
};
/**
 * Crea una transacción de pago de trueque usando WebCheckout de PayU
 * Configura URLs específicas para trueques y genera datos necesarios para el checkout
 */
export const createBarterWebCheckoutPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      id_user,
      id_barter,
      buyerEmail,
      buyerName,
      buyerPhone,
      total,
      description = 'Servicio de trueque en CasanareServ'
    } = req.body;

    // Validar datos de entrada
    if (!id_user || !id_barter || !total) {
      res.status(400).json({
        success: false,
        message: 'Faltan datos obligatorios para el pago de trueque'
      });
      return;
    }

    // Generar referencia única para la transacción de trueque
    const reference = `BARTER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Crear transacción en la base de datos
    const transaction = await Transaction.create({
      id_user,
      id_barter,
      status: 'pendiente',
      reference_payu: reference,
      total_amount: total,
      currency: 'COP',
      payment_method: 'CREDIT_CARD',
      transaction_date: new Date(),
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      buyer_phone: buyerPhone || null
    });

    // Configuración de PayU WebCheckout para trueques
    const payuConfig = {
      apiKey: process.env.PAYU_API_KEY || '4Vj8eK4rloUd272L48hsrarnUA',
      merchantId: process.env.PAYU_MERCHANT_ID || '508029',
      accountId: process.env.PAYU_ACCOUNT_ID || '512321',
      url: process.env.PAYU_URL || 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
      // ✅ URLs específicas para trueques
      responseUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/barter-payment-response` : 'https://casanareserv.me/barter-payment-response',
      confirmationUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/barter-payu-confirmation` : 'https://api.casanareserv.me/api/transaction/barter-payu-confirmation',
      test: process.env.NODE_ENV !== 'production' ? 1 : 0
    };

    // Datos para la firma
    const amount = total.toString();
    const currency = 'COP';

    // Generar firma MD5
    const signature = crypto
      .createHash('md5')
      .update(`${payuConfig.apiKey}~${payuConfig.merchantId}~${reference}~${amount}~${currency}`)
      .digest('hex');

    // Guardar la firma en la transacción
    await transaction.update({
      signature,
      response_url: payuConfig.responseUrl
    });

    // Datos para el frontend
    const webCheckoutData = {
      url: payuConfig.url,
      reference: reference,
      formData: {
        merchantId: payuConfig.merchantId,
        accountId: payuConfig.accountId,
        description: description,
        referenceCode: reference,
        amount: amount,
        tax: '0',
        taxReturnBase: '0',
        currency: currency,
        signature: signature,
        test: payuConfig.test,
        buyerEmail: buyerEmail,
        buyerFullName: buyerName,
        responseUrl: payuConfig.responseUrl,
        confirmationUrl: payuConfig.confirmationUrl
      }
    };

    res.json(webCheckoutData);
  } catch (error) {
    console.error('Error al crear pago de trueque con WebCheckout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el pago de trueque',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};
/**
 * Endpoint de confirmación para PayU (webhook) específico para pagos de trueque
 * Procesa notificaciones de PayU y actualiza tanto la transacción como el estado del barter
 */
export const barterPayuConfirmation = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔔 CONFIRMACIÓN DE PAYU PARA TRUEQUE RECIBIDA:');
    console.log('- Body:', JSON.stringify(req.body, null, 2));

    const payuResponse = req.body;

    // Obtener referencia de la transacción
    const reference = payuResponse.reference_sale || payuResponse.referenceCode;
    if (!reference) {
      console.error('Notificación de trueque sin referencia');
      res.status(400).send('FAILED: No reference code');
      return;
    }

    // Buscar la transacción de trueque por referencia
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference },
      include: [
        { model: User, as: 'transactionUser' }
      ]
    });

    if (!transaction) {
      console.error('Transacción de trueque no encontrada:', reference);
      res.status(404).send('FAILED: Barter transaction not found');
      return;
    }

    console.log(`📊 Transacción de trueque encontrada. Estado actual: ${transaction.get('status')}`);

    const user = transaction.get('transactionUser') as any;

    // Actualizar estado según la notificación
    let newStatus = 'pendiente';
    const payuStatus = payuResponse.status_pol || payuResponse.status || payuResponse.state_pol;

    console.log(`🔍 Estado de PayU recibido para trueque: ${payuStatus}`);

    switch (payuStatus) {
      case '4': // Aprobado
      case 'APPROVED':
        newStatus = 'completada';
        break;
      case '5': // Expirado
      case '6': // Rechazado
      case 'DECLINED':
      case 'EXPIRED':
        newStatus = 'fallida';
        break;
      case '7': // Pendiente
      case 'PENDING':
        newStatus = 'pendiente';
        break;
    }

    console.log(`🔄 Estado determinado para trueque: ${newStatus}`);

    const oldStatus = transaction.get('status');

    // Actualizar transacción
    await transaction.update({
      status: newStatus as 'pendiente' | 'completada' | 'fallida' | 'reembolsada',
      payment_method: payuResponse.payment_method_name || payuResponse.payment_method || transaction.get('payment_method'),
      payu_transaction_id: payuResponse.transaction_id || null,
      payu_order_id: payuResponse.reference_pol || null,
      payu_state: String(payuStatus),
      payu_response_message: payuResponse.response_message_pol || null
    });

    console.log(`✅ Transacción de trueque actualizada: ${oldStatus} → ${newStatus}`);

    // ✅ PROCESAR CAMBIO DE ESTADO
    if (oldStatus !== newStatus) {
      console.log(`🔔 Estado de trueque cambió, procesando notificaciones...`);

      // Si el pago fue exitoso, actualizar el trueque
      if (newStatus === 'completada') {
        const barterId = transaction.get('id_barter') as number | null;

        if (barterId && typeof barterId === 'number') {
          // ✅ AGREGAR ESTOS LOGS AQUÍ
          console.log(`🔍 [DEBUG-CONFIRMATION] =====================================`);
          console.log(`🔍 [DEBUG-CONFIRMATION] Pago completado, llamando updateBarterPaymentStatus`);
          console.log(`🔍 [DEBUG-CONFIRMATION] Referencia: ${reference}`);
          console.log(`🔍 [DEBUG-CONFIRMATION] Barter ID: ${barterId}`);
          console.log(`🔍 [DEBUG-CONFIRMATION] Usuario ID de transacción: ${transaction.get('id_user')}`);
          console.log(`🔍 [DEBUG-CONFIRMATION] Estado anterior: ${oldStatus} → ${newStatus}`);
          console.log(`🔍 [DEBUG-CONFIRMATION] =====================================`);

          console.log(`💰 PAGO DE TRUEQUE CONFIRMADO - Actualizando barter ${barterId}`);

          // ✅ ANTES de llamar updateBarterPaymentStatus
          console.log(`🔄 [DEBUG-CONFIRMATION] ANTES de llamar updateBarterPaymentStatus...`);

          const barter = await Barter.findByPk(barterId);

          if (barter) {
            const currentUserId = transaction.get('id_user') as number;
            const isOfferingUser = barter.get('id_user_offer') === currentUserId;

            // ✅ CORREGIR: Determinar qué campo de pago actualizar
            let paymentUpdateData: any = {};

            if (isOfferingUser) {
              paymentUpdateData = {
                offer_payment_completed: true,
                offer_payment_date: new Date()
              };
              console.log(`✅ Usuario A (${currentUserId}) completó el pago para barter ${barterId}`);
            } else {
              paymentUpdateData = {
                request_payment_completed: true,
                request_payment_date: new Date()
              };
              console.log(`✅ Usuario B (${currentUserId}) completó el pago para barter ${barterId}`);
            }

            // NUEVA CORRECCIÓN: Actualizar los campos de pago CORRECTAMENTE
            if (Object.keys(paymentUpdateData).length > 0) {
              console.log(`📝 Actualizando barter ${barterId} con:`, paymentUpdateData);

              await barter.update(paymentUpdateData);

              // Verificar que se actualizó correctamente
              await barter.reload();
              console.log(`🔍 Verificación post-actualización:`, {
                offer_payment_completed: barter.get('offer_payment_completed'),
                request_payment_completed: barter.get('request_payment_completed'),
                offer_payment_date: barter.get('offer_payment_date'),
                request_payment_date: barter.get('request_payment_date')
              });

              // ✅ VERIFICAR SI AMBOS USUARIOS HAN PAGADO
              console.log(`🔧 Llamando checkAndUpdateBarterCompletion para barter ${barterId}`);
              try {
                await checkAndUpdateBarterCompletion(barterId);
                console.log(`✅ checkAndUpdateBarterCompletion ejecutada exitosamente`);
              } catch (completionError) {
                console.error(`❌ Error en checkAndUpdateBarterCompletion:`, completionError);
              }
            }
            // ✅ AGREGAR: Actualizar estado de pago del barter
            console.log(`🔄 Confirmación de trueque completada - Actualizando barter`);
            await updateBarterPaymentStatus(transaction);
            // ✅ DESPUÉS de llamar updateBarterPaymentStatus
            console.log(`✅ [DEBUG-CONFIRMATION] updateBarterPaymentStatus ejecutada`);
            console.log(`🔍 [DEBUG-CONFIRMATION] =====================================`);
            // Verificar si ambos usuarios completaron sus pagos
            const offerCompleted = barter.get('offer_payment_completed');
            const requestCompleted = barter.get('request_payment_completed');

            if (offerCompleted && requestCompleted) {
              console.log('🎉 Ambos usuarios completaron el pago - Notificando');

              // Notificar a ambos usuarios
              const userIds = [barter.get('id_user_offer'), barter.get('id_user_receiving')];

              for (const userId of userIds) {
                if (userId) {
                  await saveInternalNotification(
                    userId as number,
                    '🎉 Trueque listo para intercambio',
                    'Ambos usuarios han completado el pago. El trueque está listo.',
                    'barter_ready',
                    'barter',
                    barterId
                  );
                  console.log(`🔔 Notificación de trueque listo enviada al usuario ${userId}`);
                }
              }
            } else {
              // Solo un usuario completó, notificar al otro
              const otherUserId = isOfferingUser
                ? barter.get('id_user_receiving')
                : barter.get('id_user_offer');

              if (otherUserId) {
                await saveInternalNotification(
                  otherUserId as number,
                  '💰 Pago de trueque completado',
                  'El otro usuario completó su pago. Ahora completa tu parte del trueque.',
                  'barter_payment_completed',
                  'barter',
                  barterId
                );
                console.log(`🔔 Notificación de pago completado enviada al usuario ${otherUserId}`);
              }
            }
          }
        }
      }

      // ✅ NOTIFICAR AL USUARIO QUE REALIZÓ EL PAGO
      const userId = transaction.get('id_user') as number;
      if (userId) {
        let notificationTitle = '';
        let notificationMessage = '';

        switch (newStatus) {
          case 'completada':
            notificationTitle = '✅ Pago de trueque confirmado';
            notificationMessage = `Tu pago del servicio de trueque ha sido confirmado exitosamente. Referencia: ${reference}`;
            break;
          case 'fallida':
            notificationTitle = '❌ Pago de trueque rechazado';
            notificationMessage = `Tu pago del servicio de trueque ha sido rechazado. Intenta con otro método de pago. Referencia: ${reference}`;
            break;
          case 'pendiente':
            notificationTitle = '⏳ Pago de trueque en proceso';
            notificationMessage = `Tu pago del servicio de trueque está siendo procesado. Referencia: ${reference}`;
            break;
        }

        if (notificationTitle) {
          // ✅ Crear notificación interna
          await saveInternalNotification(
            userId,
            notificationTitle,
            notificationMessage,
            'barter_payment',
            'transaction',
            transaction.get('id_transaction') as number
          );
          console.log(`🔔 Notificación interna creada para usuario ${userId}: ${notificationTitle}`);

          // ✅ ENVIAR EMAIL AL USUARIO
          if (user && user.get('email')) {
            try {
              const transactionInfo = {
                reference: reference,
                amount: transaction.get('total_amount'),
                date: transaction.get('transaction_date'),
                paymentMethod: 'Servicio de trueque',
                message: payuResponse.response_message_pol || '',
                products: [{
                  name: 'Servicio de trueque',
                  quantity: 1,
                  price: transaction.get('total_amount'),
                  total: transaction.get('total_amount')
                }]
              };

              await sendPaymentNotificationEmail(
                user.get('email') as string,
                newStatus,
                transactionInfo
              );
              console.log(`📧 Email de trueque enviado a ${user.get('email')}`);
            } catch (emailError) {
              console.error('❌ Error enviando email de trueque:', emailError);
            }
          } else {
            console.warn('⚠️ No se pudo enviar email: usuario sin email');
          }
        }
      }
    } else {
      console.log(`ℹ️ Estado de trueque no cambió (${oldStatus}), no se envían notificaciones`);
    }

    console.log('✅ Confirmación de PayU para trueque procesada exitosamente');
    res.status(200).send('OK');
    
    if (newStatus === 'completada') {
      console.log(`💰 [BARTER-CONFIRMATION] Pago completado via confirmación, actualizando estado del barter...`);
      await updateBarterPaymentStatus(transaction);
      console.log(`✅ [BARTER-CONFIRMATION] Estado del barter actualizado`);
    }
  } catch (error: any) {
    console.error('❌ Error en confirmación de pago de trueque:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).send('ERROR');
  }
};
/**
 * Actualiza el estado de un pago de trueque (para testing)
 */
export const updateBarterPaymentStatusEndpoint = async (req: Request, res: Response) => {
  try {
    const { reference, status } = req.body;

    console.log(`🔄 Actualizando estado de pago de trueque: ${reference} -> ${status}`);

    if (!reference || !status) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere referencia y estado'
      });
    }

    // Buscar y actualizar la transacción
    const transaction = await Transaction.findOne({
      where: {
        reference_payu: reference
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
    }

    // Actualizar el estado
    await transaction.update({
      status: status,
      transaction_date: new Date()
    });

    console.log(`✅ Estado de transacción actualizado: ${reference} -> ${status}`);

    res.json({
      success: true,
      message: 'Estado de pago actualizado correctamente',
      transaction: {
        id: transaction.get('id_transaction'),
        reference: transaction.get('reference_payu'),
        status: transaction.get('status'),
        amount: transaction.get('total_amount'),
        date: transaction.get('transaction_date')
      }
    });

  } catch (error: any) {
    console.error('❌ Error actualizando estado de pago de trueque:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};
/**
 * Obtiene los productos vendidos por un usuario (productos que le han comprado)
 * GET /api/payment/sold/:userId
 */
export const getSoldProducts = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuario requerido'
      });
    }

    console.log(`🔍 Buscando productos vendidos para usuario: ${userId}`);

    // Buscar transacciones completadas donde los productos pertenecen al usuario
    const soldTransactions = await Transaction.findAll({
      where: {
        status: 'completada' // Solo transacciones completadas
      },
      include: [
        {
          model: Cart,
          as: 'cartInfo',
          include: [
            {
              model: ItemCart,
              as: 'items',
              include: [
                {
                  model: Product,
                  as: 'product',
                  where: {
                    id_user: userId // Solo productos que pertenecen al usuario vendedor
                  },
                  include: [
                    {
                      model: Image,
                      as: 'productImages',
                      required: false
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'transactionUser',
          attributes: ['id', 'name', 'email'] // Datos del comprador
        }
      ],
      order: [['transaction_date', 'DESC']]
    });

    // Procesar las transacciones para extraer los productos vendidos
    const soldProducts: any[] = [];

    soldTransactions.forEach((transaction: any) => {
      const cart = transaction.get('cartInfo');
      const buyer = transaction.get('transactionUser');
      const transactionData = {
        id_transaction: transaction.get('id_transaction'),
        total_amount: transaction.get('total_amount'),
        transaction_date: transaction.get('transaction_date'),
        payment_method: transaction.get('payment_method'),
        reference_payu: transaction.get('reference_payu'),
        buyer: {
          id: buyer?.get('id'),
          name: buyer?.get('name'),
          email: buyer?.get('email')
        }
      };

      if (cart && cart.items) {
        cart.items.forEach((item: any) => {
          const product = item.product;
          if (product && product.id_user === parseInt(userId)) {
            soldProducts.push({
              // Datos del producto
              id_product: product.id_product,
              name: product.name,
              description: product.description,
              price: product.price,
              type: product.type,
              productImages: product.productImages || [],

              // Datos de la venta
              quantity_sold: item.quantity,
              sale_price: item.price,
              sale_total: item.quantity * item.price,
              sale_date: transactionData.transaction_date,

              // Datos de la transacción
              transaction: transactionData,

              // Datos del comprador
              buyer: transactionData.buyer,

              // Estado de venta
              status: 'vendido'
            });
          }
        });
      }
    });

    console.log(`✅ Encontrados ${soldProducts.length} productos vendidos para usuario ${userId}`);

    res.json(soldProducts);
  } catch (error) {
    console.error('❌ Error al obtener productos vendidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cargar productos vendidos',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};