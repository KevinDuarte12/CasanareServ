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

  // Propiedades para manejo de imágenes
  displayImages: string[] = [];
  activeImageIndex: number = 0;
  fallbackImages: string[] = [
    'img/product-1.jpg', 
    'img/product-2.jpg', 
    'img/product-3.jpg', 
    'img/product-4.jpg',
    'img/product-5.jpg'
  ];
  
  // Cantidad mínima de imágenes a mostrar
  minImageCount: number = 3;

  // Nueva propiedad para el intervalo
  private slideInterval: any = null;
  autoPlayEnabled: boolean = false;

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
    
    // Iniciar carrusel automático (opcional)
    // this.startAutoSlide(6000); // Cambiar cada 6 segundos
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Limpiar intervalo de carrusel
    this.stopAutoSlide();
  }

  // Cargar detalles del producto
  loadProductDetails(productId: number): void {
    this.loading = true;
    
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        this.product = product;
        
        // Actualizar breadcrumbs con el nombre del producto
        this.updateBreadcrumbs();
        
        // Procesar las imágenes del producto
        this.processProductImages();
        
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

  // Método para procesar las imágenes del producto
  processProductImages(): void {
    // Reiniciar el array de imágenes a mostrar
    this.displayImages = [];
    
    // Verificar si el producto tiene imágenes
    if (this.product.images && Array.isArray(this.product.images) && this.product.images.length > 0) {
      console.log(`Producto tiene ${this.product.images.length} imágenes`);
      
      // Extraer las URLs de las imágenes del producto
      const productImageUrls = this.product.images.map((img: any) => {
        // Priorizar la imagen marcada como principal
        if (img.url) return img.url;
        return img; // En caso de que el objeto sea la URL directamente
      });
      
      // Agregar las imágenes del producto
      this.displayImages = [...productImageUrls];
    } else if (this.product.image_url) {
      // Si hay una sola imagen en image_url
      console.log('Usando image_url del producto');
      this.displayImages.push(this.product.image_url);
    }
    
    // Si tenemos menos imágenes que el mínimo requerido, rellenar con imágenes de respaldo
    this.fillWithFallbackImages();
    
    console.log(`Total de imágenes a mostrar: ${this.displayImages.length}`);
  }
  
  // Método para rellenar con imágenes de respaldo si hay menos del mínimo
  fillWithFallbackImages(): void {
    if (this.displayImages.length < this.minImageCount) {
      const neededImages = this.minImageCount - this.displayImages.length;
      
      for (let i = 0; i < neededImages; i++) {
        // Agregar imágenes de respaldo sin duplicar las ya existentes
        const fallbackImage = this.fallbackImages[i % this.fallbackImages.length];
        if (!this.displayImages.includes(fallbackImage)) {
          this.displayImages.push(fallbackImage);
        }
      }
    }
  }
  
  // Método para manejar errores de carga de imágenes
  handleImageError(event: any, index: number): void {
    // Reemplazar con imagen de respaldo si falla la carga
    event.target.src = this.fallbackImages[index % this.fallbackImages.length];
  }
  
  // Método mejorado para cambiar la imagen activa con animaciones
  setActiveImage(index: number): void {
    if (this.activeImageIndex === index) return; // Evitar recargar la misma imagen
    
    const oldIndex = this.activeImageIndex;
    this.activeImageIndex = index;
    
    // Implementación con animaciones
    setTimeout(() => {
      const items = document.querySelectorAll('.carousel-item');
      if (items && items.length > 0) {
        // Aplicar animación de salida al elemento activo actual
        if (items[oldIndex]) {
          const oldItem = items[oldIndex] as HTMLElement;
          oldItem.classList.add('animate-out');
          
          // Quitar la clase active después de que termine la animación
          setTimeout(() => {
            oldItem.classList.remove('active', 'animate-out');
          }, 500); // Tiempo de la animación
        }
        
        // Aplicar animación de entrada al nuevo elemento activo
        if (items[index]) {
          const newItem = items[index] as HTMLElement;
          newItem.classList.add('active', 'animate-in');
          
          // Quitar la clase de animación después de que termine
          setTimeout(() => {
            newItem.classList.remove('animate-in');
          }, 500); // Tiempo de la animación
        }
      }
    }, 0);
  }

  // Método para ir a la imagen siguiente
  nextImage(): void {
    const newIndex = (this.activeImageIndex + 1) % this.displayImages.length;
    this.setActiveImage(newIndex);
  }

  // Método para ir a la imagen anterior
  prevImage(): void {
    const newIndex = (this.activeImageIndex - 1 + this.displayImages.length) % this.displayImages.length;
    this.setActiveImage(newIndex);
  }

  // Método para iniciar el carrusel automático
  startAutoSlide(intervalMs: number = 5000): void {
    this.stopAutoSlide(); // Detener cualquier intervalo existente
    this.autoPlayEnabled = true;
    
    this.slideInterval = setInterval(() => {
      this.nextImage();
    }, intervalMs);
  }

  // Método para detener el carrusel automático
  stopAutoSlide(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
      this.slideInterval = null;
    }
    this.autoPlayEnabled = false;
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
