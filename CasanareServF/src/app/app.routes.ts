import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component'; // Adjust the path as necessary
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
import { authGuard } from './utils/authGuard'; // Importa el guardia de autenticación
import { VerifyemailComponent } from './verifyemail/verifyemail.component';
import { ForgotpasswordComponent } from './forgotpassword/forgotpassword.component';
import { ResetpasswordComponent } from './resetpassword/resetpassword.component';
import { UserviewbarComponent } from './userviewbar/userviewbar.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: FormloginComponent },
  { path: 'shop', component: TiendaComponent },
  { path: 'shop-detail', component: ShopDetailComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'cart', component: CartComponent, canActivate: [authGuard] },
  { path: 'contact', component: ContactComponent },
  { path: 'formulario-vender', component: FormularioVenderComponent },
  { path: 'faq', component: FaqComponent },
  { path: 'about', component: AboutComponent },
  { path: 'shipment-tracking', component: ShipmentTrackingComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { roles: ['admin'] } },
  { path: 'userviewbar', component: UserviewbarComponent },
  { path: 'verify-email', component: VerifyemailComponent },
  { path: 'forgotpassword', component: ForgotpasswordComponent },
  { path: 'resetpassword', component: ResetpasswordComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
