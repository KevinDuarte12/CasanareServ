import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component'; // Adjust the path as necessary
import { CarritoComponent } from './carrito/carrito.component';
import { FormloginComponent } from './formlogin/formlogin.component';
import { LoginComponent } from './login/login.component';
import { TiendaComponent } from './tienda/tienda.component';
import { ShopDetailComponent } from './shop-detail/shop-detail.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { CartComponent } from './cart/cart.component';
import { ContactComponent } from './contact/contact.component';
import { FormularioVenderComponent } from './formulario-vender/formulario-vender.component';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'carrito', component: CarritoComponent },
  { path: 'loggin', component: LoginComponent },
  { path: 'registro', component: FormloginComponent },
  { path: 'shop', component: TiendaComponent },
  { path: 'shop-detail', component: ShopDetailComponent },
  { path: 'checkout', component: CheckoutComponent },
  {path:'cart', component: CartComponent},
  {path:'contact', component: ContactComponent},
  {path:'formulario-vender', component: FormularioVenderComponent},
  { path: '**', redirectTo: '', pathMatch: 'full' }
];