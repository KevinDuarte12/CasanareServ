import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { CarouselComponent } from '../carousel/carousel.component';
import { FeaturesComponent } from '../features/features.component';
import { CategoriesComponent } from '../categories/categories.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';
import { OffersComponent } from '../offers/offers.component';
import { RecentProductsComponent } from '../recent-products/recent-products.component';
import { FooterComponent } from '../footer/footer.component';
import { PatrocinadoresComponent } from '../patrocinadores/patrocinadores.component';
import { RecentBartersComponent } from '../recent-barters/recent-barter.component';
/**
 * 🏠 COMPONENTE DE PÁGINA PRINCIPAL
 * Landing page que combina todos los componentes del marketplace
 * Arquitectura de componentes standalone para máxima modularidad
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    // 🎯 COMPONENTES DE NAVEGACIÓN
    HeaderComponent,           // Encabezado con logo, búsqueda y autenticación
    NavbarComponent,           // Barra de navegación principal
    
    // 🎨 COMPONENTES DE PRESENTACIÓN
    CarouselComponent,         // Hero section con imágenes promocionales
    FeaturesComponent,         // Características y beneficios del servicio
    
    // 📦 COMPONENTES DE MARKETPLACE
    CategoriesComponent,       // Grid de categorías de productos
    FeaturedProductsComponent, // Productos destacados por administradores
    OffersComponent,           // Ofertas especiales y promociones activas
    RecentProductsComponent,   // Productos añadidos recientemente
    RecentBartersComponent,    // Trueques recientes
    // 🤝 COMPONENTES INSTITUCIONALES
    PatrocinadoresComponent,   // Patrocinadores y aliados comerciales
    
    // 📄 COMPONENTES DE INFORMACIÓN
    FooterComponent            // Pie de página con enlaces y datos legales
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  // 📝 COMPONENTE STATELESS
  // No requiere lógica adicional - actúa como contenedor de componentes
}