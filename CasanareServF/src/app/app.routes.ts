import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { FormloginComponent } from './formlogin/formlogin.component';
import { LoginComponent } from './login/login.component';
import { TiendaComponent } from './tienda/tienda.component';
import { ShopDetailComponent } from './shop-detail/shop-detail.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { CartComponent } from './cart/cart.component';
import { ContactComponent } from './contact/contact.component';
import { FormularioVenderComponent } from './formulario-vender/formulario-vender.component';
import { FaqComponent } from './faq/faq.component';
import { ShipmentTrackingComponent } from './shipment-tracking/shipment-tracking.component';
import { AboutComponent } from './about/about.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from './utils/authGuard';
import { VerifyemailComponent } from './verifyemail/verifyemail.component';
import { ForgotpasswordComponent } from './forgotpassword/forgotpassword.component';
import { ResetpasswordComponent } from './resetpassword/resetpassword.component';
import { UserviewbarComponent } from './userviewbar/userviewbar.component';
import { ChatWidgetComponent } from './chat-widget/chat-widget.component';
import { BarterCheckoutComponent } from './barter-checkout/barter-checkout.component';
import { PayuResponseComponent } from './payu-response/payu-response.component';
import { BarterPaymentResponseComponent } from './barter-payment-response/barter-payment-response.component';
import { TermsConditionsComponent } from './terms-conditions/terms-conditions.component';
/**
 * 🛣️ CONFIGURACIÓN DE RUTAS DE CASANARESERV
 * Sistema de navegación completo para marketplace con trueques
 * Incluye autenticación, autorización y rutas de pagos
 */
export const routes: Routes = [
  // 🏠 RUTAS PÚBLICAS (sin autenticación)
  
  { path: '', component: HomeComponent },                    // Página principal
  { path: 'login', component: LoginComponent },              // Inicio de sesión
  { path: 'registro', component: FormloginComponent },       // Registro de usuarios
  { path: 'shop', component: TiendaComponent },              // Catálogo de productos
  { path: 'shop-detail', component: ShopDetailComponent },   // Detalle de producto
  { path: 'contact', component: ContactComponent },          // Página de contacto
  { path: 'faq', component: FaqComponent },                  // Preguntas frecuentes
  { path: 'about', component: AboutComponent },              // Acerca de nosotros
  { path: 'shipment-tracking', component: ShipmentTrackingComponent }, // Seguimiento de envíos

  // 🔐 RUTAS DE AUTENTICACIÓN Y RECUPERACIÓN
  
  { path: 'verify-email', component: VerifyemailComponent },      // Verificación de email
  { path: 'forgotpassword', component: ForgotpasswordComponent }, // Solicitar recuperación
  { path: 'resetpassword', component: ResetpasswordComponent },   // Restablecer contraseña

  // 🛡️ RUTAS PROTEGIDAS (requieren autenticación)
  
  { path: 'cart', component: CartComponent, canActivate: [authGuard] },               // Carrito de compras
  { path: 'checkout', component: CheckoutComponent, canActivate: [authGuard] },       // Proceso de pago
  { path: 'user-profile', component: UserviewbarComponent, canActivate: [authGuard] }, // Perfil de usuario

  // 👑 RUTAS ADMINISTRATIVAS (requieren rol admin)
  
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { roles: ['admin'] } },

  // 📝 RUTAS DE GESTIÓN DE CONTENIDO
  
  { path: 'formulario-vender', component: FormularioVenderComponent }, // Publicar productos
  { path: 'userviewbar', component: UserviewbarComponent },            // Vista de perfil

  // 💬 SISTEMA DE CHAT (rutas protegidas)
  
  { path: 'chat/product/:productId', component: ChatWidgetComponent, canActivate: [authGuard] }, // Chat de producto
  { path: 'chat/barter/:barterId', component: ChatWidgetComponent, canActivate: [authGuard] },   // Chat de trueque
  { path: 'chat', component: ChatWidgetComponent, canActivate: [authGuard] },                    // Chat general

  // 🔄 SISTEMA DE TRUEQUES (rutas protegidas)
  
  { path: 'barter-checkout/:id', component: BarterCheckoutComponent, canActivate: [authGuard] }, // Pago de trueque

  // 💳 RESPUESTAS DE PAGOS (rutas públicas para callbacks)
  
  { path: 'payu-response', component: PayuResponseComponent },                    // Respuesta PayU productos
  { path: 'barter-payment-response', component: BarterPaymentResponseComponent }, // Respuesta PayU trueques

  // Terminos y condiciones (ruta pública)
  { path: 'terminos-y-condiciones', component: TermsConditionsComponent },

  // 🔄 RUTA WILDCARD (redirige rutas no encontradas)
  
  { path: '**', redirectTo: '', pathMatch: 'full' }  // Redirigir a home en rutas inválidas
];