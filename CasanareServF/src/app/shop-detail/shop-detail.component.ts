import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ProductService } from '../services/productos.services';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { BarterService } from '../services/barter.service';
import { ToastrService } from 'ngx-toastr';
import { BreadcrumbService } from '../services/breadcrumb.service';
import { BreadcrumbItem } from '../breadcrumb/breadcrumb.component';
import { BarterRequest } from '../interfaces/barter';
import { RatingService } from '../services/rating.service';

// Importar componentes de layout
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { FeaturedProductsComponent } from '../featured-products/featured-products.component';

// Importar los componentes de calificación
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { RatingFormComponent } from '../rating-form/rating-form.component';
import { RatingsListComponent } from '../ratings-list/ratings-list.component'; 
import { RouterModule } from '@angular/router';
import { ChatWidgetComponent } from '../chat-widget/chat-widget.component';
import { AppComponent } from '../app.component';

@Component({
  selector: 'app-shop-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // Añadir esto para usar formularios reactivos
    RouterModule,
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent,
    FooterComponent,
    FeaturedProductsComponent,
    StarRatingComponent,
    RatingFormComponent,
    RatingsListComponent, 

  ],
  templateUrl: './shop-detail.component.html',
  styleUrls: ['./shop-detail.component.css']
})
export class ShopDetailComponent implements OnInit, OnDestroy, AfterViewInit {
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

  // Añadir estas propiedades a la clase
  productType: 'regular' | 'barter' = 'regular'; // Por defecto es regular

  // Añadir estas propiedades faltantes
  currentUser: any = null;
  tradeForm: FormGroup;
  showBarterModal: boolean = false;
  
  // Añadir selección de producto para trueque
  userProducts: any[] = [];
  selectedProductForBarter: number | null = null;

  // Añadir estas propiedades a la clase
  hasExistingProposal: boolean = false;
  checkingProposal: boolean = false;
  existingProposal: any = null;

  // Referencia a la lista de calificaciones para poder refrescarla
  @ViewChild(RatingsListComponent) ratingsList?: RatingsListComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private barterService: BarterService, // Añadir el servicio de trueques
    private ratingService: RatingService,  // Agregar esta línea
    private toastr: ToastrService,
    private breadcrumbService: BreadcrumbService,
    private fb: FormBuilder, // Añadir FormBuilder
    private appComponent: AppComponent
  ) {
    // Inicializar el formulario
    this.tradeForm = this.fb.group({
      notes: ['', [Validators.maxLength(500)]],
      selectedProduct: [null]
    });
  }

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

    // Obtener datos del usuario actual
    if (this.authService.isAuthenticated()) {
      this.currentUser = this.authService.getUserData();
      // Cargar productos del usuario que puedan ser ofrecidos para trueque
      this.loadUserProducts();
    }

    // Verificar si hay un parámetro de tipo y si es tipo trueque
    const productType = this.route.snapshot.queryParamMap.get('type');
    if (productType === 'barter') {
      this.productType = 'barter';
    }

    // Añadir verificación de propuestas existentes
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        const productId = params['id'];
        if (productId && this.authService.isAuthenticated()) {
          this.checkForExistingProposal(Number(productId));
        }
      })
    );

    // Verificar si hay acciones pendientes (como dejar un comentario)
    const pendingAction = localStorage.getItem('pendingAction');
    if (pendingAction === 'comentario') {
      // Limpiar la acción pendiente
      localStorage.removeItem('pendingAction');
      
      // Activar la pestaña de reseñas después de que el componente se haya inicializado
      setTimeout(() => {
        this.activateReviewsTab();
      }, 500);
    }
  }

  ngAfterViewInit(): void {
    // Verificar si hay una acción pendiente
    const pendingAction = localStorage.getItem('pendingAction');
    
    if (pendingAction === 'comentario') {
      // Limpiar la acción pendiente
      localStorage.removeItem('pendingAction');
      
      // Activar la pestaña de reseñas
      this.activateReviewsTab();
    }
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
    console.log(`Intentando cargar producto con ID: ${productId}, Tipo: ${typeof productId}`);
    
    // Verificar si hay un parámetro de tipo
    const productType = this.route.snapshot.queryParamMap.get('type');
    if (productType === 'barter') {
      this.productType = 'barter';
    } else {
      this.productType = 'regular';
    }
    
    // Validar que el ID sea un número válido
    if (!productId || isNaN(productId)) {
      console.error('ID de producto inválido o no es un número:', productId);
      this.toastr.error('ID de producto inválido');
      this.loading = false;
      this.router.navigate(['/shop']);
      return;
    }
    
    // Log para seguimiento
    console.log('Llamando al servicio getProduct con ID:', productId);
    
    this.productService.getProduct(productId).subscribe({
      next: (product) => {
        console.log('Respuesta completa del producto:', JSON.stringify(product));
        
        if (!product || !product.id_product) {
          console.error('Producto no encontrado o datos incompletos:', product);
          this.toastr.error('No se pudo encontrar información del producto');
          this.loading = false;
          this.router.navigate(['/shop']);
          return;
        }
        
        this.product = product;
        
        // Después de cargar el producto, cargar también sus calificaciones
        this.loadProductRatings(productId);
        
        // Actualizar el tipo basado en los datos del producto
        if (product.type === 'barter' || product.permite_trueque) {
          this.productType = 'barter';
        }
        
        // Verificar si el producto tiene las propiedades necesarias
        if (!this.product.name) {
          console.warn('El producto no tiene nombre definido');
          this.product.name = 'Producto sin nombre';
        }
        
        // Verificar si tiene precio
        if (this.product.price === undefined || this.product.price === null) {
          console.warn('El producto no tiene precio definido');
          this.product.price = 0;
        }
        
        // Verificar stock
        if (this.product.stock === undefined || this.product.stock === null) {
          console.warn('El producto no tiene stock definido');
          this.product.stock = 0;
        }
        
        // Actualizar breadcrumbs con el nombre del producto
        this.updateBreadcrumbs();
        
        // Procesar las imágenes del producto
        this.processProductImages();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error detallado al cargar producto:', error);
        this.toastr.error(`Error al cargar el producto: ${error.message || 'Error desconocido'}`);
        this.loading = false;
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
    // Verificar stock primero
    if (this.product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      // Guardar el producto en el carrito pendiente
      this.cartService.savePendingItem(this.product.id_product, this.quantity);
      
      // Mostrar mensaje informativo personalizado
      this.toastr.info(
        `${this.product.name} se agregará a tu carrito al iniciar sesión`,
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      // Guardar la URL actual para redirigir después del login
      const returnUrl = `/shop-detail?id=${this.product.id_product}`;
      localStorage.setItem('redirectAfterLogin', returnUrl);

      // Redireccionar al login
      this.router.navigate(['/login']);
      return;
    }

    // Si está autenticado, proceder con la adición al carrito
    this.cartService.addToCart(this.product.id_product, this.quantity).subscribe({
      next: (response) => {
        if (response.success !== false) {
          this.toastr.success(
            `${this.quantity} ${this.quantity === 1 ? 'unidad' : 'unidades'} de ${this.product.name} ${this.quantity === 1 ? 'agregada' : 'agregadas'} al carrito`
          );
        } else {
          this.toastr.error(response.message || 'Error al agregar al carrito');
        }
      },
      error: (error) => {
        console.error('Error agregando al carrito:', error);
        this.toastr.error('Error al agregar al carrito');
      }
    });
  }

  // Método para verificar si es un producto de trueque
  isBarterProduct(): boolean {
    // Verificar por el tipo explícito o por el campo permite_trueque
    return this.productType === 'barter' || 
           (this.product && (this.product.type === 'barter' || this.product.permite_trueque));
  }

  // Método para proponer un trueque
  proposeBarterForProduct(): void {
    // Verificar si hay propuestas existentes
    if (this.hasExistingProposal) {
      this.toastr.warning(
        'Ya has enviado una propuesta para este producto. Espera a que el dueño responda.',
        'Propuesta existente'
      );
      return;
    }
  
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para proponer un trueque',
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );
  
      // Guardar la URL actual para redirigir después del login
      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
  
      // Redireccionar al login
      this.router.navigate(['/login']);
      return;
    }
  
    // Si el usuario está autenticado, guardar información del producto en localStorage
    if (this.product) {
      // Datos necesarios para la propuesta de trueque
      localStorage.setItem('truequeProductId', this.product.id_product.toString());
      localStorage.setItem('truequeProductName', this.product.name);
      localStorage.setItem('truequeProductOwnerId', this.product.id_user.toString());
      
      // Flag específico para abrir el modal automáticamente
      localStorage.setItem('openBarterProposalModal', 'true');
      
      // Redireccionar al perfil con parámetros más específicos
      this.router.navigate(['/user-profile'], { 
        queryParams: { 
          tab: 'trueques',
          action: 'proponer-trueque',
          openModal: 'true'
        }
      });
    } else {
      this.toastr.error('Error: No se pudo obtener la información del producto');
    }
  }

  // Método para cargar productos del usuario
  loadUserProducts(): void {
    if (!this.currentUser) return;
    
    this.productService.getUserProducts(this.currentUser.id).subscribe({
      next: (products) => {
        this.userProducts = products;
      },
      error: (error) => {
        console.error('Error al cargar productos del usuario:', error);
      }
    });
  }
  
  // Método para mostrar el modal de trueque
  showTradeModal(): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para proponer un trueque',
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      // Guardar la URL actual para redirigir después del login
      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);

      // Redireccionar al login
      this.router.navigate(['/login']);
      return;
    }

    // Guardar el ID del producto actual en localStorage para usarlo en el perfil
    if (this.product) {
      localStorage.setItem('truequeProductId', this.product.id_product.toString());
      localStorage.setItem('truequeProductName', this.product.name);
      localStorage.setItem('truequeProductOwnerId', this.product.id_user.toString());
      
      // SOLO CAMBIAR ESTA LÍNEA - Usar /user-profile en lugar de /perfil
      this.router.navigate(['/user-profile'], { 
        queryParams: { 
          tab: 'trueques',
          action: 'proponer' 
        }
      });
    } else {
      this.toastr.error('No se puede proponer un trueque para este producto');
    }
  }
  
  // Método para cerrar el modal
  closeTradeModal(): void {
    this.showBarterModal = false;
    this.tradeForm.reset();
  }

  // Método para proponer un trueque (reemplazando el método proposeTrade)
  proposeTrade(): void {
    if (!this.currentUser) {
      this.toastr.warning('Debes iniciar sesión para proponer un trueque');
      return;
    }
    
    if (!this.product) {
      this.toastr.error('No se puede proponer trueque: producto no disponible');
      return;
    }
    
    const selectedProductId = this.tradeForm.get('selectedProduct')?.value;
    
    if (!selectedProductId) {
      this.toastr.warning('Debes seleccionar un producto para ofrecer en trueque');
      return;
    }
    
    // Crear objeto con el tipo correcto
    const barterRequest: BarterRequest = {
      id_prod_offer: selectedProductId,
      id_prod_request: this.product.id_product,
      id_user_offer: this.currentUser.id,
      id_user_receiving: this.product.id_user,
      status: "pendiente", // Usar literal de cadena en lugar de string
      notes: this.tradeForm.get('notes')?.value || ''
    };
    
    this.barterService.createBarter(barterRequest).subscribe({
      next: (response) => {
        this.toastr.success('Propuesta de trueque enviada con éxito');
        this.closeTradeModal();
      },
      error: (error) => {
        this.toastr.error('Error al enviar la propuesta de trueque');
        console.error('Error:', error);
      }
    });
  }

  // Añadir este nuevo método para verificar propuestas
  checkForExistingProposal(productId: number): void {
    if (!this.authService.isAuthenticated()) return;

    const userId = this.authService.getUserData()?.id;
    if (!userId || !productId) return;

    this.checkingProposal = true;

    this.barterService.checkExistingProposal(userId, productId).subscribe({
      next: (response) => {
        this.checkingProposal = false;
        this.hasExistingProposal = response.exists;
        this.existingProposal = response.proposal;
        
        if (this.hasExistingProposal) {
          console.log('Ya existe una propuesta para este producto:', this.existingProposal);
        }
      },
      error: (error) => {
        console.error('Error al verificar propuestas existentes:', error);
        this.checkingProposal = false;
      }
    });
  }

  // Método para actualizar las reseñas cuando se envía una nueva
  onRatingSubmitted(event: any): void {
    // Refrescar la lista de calificaciones
    if (this.ratingsList) {
      this.ratingsList.refreshRatings();
    }
    
    // Actualizar el total de reseñas y la calificación promedio
    if (event && event.summary) {
      this.product.rating = event.summary.average;
      this.product.totalRatings = event.summary.total;
    }
  }

  // Añadir este nuevo método
  loadProductRatings(productId: number): void {
    if (!productId) return;
  
    this.ratingService.getProductRatings(productId).subscribe({
      next: (response) => {
        if (response && response.summary) {
          // Agregar la calificación promedio y el total al producto
          this.product.rating = response.summary.average || 0;
          this.product.totalRatings = response.summary.total || 0;
        }
      },
      error: (error) => {
        console.error('Error al cargar calificaciones del producto:', error);
      }
    });
  }

  // Añadir este método a tu clase ShopDetailComponent
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  // Método para redirigir al login guardando la URL actual
  redirectToLogin(action: string): void {
    // Guardar la URL actual para redirigir después del login
    const currentProductId = this.product?.id_product;
    
    if (currentProductId) {
      // Guardar información para redirección después del login
      this.authService.saveRedirectUrl(`/shop-detail?id=${currentProductId}`, action);
      
      // Redirigir al login
      this.router.navigate(['/login']);
    } else {
      this.toastr.error('No se pudo identificar el producto');
    }
  }

  // Añadir este nuevo método para activar la pestaña de reseñas
  activateReviewsTab(): void {
    setTimeout(() => {
      // Buscar el elemento de la pestaña de reseñas y activarlo
      const reviewsTabLink = document.querySelector('a[href="#tab-pane-3"]');
      if (reviewsTabLink) {
        (reviewsTabLink as HTMLElement).click();
        
        // Desplazarse hacia el formulario de comentarios
        setTimeout(() => {
          const reviewsForm = document.querySelector('.tab-pane-3 .rating-form') 
            || document.getElementById('tab-pane-3');
          if (reviewsForm) {
            reviewsForm.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }, 500); // Dar tiempo para que se renderice la página
  }

  // Método para abrir el chat
  openChatWithSeller() {
    console.log('Click en chatear con el vendedor');
    
    // Verificar si hay producto y obtener el ID correcto
    if (!this.product) {
      console.error('Error: No hay producto seleccionado');
      return;
    }
    
    // Verificar qué propiedad contiene el ID (id o id_product)
    const productId = this.product.id_product || this.product.id;
    
    if (!productId) {
      console.error('Error: El producto no tiene un ID válido', this.product);
      return;
    }
    
    // CORREGIDO: Usar la imagen correcta o una por defecto con la ruta correcta
    const sellerImage = this.product.user?.profile_image || '/img/perfil3.png';
    
    console.log('Producto actual:', this.product);
    console.log('ID del producto a usar:', productId);
    console.log('Imagen a usar:', sellerImage);
    
    // Navegar al chat con los parámetros correctos
    this.router.navigate(['/chat/product', productId], { 
      queryParams: {
        otherUserName: this.product.user?.name || 'Vendedor',
        otherUserAvatar: sellerImage
      }
    });
  }
}
