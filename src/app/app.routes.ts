import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component'; // Adjust the path as necessary
import { CarritoComponent } from './carrito/carrito.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'carrito', component: CarritoComponent },
];