import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterLink, Router } from '@angular/router';
import { NgFor, NgIf, CommonModule, isPlatformBrowser, CurrencyPipe } from '@angular/common';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

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

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cartService: CartService,
    private authService: AuthService, // ✅ Inyectar AuthService en lugar de authGuard
    private router: Router,
    private toastr: ToastrService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Iniciar carousel si estamos en el navegador
    if (this.isBrowser) {
      this.startAutoPlay();
    }

    // Cargar datos del carrito
    this.loadCart();
    
    // Subscribirse a cambios en el carrito
    this.cartSubscription = this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotals();
    });
  }

  ngOnDestroy() {
    // Detener autoplay del carousel
    if (this.isBrowser) {
      this.stopAutoPlay();
    }
    
    // Cancelar suscripciones
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  // Métodos del carrito
  loadCart(): void {
    this.loading = true;
    this.cartService.getCart().subscribe({
      next: (cart) => {
        console.log('Carrito recibido:', cart);
        
        // Asignar los items y procesar cada item para asegurar que tenga todas las propiedades necesarias
        if (cart && cart.items) {
          this.cartItems = cart.items.map((item: any) => {
            // Asegurar que unit_price esté definido
            if (!item.unit_price && item.price) {
              item.unit_price = item.price;
            } else if (!item.unit_price && item.product && item.product.price) {
              item.unit_price = item.product.price;
            }
            
            return item;
          });
          
          // Calcular los totales
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

  clearCart(): void {
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
}
