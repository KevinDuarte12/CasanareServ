import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { Router } from '@angular/router';
import { NgFor, NgIf, CommonModule, isPlatformBrowser } from '@angular/common';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/productos.services';
import { Product } from '../interfaces/product';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    HeaderComponent, 
    NavbarComponent, 
    BreadcrumbComponent, 
    FooterComponent, 
    NgFor, 
    NgIf, 
    CommonModule,
    FormsModule,
  ],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  // Añadir nuevas propiedades
  isAuthenticated: boolean = false;
  pendingItems: Array<{id_product: number, quantity: number}> = [];

  // Variables para el carrito
  cartItems: any[] = [];
  loading: boolean = true;
  subtotal: number = 0;
  tax: number = 0;
  shipping: number = 10000; // Valor fijo de envío
  total: number = 0;
  private cartSubscription?: Subscription;

  // Variables para el carrusel
  @ViewChild('slidesContainer') slidesContainer!: ElementRef;
  slides = [
    { image: 'img/mano_libres.jpg', alt: 'Slide 1', name: 'Auriculares Bluetooth', price: 50, quantity: 10 },
    { image: 'img/zapatilla.jpg', alt: 'Slide 2', name: 'Zapatillas deportivas', price: 70, quantity: 5 },
    { image: 'img/mouse.jpg', alt: 'Slide 3', name: 'Mouse inalámbrico', price: 25, quantity: 15 },
    { image: 'img/relog.jpg', alt: 'Slide 4', name: 'Reloj inteligente', price: 120, quantity: 18 },
    { image: 'img/pantalon.jpg', alt: 'Slide 5', name: 'jogers', price: 90, quantity: 13 },
    { image: 'img/impresora-3d.jpg', alt: 'Slide 6', name: 'Impresora 3D', price: 300, quantity: 17 },
    { image: 'img/pc-gamer.jpg', alt: 'Slide 7', name: 'Pc Gamers', price: 480, quantity: 20 },
    { image: 'img/ps5.jpg', alt: 'Slide 8', name: 'Play Station-5', price: 600, quantity: 12 }
  ];
  currentIndex = 0;
  slidesPerView = 4;
  autoPlayInterval: any;
  isBrowser: boolean;

  // Array de rutas de imágenes estáticas para fallback
  fallbackImages: string[] = [
    'img/product-1.jpg', 
    'img/product-2.jpg', 
    'img/product-3.jpg', 
    'img/product-4.jpg',
    'img/product-5.jpg', 
    'img/product-6.jpg', 
    'img/product-7.jpg', 
    'img/product-8.jpg'
  ];

  // Añade estas propiedades
  private productImagesCache: Map<number, string> = new Map();
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cartService: CartService,
    private productService: ProductService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Verificar autenticación
    this.isAuthenticated = this.authService.isAuthenticated();

    if (this.isBrowser) {
      this.startAutoPlay();

      // Modificación: Procesar items pendientes antes de cargar el carrito
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

      this.cartSubscription = this.cartService.cartItems$.subscribe(items => {
        this.cartItems = items;
        this.calculateTotals();
      });
    }
  }

  // Nuevo método para procesar items pendientes primero
  private async processPendingItemsFirst(): Promise<void> {
    try {
      const pendingItems = this.cartService.getPendingItems();
      if (pendingItems.length > 0) {
        await this.cartService.processPendingCart().toPromise();
        this.cartService.clearPendingItems(); // Limpiar después de procesar
        console.log('Items pendientes procesados correctamente');
      }
    } catch (error) {
      console.error('Error procesando items pendientes:', error);
      this.toastr.error('Error al procesar productos pendientes');
    }
  }

  // Nuevo método para cargar items pendientes
  loadPendingItems(): void {
    this.pendingItems = this.cartService.getPendingItems();
    this.loading = false;
  }

  // Modificar goToLogin para guardar la URL actual
  goToLogin(): void {
    localStorage.setItem('redirectAfterLogin', '/cart');
    this.router.navigate(['/login']);
  }

  // Elimina un solo producto específico
  removePendingItem(productId: number): void {
    const updatedItems = this.pendingItems.filter(item => item.id_product !== productId);
    localStorage.setItem('pendingCartItems', JSON.stringify(updatedItems));
    this.pendingItems = updatedItems;
    this.toastr.success('Producto eliminado de pendientes');
  }

  // Elimina todos los productos pendientes
  clearPendingItems(): void {
    if (confirm('¿Está seguro de eliminar todos los productos pendientes?')) {
      // Limpiar todo el localStorage de pendientes
      this.cartService.clearPendingItems();
      // Vaciar el array completo
      this.pendingItems = [];
      this.toastr.success('Todos los productos pendientes eliminados');
    }
  }

  // Actualizar clearCart para manejar ambos casos
  clearCart(): void {
    if (this.isAuthenticated) {
      // Lógica existente para carrito autenticado
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
      // Limpiar items pendientes
      this.clearPendingItems();
    }
  }

  // Métodos del carrito
  loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (cart) => {
        console.log('Carrito recibido:', cart);
        
        if (cart && cart.items) {
          // Asegurarse de que no haya duplicados por ID de producto
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

  // Método auxiliar para remover duplicados
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
    
    // Verificar stock
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

  removeItem(itemId: number): void {
    this.cartService.removeFromCart(itemId).subscribe({
      next: () => {
        this.toastr.success('Producto eliminado del carrito');
      },
      error: (error) => {
        console.error('Error al eliminar producto:', error);
        this.toastr.error(error.error?.msg || 'Error al eliminar producto');
      }
    });
  }

  // Cargar detalles de productos pendientes
  loadPendingItemDetails() {
    // Solo proceder si hay items pendientes y estamos en el navegador
    if (!this.isBrowser || !this.pendingItems.length) return;
    
    // Para cada item pendiente, obtener detalles del producto
    this.pendingItems.forEach(item => {
      this.productService.getProduct(item.id_product).subscribe({
        next: (product: Product) => {
          console.log(`Producto pendiente cargado: ${product.name}`);
          // Puedes almacenar estos detalles para mostrarlos al usuario
          // Por ejemplo, en un array de "pendingItemsWithDetails"
        },
        error: (err) => {
          console.error(`Error cargando detalles de producto pendiente ${item.id_product}:`, err);
        }
      });
    });
  }

  calculateTotals(): void {
    // Calcular subtotal como suma de precio*cantidad de cada item
    this.subtotal = this.cartItems.reduce((acc, item) => {
      // Usar unit_price si está disponible, o buscarlo en el producto anidado
      const price = item.unit_price || (item.product ? item.product.price : 0);
      return acc + (price * item.quantity);
    }, 0);
    
    // Calcular envío (podrías tener una lógica más compleja aquí)
    this.shipping = this.subtotal > 0 ? 10000 : 0; // Por ejemplo
    
    // Calcular IVA (19%)
    this.tax = this.subtotal * 0.19;
    
    // Calcular total
    this.total = this.subtotal + this.shipping + this.tax;
    
    console.log('Totales calculados:', {
      subtotal: this.subtotal,
      shipping: this.shipping,
      tax: this.tax,
      total: this.total
    });
  }

  checkout(): void {
    // Navegar a la página de checkout
    this.router.navigate(['/checkout']);
  }

  continueShoping(): void {
    this.router.navigate(['/shop']);
  }

  // Helper para incrementar/decrementar cantidad
  changeQuantity(itemId: number, change: number): void {
    const item = this.cartItems.find(i => i.id_item === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      this.updateQuantity(itemId, newQuantity);
    }
  }

  // Métodos del carousel
  nextSlide() {
    if (this.currentIndex < this.slides.length - this.slidesPerView) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0;
    }
    this.updateSlidePosition();
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.slides.length - this.slidesPerView;
    }
    this.updateSlidePosition();
  }

  private updateSlidePosition() {
    if (this.isBrowser && this.slidesContainer) {
      const slideWidth = 100 / this.slidesPerView;
      this.slidesContainer.nativeElement.style.transform =
        `translateX(-${this.currentIndex * slideWidth}%)`;
    }
  }

  public startAutoPlay() {
    if (this.isBrowser && !this.autoPlayInterval) {
      this.autoPlayInterval = setInterval(() => {
        this.nextSlide();
      }, 5000);
    }
  }

  public stopAutoPlay() {
    if (this.isBrowser && this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  // Método mejorado para obtener imágenes desde la estructura de Cloudinary
  getProductImage(product: any, index: number): string {
    if (!product) {
      return this.fallbackImages[index % this.fallbackImages.length];
    }
    
    // 1. Verificar si ya tenemos la imagen en caché
    if (this.productImagesCache.has(product.id_product)) {
      return this.productImagesCache.get(product.id_product) || 
             this.fallbackImages[index % this.fallbackImages.length];
    }
    
    // 2. Si no está en caché, iniciar la carga
    this.loadProductImageAsync(product.id_product, index);
    
    // 3. Mientras se carga, devolver imagen de fallback
    return this.fallbackImages[index % this.fallbackImages.length];
  }
  
  // Método asíncrono para cargar imágenes de productos
  private loadProductImageAsync(productId: number, index: number): void {
    // Marcar como "en carga" para evitar múltiples solicitudes
    this.productImagesCache.set(productId, '');
    
    this.productService.getProduct(productId).subscribe({
      next: (productDetails: Product) => {
        console.log(`Producto ${productId} cargado para imagen:`, productDetails);
        let imageUrl: string = '';
        
        // Buscar imagen en el producto
        if (productDetails && productDetails.images && 
            Array.isArray(productDetails.images) && productDetails.images.length > 0) {
            
          // Buscar imagen principal usando conversión a booleano
          // Esto funciona para is_main: boolean o is_main: 1|0
          const mainImage = productDetails.images.find(img => {
            // Usar doble negación para convertir cualquier valor a booleano
            return !!img.is_main;
          });
          
          if (mainImage && mainImage.url) {
            imageUrl = mainImage.url;
          } else if (productDetails.images[0].url) {
            // Si no hay imagen principal, usar la primera
            imageUrl = productDetails.images[0].url;
          }
        } 
        // Verificar otros campos de imágenes
        else if (productDetails.img_url) {
          imageUrl = productDetails.img_url;
        }
        
        // Guardar en caché - si no se encontró imagen, usar fallback
        const finalImageUrl = imageUrl || this.fallbackImages[index % this.fallbackImages.length];
        this.productImagesCache.set(productId, finalImageUrl);
        
        // Forzar detección de cambios
        this.cartItems = [...this.cartItems];
      },
      error: (error) => {
        console.error(`Error cargando imagen para producto ${productId}:`, error);
        // Mantener el fallback en caché para no seguir intentando
        this.productImagesCache.set(productId, this.fallbackImages[index % this.fallbackImages.length]);
      }
    });
  }
  
  // Método para verificar si tenemos la imagen cargada
  hasProductImage(productId?: number): boolean {
    if (!productId) return false;
    
    // Si está en caché y no es un string vacío, tenemos la imagen
    return this.productImagesCache.has(productId) && 
           this.productImagesCache.get(productId) !== '';
  }
  
  // Método para manejar errores de imágenes
  handleImageError(event: any, index: number): void {
    console.warn('Error al cargar imagen, usando fallback');
    event.target.src = this.fallbackImages[index % this.fallbackImages.length];
  }

  // Método de diagnóstico para productos del carrito
  private logCartItemsStructure(): void {
    if (!this.cartItems || this.cartItems.length === 0) {
      console.warn('❌ No hay items en el carrito para inspeccionar');
      return;
    }
    
    console.log('🔍 DIAGNÓSTICO DE ITEMS DEL CARRITO');
    console.log(`📊 Total de items en carrito: ${this.cartItems.length}`);
    
    // Tomar una muestra para no sobrecargar la consola
    const sample = this.cartItems.slice(0, Math.min(2, this.cartItems.length));
    
    sample.forEach((item, index) => {
      console.log(`\n🛒 Item #${index + 1}: ${item.product?.name || 'Sin nombre'} (ID: ${item.id_item})`);
      
      // Verificar estructura del producto
      if (item.product) {
        console.log('Propiedades del producto:');
        ['id_product', 'name', 'price', 'stock', 'images'].forEach(prop => {
          const exists = item.product.hasOwnProperty(prop);
          const value = item.product[prop];
          const type = typeof value;
          const summary = Array.isArray(value) ? `Array[${value.length}]` : 
                          type === 'object' && value ? 'Object' : 
                          value === null ? 'null' : 
                          type === 'string' ? `"${value?.substring(0, 30)}${value?.length > 30 ? '...' : ''}"` : 
                          value;
          
          console.log(`  ${exists ? '✅' : '❌'} ${prop}: ${summary}`);
        });
        
        // Análisis específico de imágenes
        if (item.product.images) {
          console.log('\nDetalle de imágenes:');
          
          if (Array.isArray(item.product.images)) {
            console.log(`📸 ${item.product.images.length} imágenes encontradas`);
            
            item.product.images.forEach((img: any, imgIndex: number) => {
              console.log(`  Imagen #${imgIndex + 1}:`);
              if (typeof img === 'object') {
                ['id', 'url', 'is_main', 'public_id'].forEach(imgProp => {
                  console.log(`    - ${imgProp}: ${img[imgProp] || 'N/A'}`);
                });
              } else {
                console.log(`    ${img}`);
              }
            });
          } else {
            console.log(`⚠️ 'images' no es un array: ${typeof item.product.images}`);
          }
        } else {
          console.log('❌ No se encontró la propiedad "images" en el producto');
          console.log('Todas las propiedades del producto:');
          console.log(Object.keys(item.product));
        }
      } else {
        console.log('❌ No hay objeto producto definido en este item');
      }
    });
    
    console.log('\n🔍 FIN DEL DIAGNÓSTICO DE CARRITO');
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.stopAutoPlay();
    }
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  /**
   * Guarda los productos del carrito actual como pendientes antes de cerrar sesión
   */
  saveCartItemsAsPending(): void {
    if (this.cartItems && this.cartItems.length > 0) {
      // Convertir items del carrito a formato pendiente
      const itemsToPend = this.cartItems.map(item => ({
        id_product: item.product.id_product,
        quantity: item.quantity
      }));
      
      // Guardar en localStorage
      localStorage.setItem('pendingCartItems', JSON.stringify(itemsToPend));
      
      console.log('Productos del carrito guardados como pendientes:', itemsToPend);
    }
  }

  // Método a añadir en cart.component.ts
  proceedToCheckout(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.warning('Debes iniciar sesión para continuar con la compra');
      localStorage.setItem('redirectAfterLogin', '/checkout');
      this.router.navigate(['/login']);
      return;
    }
    
    this.router.navigate(['/checkout']);
  }

  // ✅ AGREGAR: Método para verificar si el usuario es propietario del producto
  isOwnerOfProduct(item: any): boolean {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId || !item || !item.product) {
      return false;
    }
    
    // Verificar si el producto pertenece al usuario actual
    return item.product.id_user === currentUserId || item.product.user_id === currentUserId;
  }

  // ✅ MODIFICAR: Método addToCart para incluir validación
  addToCart(productId: number, quantity: number = 1): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.cartService.savePendingItem(productId, quantity);
      this.toastr.info('Producto guardado. Inicia sesión para agregarlo al carrito.');
      return;
    }

    // ✅ NUEVA VALIDACIÓN: Verificar si es propietario del producto
    const currentUserId = this.authService.getCurrentUserId();
    
    // Primero obtener detalles del producto para verificar el propietario
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        // Verificar si el usuario es el propietario
        if (currentUserId && (product.id_user === currentUserId || product.user_id === currentUserId)) {
          this.toastr.warning('No puedes agregar tu propio producto al carrito', 'Acción no permitida');
          return;
        }

        // Si no es el propietario, proceder con agregar al carrito
        this.cartService.addToCart(productId, quantity).subscribe({
          next: () => {
            this.toastr.success('Producto agregado al carrito');
          },
          error: (error) => {
            // ✅ MANEJAR EL ERROR ESPECÍFICO DEL BACKEND
            if (error.status === 403 && error.error?.code === 'CANNOT_BUY_OWN_PRODUCT') {
              this.toastr.warning('No puedes agregar tu propio producto al carrito', 'Acción no permitida');
            } else {
              console.error('Error al agregar al carrito:', error);
              this.toastr.error('Error al agregar producto al carrito');
            }
          }
        });
      },
      error: (error) => {
        console.error('Error al obtener producto:', error);
        this.toastr.error('Error al verificar el producto');
      }
    });
  }
}
