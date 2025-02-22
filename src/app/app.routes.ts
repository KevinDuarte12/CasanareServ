import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component'; // Adjust the path as necessary
import { CarritoComponent } from './carrito/carrito.component';
import { FormloginComponent } from './formlogin/formlogin.component';
import { LoginComponent } from './login/login.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { AppComponent } from './app.component';

export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'carrito', component: CarritoComponent },
  { path: 'loggin', component: LoginComponent },
  { path: 'registro', component: FormloginComponent },
];