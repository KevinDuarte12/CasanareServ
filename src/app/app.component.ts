import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HomeComponent } from "./home/home.component";
import { LoginComponent } from "./login/login.component";
import { CarritoComponent } from './carrito/carrito.component';
import { HeaderComponent } from './header/header.component';
import { NavbarComponent } from './navbar/navbar.component';
import { CarouselComponent } from './carousel/carousel.component';
import { FeaturesComponent } from './features/features.component';
import { CategoriesComponent } from './categories/categories.component';
import { FeaturedProductsComponent } from './featured-products/featured-products.component';
import { OffersComponent } from './offers/offers.component';
import { RecentProductsComponent } from './recent-products/recent-products.component';
import { VendorsComponent } from './vendors/vendors.component';
import { FooterComponent } from './footer/footer.component';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RouterModule,
     HeaderComponent, NavbarComponent, CarouselComponent, FeaturesComponent, CategoriesComponent, 
     FeaturedProductsComponent, OffersComponent, RecentProductsComponent, VendorsComponent, FooterComponent,HomeComponent
    , LoginComponent, CarritoComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'CasanareServ';
}
