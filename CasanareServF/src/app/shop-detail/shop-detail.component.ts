import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent,
    FooterComponent,
    FeaturedProductsComponent
  ],
  templateUrl: './shop-detail.component.html',
  styleUrls: ['./shop-detail.component.css']
})
export class ShopDetailComponent {
}
