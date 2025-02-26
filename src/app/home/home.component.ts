import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { FeaturesComponent } from '../features/features.component';
import { CategoriesComponent } from '../categories/categories.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';
import { OffersComponent } from '../offers/offers.component';
import { RecentProductsComponent } from '../recent-products/recent-products.component';
import { VendorsComponent } from '../vendors/vendors.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeaderComponent,
    NavbarComponent, 
    CarouselComponent,
    FeaturesComponent,
    CategoriesComponent,
    FeaturedProductsComponent,
    OffersComponent,
    RecentProductsComponent,
    VendorsComponent,
    FooterComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
}
