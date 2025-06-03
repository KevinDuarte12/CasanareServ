import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { ProductService } from '../services/productos.services';
import { Product } from '../interfaces/product';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent,
    FooterComponent,
    DecimalPipe
  ],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  // Propiedades de autenticación
  isAuthenticated: boolean = false;
  pendingItems: Array<{id_product: number, quantity: number}> = [];

  // Variables para el carrito
  cartItems: any[] = [];
  loading: boolean = true;
  subtotal: number = 0;
  shipping: number = 10000;
  tax: number = 0;
  total: number = 0;
  private cartSubscription?: Subscription;

  // Cache y fallbacks para imágenes
  private productImagesCache = new Map<number, string>();
  private fallbackImages: string[] = [
    '/assets/images/no-image.png',
    '/assets/images/placeholder-1.jpg',
    '/assets/images/placeholder-2.jpg',
    '/assets/images/default-product.png'
  ];

  // Verificación de plataforma
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // Productos recomendados
  recommendedProducts = [
    {
      id_product: 1,
      name: 'Auriculares Bluetooth',
      price: 50000,
      image: '/img/mano_libres.jpg',
      rating: 5,
      reviews: 10
    },
    {
      id_product: 2,
      name: 'Zapatillas deportivas',
      price: 70000,
      image: '/img/zapatilla.jpeg',
      rating: 4,
      reviews: 15
    },
    {
      id_product: 3,
      name: 'Mouse Gamer',
      price: 25000,
      image: '/img/mouse--.jpg',
      rating: 4,
      reviews: 10
    },
    {
      id_product: 4,
      name: 'Reloj inteligente',
      price: 120000,
      image: '/img/relog.jpg',
      rating: 5,
      reviews: 18
    },
    {
      id_product: 5,
      name: 'Joggers',
      price: 90000,
      image: '/img/pantalon.jpg',
      rating: 4,
      reviews: 13
    },
    {
      id_product: 6,
      name: 'Impresora 3D',
      price: 300000,
      image: '/img/impresora-3d.jpg',
      rating: 5,
      reviews: 17
    },
    {
      id_product: 7,
      name: 'PC Gamer',
      price: 480000,
      image: '/img/pc gammer-.jpg',
      rating: 5,
      reviews: 20
    },
    {
      id_product: 8,
      name: 'Play Station 5',
      price: 600000,
      image: '/img/play-station.png',
      rating: 5,
      reviews: 12
    }
  ];

  // Variables del carrusel
  @ViewChild('slidesContainer') slidesContainer!: ElementRef;
  currentIndex = 0;
  slidesPerView = 4;
  autoPlayInterval: any;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cartService: CartService,
    private productService: ProductService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Verificar autenticación
    this.isAuthenticated = this.authService.isAuthenticated();

    if (this.isBrowser) {
      this.startAutoPlay();
      this.updateSlidesPerView();

      // Procesar items pendientes o cargar carrito
      if (this.isAuthenticated) {
        const pendingItems = this.cartService.getPendingItems();
        if (pendingItems.length > 0) {
          this.processPendingItemsFirst().then(() => {
            this.loadCart();
          });
        } else {
          this.loadCart();
        }
      } else {
        this.loadPendingItems();
      }

      // Suscribirse a cambios del carrito
      this.cartSubscription = this.cartService.cartItems$.subscribe(items => {
        this.cartItems = items;
        this.calculateTotals();
      });

      // Escuchar cambios de tamaño de ventana
      window.addEventListener('resize', () => {
        this.updateSlidesPerView();
        this.updateSlidePosition();
      });
    }
  }

  // ===== MÉTODOS DE ITEMS PENDIENTES =====

  private async processPendingItemsFirst(): Promise<void> {
    try {
      const pendingItems = this.cartService.getPendingItems();
      if (pendingItems.length > 0) {
        await this.cartService.processPendingCart().toPromise();
        this.cartService.clearPendingItems();
        console.log('Items pendientes procesados correctamente');
      }
    } catch (error) {
      console.error('Error procesando items pendientes:', error);
      this.toastr.error('Error al procesar productos pendientes');
    }
  }

  loadPendingItems(): void {
    this.pendingItems = this.cartService.getPendingItems();
    this.loading = false;
  }

  removePendingItem(productId: number): void {
    const updatedItems = this.pendingItems.filter(item => item.id_product !== productId);
    localStorage.setItem('pendingCartItems', JSON.stringify(updatedItems));
    this.pendingItems = updatedItems;
    this.toastr.success('Producto eliminado de pendientes');
  }

  clearPendingItems(): void {
    if (confirm('¿Está seguro de eliminar todos los productos pendientes?')) {
      this.cartService.clearPendingItems();
      this.pendingItems = [];
      this.toastr.success('Todos los productos pendientes eliminados');
    }
  }

  // ===== MÉTODOS DEL CARRITO =====

  loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (cart) => {
        console.log('Carrito recibido:', cart);

        if (cart && cart.items) {
          const uniqueItems = this.removeDuplicates(cart.items);
          this.cartItems = uniqueItems.map((item: any) => {
            if (!item.unit_price && item.price) {
              item.unit_price = item.price;
            } else if (!item.unit_price && item.product && item.product.price) {
              item.unit_price = item.product.price;
            }
            return item;
          });

          this.calculateTotals();
        } else {
          this.cartItems = [];
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar carrito:', error);
        this.toastr.error('Error al cargar el carrito');
        this.loading = false;
        this.cartItems = [];
      }
    });
  }

  private removeDuplicates(items: any[]): any[] {
    const seen = new Map();
    return items.filter((item) => {
      const productId = item.product?.id_product;
      if (!seen.has(productId)) {
        seen.set(productId, true);
        return true;
      }
      return false;
    });
  }

  updateQuantity(itemId: number, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeItem(itemId);
      return;
    }

    const item = this.cartItems.find(i => i.id_item === itemId);
    if (!item) return;

    const product = item.product;
    if (!product) {
      this.toastr.error('Error al obtener información del producto');
      return;
    }

    if (newQuantity > product.stock) {
      this.toastr.warning(`Stock insuficiente. Stock disponible: ${product.stock}`);
      return;
    }

    this.cartService.updateCartItem(itemId, newQuantity).subscribe({
      next: () => {
        this.toastr.success('Cantidad actualizada');
      },
      error: (error) => {
        console.error('Error al actualizar cantidad:', error);
        this.toastr.error(error.error?.msg || 'Error al actualizar cantidad');
      }
    });
  }

  changeQuantity(itemId: number, change: number): void {
    const item = this.cartItems.find(i => i.id_item === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        this.cartService.updateCartItem(itemId, newQuantity).subscribe({
          next: () => {
            this.loadCart();
          },
          error: (error) => {
            this.toastr.error('Error al actualizar cantidad');
          }
        });
      }
    }
  }

  removeItem(itemId: number) {
    this.cartService.removeFromCart(itemId).subscribe({
      next: () => {
        this.toastr.success('Producto eliminado');
        this.loadCart();
      },
      error: (error) => {
        this.toastr.error('Error al eliminar producto');
      }
    });
  }

  clearCart(): void {
    if (this.isAuthenticated) {
      if (confirm('¿Está seguro de vaciar el carrito?')) {
        this.cartService.clearCart().subscribe({
          next: () => {
            this.toastr.success('Carrito vaciado correctamente');
          },
          error: (error) => {
            console.error('Error al vaciar carrito:', error);
            this.toastr.error(error.error?.msg || 'Error al vaciar carrito');
          }
        });
      }
    } else {
      this.clearPendingItems();
    }
  }

  calculateTotals(): void {
    this.subtotal = this.cartItems.reduce((acc, item) => {
      const price = item.unit_price || (item.product ? item.product.price : 0);
      return acc + (price * item.quantity);
    }, 0);

    this.shipping = this.subtotal > 0 ? 10000 : 0;
    this.tax = this.subtotal * 0.19;
    this.total = this.subtotal + this.shipping + this.tax;

    console.log('Totales calculados:', {
      subtotal: this.subtotal,
      shipping: this.shipping,
      tax: this.tax,
      total: this.total
    });
  }

  // ===== MÉTODOS DE NAVEGACIÓN =====

  goToLogin(): void {
    localStorage.setItem('redirectAfterLogin', '/cart');
    this.router.navigate(['/login']);
  }

  checkout(): void {
    this.router.navigate(['/checkout']);
  }

  continueShoping(): void {
    this.router.navigate(['/shop']);
  }

  proceedToCheckout(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.warning('Debes iniciar sesión para continuar con la compra');
      localStorage.setItem('redirectAfterLogin', '/checkout');
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/checkout']);
  }

  // ===== MÉTODOS DEL CARRUSEL CORREGIDOS =====

  updateSlidesPerView(): void {
    if (!this.isBrowser) return;

    const width = window.innerWidth;
    if (width <= 767) {
      this.slidesPerView = 1; // 1 producto en móviles
    } else if (width <= 991) {
      this.slidesPerView = 2; // 2 productos en tablets
    } else if (width <= 1199) {
      this.slidesPerView = 3; // 3 productos en desktop pequeño
    } else {
      this.slidesPerView = 4; // 4 productos en desktop grande
    }
  }

  nextSlide() {
    const maxIndex = Math.max(0, this.recommendedProducts.length - this.slidesPerView);

    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // Volver al inicio
    }

    this.updateSlidePosition();
  }

  prevSlide() {
    const maxIndex = Math.max(0, this.recommendedProducts.length - this.slidesPerView);

    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = maxIndex; // Ir al final
    }

    this.updateSlidePosition();
  }

  updateSlidePosition() {
    if (!this.isBrowser) return;

    const slidesContainer = document.querySelector('.slides-container') as HTMLElement;
    if (slidesContainer) {
      const width = window.innerWidth;

      // Aplicar transición suave
      slidesContainer.style.transition = 'transform 0.3s ease';

      if (width <= 767) {
        // Móviles: 1 producto por vista - 100% por slide
        const position = -this.currentIndex * 100;
        slidesContainer.style.transform = `translateX(${position}%)`;
      } else if (width <= 991) {
        // Tablets: 2 productos por vista - 50% por slide
        const position = -this.currentIndex * 50;
        slidesContainer.style.transform = `translateX(${position}%)`;
      } else if (width <= 1199) {
        // Desktop pequeño: 3 productos por vista - 33.333% por slide
        const position = -this.currentIndex * 33.333;
        slidesContainer.style.transform = `translateX(${position}%)`;
      } else {
        // Desktop grande: 4 productos por vista - 25% por slide
        const position = -this.currentIndex * 25;
        slidesContainer.style.transform = `translateX(${position}%)`;
      }
    }
  }

  startAutoPlay() {
    this.stopAutoPlay();
    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  // ===== MÉTODOS DE IMÁGENES =====

  getProductImage(product: any, index: number): string {
    if (!product) {
      return this.fallbackImages[index % this.fallbackImages.length];
    }

    if (this.productImagesCache.has(product.id_product)) {
      return this.productImagesCache.get(product.id_product) ||
             this.fallbackImages[index % this.fallbackImages.length];
    }

    this.loadProductImageAsync(product.id_product, index);
    return this.fallbackImages[index % this.fallbackImages.length];
  }

  private loadProductImageAsync(productId: number, index: number): void {
    this.productImagesCache.set(productId, '');

    this.productService.getProduct(productId).subscribe({
      next: (productDetails: Product) => {
        console.log(`Producto ${productId} cargado para imagen:`, productDetails);
        let imageUrl: string = '';

        if (productDetails && productDetails.images &&
            Array.isArray(productDetails.images) && productDetails.images.length > 0) {

          const mainImage = productDetails.images.find(img => !!img.is_main);

          if (mainImage && mainImage.url) {
            imageUrl = mainImage.url;
          } else if (productDetails.images[0].url) {
            imageUrl = productDetails.images[0].url;
          }
        } else if (productDetails.img_url) {
          imageUrl = productDetails.img_url;
        }

        const finalImageUrl = imageUrl || this.fallbackImages[index % this.fallbackImages.length];
        this.productImagesCache.set(productId, finalImageUrl);
        this.cartItems = [...this.cartItems];
      },
      error: (error) => {
        console.error(`Error cargando imagen para producto ${productId}:`, error);
        this.productImagesCache.set(productId, this.fallbackImages[index % this.fallbackImages.length]);
      }
    });
  }

  handleImageError(event: any, index: number): void {
    console.warn('Error al cargar imagen, usando fallback');
    event.target.src = this.fallbackImages[index % this.fallbackImages.length];
  }

  // ===== MÉTODOS AUXILIARES =====

  getStars(rating: number): string {
    return '⭐'.repeat(rating);
  }

  addToCart(product: any): void {
    if (this.isAuthenticated) {
      this.cartService.addToCart(product.id_product, 1).subscribe({
        next: () => {
          this.toastr.success('Producto agregado al carrito');
          this.loadCart();
        },
        error: (error) => {
          this.toastr.error('Error al agregar producto');
        }
      });
    } else {
      // Agregar a items pendientes
      const existingItem = this.pendingItems.find(item => item.id_product === product.id_product);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.pendingItems.push({ id_product: product.id_product, quantity: 1 });
      }
      localStorage.setItem('pendingCartItems', JSON.stringify(this.pendingItems));
      this.toastr.success('Producto agregado a pendientes');
    }
  }

  viewDetails(product: any): void {
    this.router.navigate(['/product', product.id_product]);
  }

  saveCartItemsAsPending(): void {
    if (this.cartItems && this.cartItems.length > 0) {
      const itemsToPend = this.cartItems.map(item => ({
        id_product: item.product.id_product,
        quantity: item.quantity
      }));

      localStorage.setItem('pendingCartItems', JSON.stringify(itemsToPend));
      console.log('Productos del carrito guardados como pendientes:', itemsToPend);
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.stopAutoPlay();
      window.removeEventListener('resize', () => {
        this.updateSlidesPerView();
        this.updateSlidePosition();
      });
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }
}
