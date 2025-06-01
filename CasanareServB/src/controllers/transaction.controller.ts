import { literal, col, fn } from 'sequelize';
import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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
import { Model } from 'sequelize';

/**
 * Controlador para manejo de pagos a través de PayU Latam
 * Incluye funciones para crear pagos, recibir notificaciones y verificar estados
 */

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
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3006';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

/**
 * Envía un correo electrónico de notificación de pago
 * @param to Email del destinatario
 * @param status Estado del pago
 * @param transactionInfo Información de la transacción
 */
async function sendPaymentNotificationEmail(to: string, status: string, transactionInfo: any): Promise<boolean> {
  try {
    console.log('🚀 Enviando notificación de pago a:', to);

    let subject = '';
    let emailContent = '';
    let buttonText = '';
    let buttonColor = '';

    // Formatear monto y fecha
    const formattedAmount = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(transactionInfo.amount);

    const formattedDate = new Date(transactionInfo.date).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // ✅ DETECTAR SI ES TRUEQUE
    const isBarter = transactionInfo.paymentMethod === 'Servicio de trueque' ||
      transactionInfo.products?.some((p: any) => p.name === 'Servicio de trueque');

    // Construir lista de productos si está disponible
    let productsList = '';
    if (transactionInfo.products && transactionInfo.products.length > 0) {
      if (isBarter) {
        // ✅ PARA TRUEQUES: Mostrar información específica
        productsList = `
          <h3 style="color: #333; margin-top: 20px;">Servicio:</h3>
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <p style="margin: 0;"><strong>🔄 Servicio de Trueque</strong></p>
            <p style="margin: 5px 0; color: #666;">Permite realizar intercambios seguros entre usuarios</p>
            <p style="margin: 5px 0; color: #666;">Incluye: Gestión de intercambio, soporte y garantías</p>
          </div>
        `;
      } else {
        // ✅ PARA PRODUCTOS: Mantener lista original
        productsList = `
          <h3 style="color: #333; margin-top: 20px;">Productos:</h3>
          <ul style="padding-left: 20px;">
            ${transactionInfo.products.map((product: any) => `
              <li style="margin-bottom: 10px;">
                <strong>${product.name}</strong> - 
                Cantidad: ${product.quantity} - 
                Precio: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price)}
              </li>
            `).join('')}
          </ul>
        `;
      }
    }

    // Configurar contenido según el estado
    switch (status) {
      case 'completada':
        if (isBarter) {
          // ✅ CONTENIDO ESPECÍFICO PARA TRUEQUES
          subject = '🔄 ¡Pago de trueque confirmado en CasanareServ!';
          buttonText = 'Ver mis trueques';
          buttonColor = '#4CAF50';
          emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #4CAF50; text-align: center;">🔄 ¡Pago de Trueque Confirmado!</h2>
              <p>Estimado usuario:</p>
              <p>Nos complace informarte que tu pago del <strong>servicio de trueque</strong> ha sido procesado exitosamente.</p>
              <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
                <p><strong>Monto:</strong> ${formattedAmount}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
                <p><strong>Servicio:</strong> Trueque Seguro</p>
              </div>
              ${productsList}
              <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="margin-top: 0; color: #2e7d32;">🎯 Próximos pasos:</h4>
                <ul style="margin: 0; color: #2e7d32;">
                  <li>Coordina con el otro usuario para el intercambio</li>
                  <li>Utiliza nuestro chat integrado para comunicarte</li>
                  <li>Realiza el intercambio en un lugar seguro</li>
                  <li>Confirma la recepción una vez completado</li>
                </ul>
              </div>
            </div>
          `;
        } else {
          // ✅ MANTENER CONTENIDO ORIGINAL PARA PRODUCTOS
          subject = '¡Pago confirmado en CasanareServ!';
          buttonText = 'Ver mis compras';
          buttonColor = '#4CAF50';
          emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #4CAF50; text-align: center;">¡Pago Confirmado!</h2>
              <p>Estimado cliente:</p>
              <p>Nos complace informarte que tu pago ha sido <strong>procesado exitosamente</strong>.</p>
              <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
                <p><strong>Monto:</strong> ${formattedAmount}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
                <p><strong>Método de pago:</strong> ${transactionInfo.paymentMethod || 'PayU'}</p>
              </div>
              ${productsList}
              <p>Tu compra está siendo procesada y pronto te informaremos sobre el envío.</p>
            </div>
          `;
        }
        break;

      case 'pendiente':
        if (isBarter) {
          subject = '⏳ Tu pago de trueque está en proceso';
          buttonText = 'Ver estado del trueque';
          buttonColor = '#FF9800';
          emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #FF9800; text-align: center;">⏳ Pago de Trueque en Procesamiento</h2>
              <p>Estimado usuario:</p>
              <p>Tu pago del <strong>servicio de trueque</strong> está siendo procesado y se encuentra pendiente de confirmación.</p>
              <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
                <p><strong>Monto:</strong> ${formattedAmount}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
              </div>
              ${productsList}
              <p>Te notificaremos cuando el pago sea confirmado para proceder con el intercambio.</p>
            </div>
          `;
        } else {
          // ✅ MANTENER CONTENIDO ORIGINAL
          subject = 'Tu pago en CasanareServ está en proceso';
          buttonText = 'Verificar estado';
          buttonColor = '#FF9800';
          emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #FF9800; text-align: center;">Pago en Procesamiento</h2>
              <p>Estimado cliente:</p>
              <p>Tu pago está siendo <strong>procesado</strong> y se encuentra pendiente de confirmación.</p>
              <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
                <p><strong>Monto:</strong> ${formattedAmount}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
              </div>
              ${productsList}
              <p>Te notificaremos cuando el pago sea confirmado.</p>
            </div>
          `;
        }
        break;

      case 'fallida':
        if (isBarter) {
          subject = '❌ Pago de trueque rechazado';
          buttonText = 'Intentar nuevamente';
          buttonColor = '#F44336';
          emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #F44336; text-align: center;">❌ Pago de Trueque Rechazado</h2>
              <p>Estimado usuario:</p>
              <p>Lamentamos informarte que tu pago del <strong>servicio de trueque</strong> ha sido rechazado.</p>
              <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
                <p><strong>Monto:</strong> ${formattedAmount}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
                <p><strong>Motivo:</strong> ${transactionInfo.message || 'Pago rechazado por la entidad financiera'}</p>
              </div>
              ${productsList}
              <p>Por favor, verifica los datos de tu tarjeta e intenta nuevamente para proceder con el trueque.</p>
            </div>
          `;
        } else {
          // ✅ MANTENER CONTENIDO ORIGINAL
          subject = 'Pago rechazado en CasanareServ';
          buttonText = 'Intentar nuevamente';
          buttonColor = '#F44336';
          emailContent = `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2 style="color: #F44336; text-align: center;">Pago Rechazado</h2>
              <p>Estimado cliente:</p>
              <p>Lamentamos informarte que tu pago ha sido <strong>rechazado</strong>.</p>
              <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
                <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
                <p><strong>Monto:</strong> ${formattedAmount}</p>
                <p><strong>Fecha:</strong> ${formattedDate}</p>
                <p><strong>Motivo:</strong> ${transactionInfo.message || 'Pago rechazado por la entidad financiera'}</p>
              </div>
              ${productsList}
              <p>Por favor, verifica los datos de tu tarjeta e intenta nuevamente.</p>
            </div>
          `;
        }
        break;

      case 'reembolsada':
        // ✅ MANTENER CASO ORIGINAL (es común para ambos)
        subject = 'Reembolso procesado en CasanareServ';
        buttonText = 'Ver detalle';
        buttonColor = '#2196F3';
        emailContent = `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #2196F3; text-align: center;">Reembolso Procesado</h2>
            <p>Estimado ${isBarter ? 'usuario' : 'cliente'}:</p>
            <p>Te informamos que el <strong>reembolso</strong> de tu ${isBarter ? 'servicio de trueque' : 'compra'} ha sido procesado.</p>
            <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
              <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
              <p><strong>Monto reembolsado:</strong> ${formattedAmount}</p>
              <p><strong>Fecha:</strong> ${formattedDate}</p>
            </div>
            ${productsList}
            <p>El monto será acreditado según las políticas de tu entidad financiera.</p>
          </div>
        `;
        break;
    }

    // ✅ MODIFICAR BOTÓN SEGÚN TIPO
    const buttonAndFooter = `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${isBarter ? `${FRONTEND_URL}/mis-trueques` : `${FRONTEND_URL}/mis-compras`}" 
          style="background-color: ${buttonColor}; color: white; padding: 12px 25px; 
                 text-decoration: none; border-radius: 4px; font-weight: bold;">
          ${buttonText}
        </a>
      </div>
      <p style="color: #777; font-size: 12px; text-align: center; margin-top: 30px;">
        Este es un mensaje automático, por favor no respondas a este correo.<br>
        © ${new Date().getFullYear()} CasanareServ. Todos los derechos reservados.
      </p>
    `;

    // Componer el email completo
    const emailBody = emailContent + buttonAndFooter;

    // Crear mensaje
    const msg = {
      to,
      from: {
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject,
      text: `Actualización sobre tu ${isBarter ? 'pago de trueque' : 'pago'} en CasanareServ. Referencia: ${transactionInfo.reference}, Monto: ${formattedAmount}, Estado: ${status}.`,
      html: emailBody
    };

    // Enviar email
    return sgMail
      .send(msg)
      .then((response) => {
        console.log(`✅ Email de notificación de ${isBarter ? 'trueque' : 'pago'} enviado correctamente`);
        console.log(`Status code: ${response[0].statusCode}`);
        return true;
      })
      .catch((error) => {
        console.error(`❌ Error al enviar email de notificación de ${isBarter ? 'trueque' : 'pago'}`);
        if (error.response) {
          console.error(`Status code: ${error.response.statusCode}`);
          console.error(`Body: ${JSON.stringify(error.response.body)}`);
        } else {
          console.error(`Error: ${error.message}`);
        }
        return false;
      });
  } catch (error: any) {
    console.error('❌ Error general al preparar el email:', error);
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
      currency: 'COP'
    }).format(transactionInfo.amount);

    const formattedDate = new Date(transactionInfo.date).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Construir lista de productos vendidos
    let productsList = '';
    if (transactionInfo.products && transactionInfo.products.length > 0) {
      productsList = `
        <h3 style="color: #333; margin-top: 20px;">Productos vendidos:</h3>
        <ul style="padding-left: 20px;">
          ${transactionInfo.products.map((product: any) => `
            <li style="margin-bottom: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
              <strong style="color: #28a745;">${product.name}</strong><br>
              <span style="color: #666;">Cantidad vendida: ${product.quantity}</span><br>
              <span style="color: #666;">Precio unitario: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price)}</span><br>
              <span style="color: #333; font-weight: bold;">Total: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price * product.quantity)}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    const emailContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #28a745; text-align: center;">🎉 ¡Felicidades! Has realizado una venta</h2>
        <p>Hola <strong>${sellerName}</strong>:</p>
        <p>¡Excelentes noticias! Te informamos que uno de tus productos ha sido <strong>comprado exitosamente</strong>.</p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #155724; margin-top: 0;">📋 Detalles de la venta:</h3>
          <p><strong>Comprador:</strong> ${buyerName}</p>
          <p><strong>Referencia:</strong> ${transactionInfo.reference}</p>
          <p><strong>Monto total:</strong> ${formattedAmount}</p>
          <p><strong>Fecha de compra:</strong> ${formattedDate}</p>
          <p><strong>Método de pago:</strong> ${transactionInfo.paymentMethod || 'PayU'}</p>
        </div>
        
        ${productsList}
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <h4 style="color: #856404; margin-top: 0;">📦 Próximos pasos:</h4>
          <ul style="color: #856404; margin: 0;">
            <li>Prepara el producto para envío</li>
            <li>Coordina la entrega con el comprador</li>
            <li>Actualiza el estado del pedido en tu panel</li>
            <li>Mantén comunicación con el comprador</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/user-profile?tab=en-venta" 
            style="background-color: #28a745; color: white; padding: 15px 30px; 
                   text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Ver mis ventas
          </a>
        </div>
        
        <p style="color: #777; font-size: 12px; text-align: center; margin-top: 30px;">
          Este es un mensaje automático, por favor no respondas a este correo.<br>
          © ${new Date().getFullYear()} CasanareServ. Todos los derechos reservados.
        </p>
      </div>
    `;

    // Crear mensaje
    const msg = {
      to: sellerEmail,
      from: {
        email: process.env.EMAIL_FROM || 'no-reply@casanareserv.me',
        name: 'CasanareServ'
      },
      subject: '🎉 ¡Has realizado una venta en CasanareServ!',
      text: `¡Felicidades! Has vendido un producto en CasanareServ. Comprador: ${buyerName}, Monto: ${formattedAmount}, Referencia: ${transactionInfo.reference}.`,
      html: emailContent
    };

    // Enviar email
    return sgMail
      .send(msg)
      .then((response) => {
        console.log('✅ Email de notificación al vendedor enviado correctamente');
        console.log(`Status code: ${response[0].statusCode}`);
        return true;
      })
      .catch((error) => {
        console.error('❌ Error al enviar email al vendedor');
        if (error.response) {
          console.error(`Status code: ${error.response.statusCode}`);
          console.error(`Body: ${JSON.stringify(error.response.body)}`);
        } else {
          console.error(`Error: ${error.message}`);
        }
        return false;
      });
  } catch (error: any) {
    console.error('❌ Error general al preparar email del vendedor:', error);
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
 * Crea firma MD5 para seguridad de transacciones
 * @param referenceCode Código de referencia único 
 * @param amount Monto total de la transacción
 * @param currency Moneda (COP por defecto)
 * @returns Firma MD5 para validación
 */
function createSignature(referenceCode: string, amount: number, currency = 'COP'): string {
  const stringToHash = `${PAYU_API_KEY}~${PAYU_MERCHANT_ID}~${referenceCode}~${amount}~${currency}`;
  return crypto.createHash('md5').update(stringToHash).digest('hex');
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
            URL_PAYMENT_REDIRECT: `http://localhost:4200/payment-sandbox?ref=${reference}&amount=${total}`
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
 * Recibe notificaciones de confirmación de pago desde PayU
 * POST /api/payment/notification
 */

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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
      return res.redirect(`${frontendUrl}/payment-response?error=no_reference`);
    }

    // Buscar transacción en la base de datos
    const transaction = await Transaction.findOne({
      where: { reference_payu: reference }
    });

    if (!transaction) {
      console.error(`❌ Transacción no encontrada: ${reference}`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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
      responseUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/payu-response` : 'http://localhost:3006/api/transaction/payu-response',
      confirmationUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/barter-payu-confirmation` : 'http://localhost:3006/api/transaction/barter-payu-confirmation', test: process.env.NODE_ENV !== 'production' ? 1 : 0
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

// ✅ FUNCIÓN AUXILIAR PARA GENERAR FIRMA DE SEGURIDAD
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
// En transaction.controller.ts - AGREGAR ESTE MÉTODO
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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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

    // ❌ FALTA: Enviar email al usuario
    // ❌ FALTA: Necesitas obtener el email del usuario y enviar correo

    // ✅ REDIRIGIR AL FRONTEND con los parámetros necesarios
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/barter-payment-response?error=processing_error`);
  }
};

// REEMPLAZAR completamente el método verifyPayment:
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
      responseUrl: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/barter-payment-response` : 'http://localhost:4200/barter-payment-response',
      confirmationUrl: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/transaction/barter-payu-confirmation` : 'http://localhost:3006/api/transaction/barter-payu-confirmation',
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


// BUSCAR la función barterPayuConfirmation y REEMPLAZAR completamente por esta versión corregida:

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
// ✅ EL ARCHIVO DEBE TERMINAR AQUÍ - NO MÁS CÓDIGO DESPUÉS