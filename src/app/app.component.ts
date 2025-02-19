import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HomeComponent } from "./home/home.component";
import { LoginComponent } from "./login/login.component";
import { CarritoComponent } from './carrito/carrito.component';
import { WishListComponent } from './wish-list/wish-list.component';
import { SignUpComponent } from './sign-up/sign-up.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HomeComponent, LoginComponent, CarritoComponent, WishListComponent,SignUpComponent,RouterLink,RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'CasanareServ';
}
