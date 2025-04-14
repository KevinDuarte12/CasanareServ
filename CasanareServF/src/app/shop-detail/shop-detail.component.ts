import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/productos.services';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { BreadcrumbService } from '../services/breadcrumb.service';
import { BreadcrumbItem } from '../breadcrumb/breadcrumb.component';

// Importar componentes de layout
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent,
    FooterComponent,
    FeaturedProductsComponent
  ],
  templateUrl: './shop-detail.component.html',
  styleUrls: ['./shop-detail.component.css']
})
export class ShopDetailComponent implements OnInit, OnDestroy {
  // Propiedades para el producto
  product: any = null;
  loading: boolean = true;
  quantity: number = 1;
  hasReviews: boolean = false; // Para controlar si hay reseñas
  
  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', link: '/' },
    { label: 'Tienda', link: '/shop' },
    { label: 'Detalle de Producto', link: null }
  ];
  
  // Array de rutas de imágenes estáticas
  productImages: string[] = [
    'img/product-1.jpg', 
    'img/product-2.jpg', 
    'img/product-3.jpg', 
    'img/product-4.jpg'
  ];
  
  // Suscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    // Obtener ID del producto de los parámetros de la URL
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        const productId = params['id'];
        if (productId) {
          this.loadProductDetails(Number(productId));
        } else {
          // Si no hay ID de producto, redirigir a la tienda
          this.toastr.warning('No se especificó un producto');
          this.router.navigate(['/shop']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Cargar detalles del producto
  loadProductDetails(productId: number): void {
    this.loading = true;
    
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.product = product;
        
        // Actualizar breadcrumbs con el nombre del producto
        this.updateBreadcrumbs();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando detalles del producto:', error);
        this.toastr.error('Error al cargar el producto');
        this.loading = false;
        
        // Redirigir a la tienda si el producto no existe
        this.router.navigate(['/shop']);
      }
    });
  }

  // Actualizar breadcrumbs con el nombre del producto
  updateBreadcrumbs(): void {
    if (this.product) {
      const productBreadcrumbs: BreadcrumbItem[] = [
        { label: 'Home', link: '/' },
        { label: 'Tienda', link: '/shop' },
        { label: this.product.name, link: null }
      ];
      
      this.breadcrumbs = productBreadcrumbs;
      this.breadcrumbService.setBreadcrumbs(productBreadcrumbs);
    }
  }

  // Aumentar cantidad
  increaseQuantity(): void {
    if (this.quantity < this.product.stock) {
      this.quantity++;
    } else {
      this.toastr.warning('No hay más unidades disponibles');
    }
  }

  // Disminuir cantidad
  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Validar entrada de cantidad
  onQuantityChange(event: any): void {
    const value = parseInt(event.target.value);
    if (isNaN(value) || value < 1) {
      this.quantity = 1;
    } else if (value > this.product.stock) {
      this.quantity = this.product.stock;
      this.toastr.warning(`Solo hay ${this.product.stock} unidades disponibles`);
    } else {
      this.quantity = value;
    }
  }

  // Agregar al carrito
  addToCart(): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Debes iniciar sesión para agregar productos al carrito');
      this.router.navigate(['/login'], { 
        queryParams: { 
          returnUrl: `/shop-detail?id=${this.product.id_product}` 
        } 
      });
      return;
    }

    // Verificar stock
    if (this.product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Agregar al carrito
    this.cartService.addToCart(this.product.id_product, this.quantity).subscribe({
      next: () => {
        this.toastr.success(`${this.product.name} agregado al carrito`);
      },
      error: (error) => {
        console.error('Error agregando al carrito:', error);
        this.toastr.error('Error al agregar al carrito');
      }
    });
  }

  // Compartir en redes sociales
  shareOnSocial(platform: string): void {
    let shareUrl = '';
    const currentUrl = window.location.href;
    const productName = encodeURIComponent(this.product.name);
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${productName}&url=${currentUrl}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
        break;
      case 'pinterest':
        shareUrl = `https://pinterest.com/pin/create/button/?url=${currentUrl}&description=${productName}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  }
}
