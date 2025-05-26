import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BarterService } from '../services/barter.service';
import { ProductService } from '../services/productos.services';
import { UserService } from '../services/user.services';
import { Barter } from '../interfaces/barter';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-barter-details',
  templateUrl: './barter-details.component.html',
  styleUrls: ['./barter-details.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class BarterDetailsComponent implements OnInit, OnDestroy {
  @ViewChild('modalContent') formElement!: ElementRef;
  @Input() barterId: number | null = null;
  @Input() isOpen: boolean = false;
  @Input() initialStatus: string | undefined;
  @Output() close = new EventEmitter<{ refresh: boolean, status?: string }>();

  barter: Barter | null = null;
  loading: boolean = false;
  processing: boolean = false;
  currentUserId: number | null = null;

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

  // Para mostrar información de productos y usuarios
  offeredProductImage: string = '';
  requestedProductImage: string = '';

  // Añadir estas propiedades a la clase
  showExchangeAnimation: boolean = false;
  animationTimeout: any = null;

  // ✅ NUEVAS PROPIEDADES PARA EL CARRUSEL (AGREGAR DESPUÉS DE LAS EXISTENTES)
  offeredProductImages: string[] = [];
  requestedProductImages: string[] = [];
  activeOfferedImageIndex: number = 0;
  activeRequestedImageIndex: number = 0;

  paymentStatus: any = null;
  loadingPaymentStatus: boolean = false;
  showPaymentDetails: boolean = false;
  readonly LOGISTICS_FEE = 10000;

  constructor(
    private barterService: BarterService,
    private productService: ProductService,
    private userService: UserService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Inicializar con imágenes de fallback aleatorias
    this.offeredProductImage = this.getRandomFallbackImage();
    this.requestedProductImage = this.getRandomFallbackImage();
  }

  // Método para obtener una imagen de fallback aleatoria
  getRandomFallbackImage(): string {
    const randomIndex = Math.floor(Math.random() * this.fallbackImages.length);
    return this.fallbackImages[randomIndex];
  }

  ngOnInit(): void {
    // Obtener el ID del usuario actual
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.currentUserId = user.id;
    }

    // Cargar detalles del trueque si tenemos un ID y está abierto
    if (this.isOpen && this.barterId) {
      this.loadBarterDetails();
    }

    // Verificar si es una notificación de aprobación
    const isFromApprovalNotification = this.route.snapshot.queryParams['fromApproval'] === 'true';
    if (isFromApprovalNotification) {
      // Activar animación después de cargar los detalles
      setTimeout(() => {
        this.startExchangeAnimation();
      }, 500);
    }
  }

  // También cargar detalles cuando cambie isOpen o barterId
  ngOnChanges(): void {
    if (this.isOpen && this.barterId && !this.barter) {
      this.loadBarterDetails();
    }
  }
  loadPaymentStatus(): void {
    if (!this.barterId) return;

    this.loadingPaymentStatus = true;
    this.barterService.getBarterPaymentStatus(this.barterId).subscribe({
      next: (response) => {
        if (response.success) {
          this.paymentStatus = response.data;
          console.log('📊 Estado de pagos cargado:', this.paymentStatus);
        }
        this.loadingPaymentStatus = false;
      },
      error: (error) => {
        console.error('❌ Error cargando estado de pagos:', error);
        this.loadingPaymentStatus = false;
      }
    });
  }
  hasCurrentUserPaid(): boolean {
    if (!this.paymentStatus || !this.currentUserId || !this.barter) return false;

    const isOfferingUser = this.barter.id_user_offer === this.currentUserId;

    if (isOfferingUser) {
      return this.paymentStatus.users.offering.payment_completed || false;
    } else {
      return this.paymentStatus.users.receiving.payment_completed || false;
    }
  }
  hasOtherUserPaid(): boolean {
    if (!this.paymentStatus || !this.currentUserId || !this.barter) return false;

    const isOfferingUser = this.barter.id_user_offer === this.currentUserId;

    if (isOfferingUser) {
      return this.paymentStatus.users.receiving.payment_completed || false;
    } else {
      return this.paymentStatus.users.offering.payment_completed || false;
    }
  }
  haveBothUsersPaid(): boolean {
    return this.paymentStatus?.completion?.both_payments_completed || false;
  }
  loadBarterDetails(): void {
    if (!this.barterId) {
      this.toastr.error('ID de trueque no válido');
      return;
    }

    this.loading = true;
    this.barterService.getBarter(this.barterId).subscribe({
      next: (data) => {
        this.barter = data;

        console.log('🔍 Respuesta completa del servidor:', JSON.stringify(data));
        console.log('🔍 Estado recibido del servidor:', this.barter.status);

        // Si el status es incorrecto pero tenemos initialStatus, usar ese
        if (this.initialStatus === 'aprobado_admin' &&
          (!this.barter.status || this.barter.status === 'aceptado')) {
          console.log('⚠️ Corrigiendo estado: de aceptado → aprobado_admin');
          (this.barter as any).status = 'aprobado_admin';
        }

        // Si el estado es nulo o undefined, establecer un valor predeterminado
        if (!this.barter.status) {
          // 1. Usar initialStatus si está disponible
          if (this.initialStatus) {
            this.barter.status = this.initialStatus;
          }
          // 2. Si no hay initialStatus, usar un valor por defecto según el usuario
          else if (this.isAdmin()) {
            // Si es admin y no hay estado, probablemente sea para aprobar
            this.barter.status = 'aceptado';
          } else {
            // Default para otros usuarios
            this.barter.status = 'pendiente';
          }
        }

        console.log('Estado asignado al barter:', this.barter.status);

        this.loading = false;
        this.loadProductImages();

        // ✅ AGREGAR ESTA LÍNEA PARA CARGAR ESTADO DE PAGOS AUTOMÁTICAMENTE
        // si el barter está en estado aprobado_admin o completado
        if (this.barter?.status === 'aprobado_admin' || this.barter?.status === 'completado') {
          this.loadPaymentStatus();
        }
      },
      error: (error) => {
        console.error('Error al cargar detalles del trueque:', error);
        this.toastr.error('Error al cargar detalles del trueque');
        this.loading = false;
      }
    });
  }
  getCurrentUserPaymentStatus(): string {
    if (this.hasCurrentUserPaid()) {
      return '✅ Has completado tu pago';
    }
    return '⏳ Pendiente de pago';
  }
  getOtherUserPaymentStatus(): string {
    if (!this.barter) return 'Desconocido';

    const isOfferingUser = this.barter.id_user_offer === this.currentUserId;
    const otherUserName = isOfferingUser
      ? (this.barter.receiving_user?.name || 'El otro usuario')
      : (this.barter.offering_user?.name || 'El otro usuario');

    if (this.hasOtherUserPaid()) {
      return `✅ ${otherUserName} completó su pago`;
    }
    return `⏳ ${otherUserName} pendiente de pago`;
  }
  togglePaymentDetails(): void {
    this.showPaymentDetails = !this.showPaymentDetails;

    if (this.showPaymentDetails && !this.paymentStatus) {
      this.loadPaymentStatus();
    }
  }
  loadProductImages(): void {
    // ✅ AGREGAR ESTAS LÍNEAS AL INICIO DEL MÉTODO EXISTENTE
    // Reinicializar arrays de imágenes del carrusel
    this.offeredProductImages = [];
    this.requestedProductImages = [];
    this.activeOfferedImageIndex = 0;
    this.activeRequestedImageIndex = 0;

    // Inicializar con imágenes de fallback aleatorias para esta carga específica
    this.offeredProductImage = this.getRandomFallbackImage();
    this.requestedProductImage = this.getRandomFallbackImage();

    // Cargar imagen del producto ofrecido
    if (this.barter?.id_prod_offer) {
      this.productService.getProduct(this.barter.id_prod_offer).subscribe({
        next: (product) => {
          // ✅ AGREGAR ESTA LÍNEA PARA PROCESAR IMÁGENES DEL CARRUSEL
          this.processProductImagesForCarousel(product, 'offered');

          if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            // Determinar si las imágenes son strings o objetos
            if (typeof product.images[0] === 'string') {
              this.offeredProductImage = product.images[0] || this.offeredProductImage;
            } else if (product.images[0]?.url) {
              this.offeredProductImage = product.images[0].url || this.offeredProductImage;
            }
          }

          // Verificar si la imagen está vacía o es inválida
          this.checkImageValidity(this.offeredProductImage, 'offered');
        },
        error: (error) => {
          console.error('Error al cargar imagen del producto ofrecido:', error);
          // ✅ AGREGAR IMAGEN DE FALLBACK PARA EL CARRUSEL EN CASO DE ERROR
          this.offeredProductImages = [this.getRandomFallbackImage()];
          // Mantener la imagen de fallback en caso de error
        }
      });
    }

    // Cargar imagen del producto solicitado
    if (this.barter?.id_prod_request) {
      this.productService.getProduct(this.barter.id_prod_request).subscribe({
        next: (product) => {
          // ✅ AGREGAR ESTA LÍNEA PARA PROCESAR IMÁGENES DEL CARRUSEL
          this.processProductImagesForCarousel(product, 'requested');

          if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
            // Determinar si las imágenes son strings o objetos
            if (typeof product.images[0] === 'string') {
              this.requestedProductImage = product.images[0] || this.requestedProductImage;
            } else if (product.images[0]?.url) {
              this.requestedProductImage = product.images[0].url || this.requestedProductImage;
            }
          }

          // Verificar si la imagen está vacía o es inválida
          this.checkImageValidity(this.requestedProductImage, 'requested');
        },
        error: (error) => {
          console.error('Error al cargar imagen del producto solicitado:', error);
          // ✅ AGREGAR IMAGEN DE FALLBACK PARA EL CARRUSEL EN CASO DE ERROR
          this.requestedProductImages = [this.getRandomFallbackImage()];
          // Mantener la imagen de fallback en caso de error
        }
      });
    }
  }

  // Método para verificar si una URL de imagen es válida
  checkImageValidity(imageUrl: string, type: 'offered' | 'requested'): void {
    if (!imageUrl || imageUrl.trim() === '') {
      // Si la URL está vacía, usar imagen de fallback
      if (type === 'offered') {
        this.offeredProductImage = this.getRandomFallbackImage();
      } else {
        this.requestedProductImage = this.getRandomFallbackImage();
      }
      return;
    }

    // Verificar si la URL es válida cargando la imagen
    const img = new Image();
    img.onload = () => {
      // La imagen cargó correctamente, no hacemos nada
    };
    img.onerror = () => {
      // Si la imagen no carga, usar imagen de fallback
      if (type === 'offered') {
        this.offeredProductImage = this.getRandomFallbackImage();
      } else {
        this.requestedProductImage = this.getRandomFallbackImage();
      }
    };
    img.src = imageUrl;
  }

  // Método auxiliar para comprobar si hay valor adicional
  hasAdditionalValue(): boolean {
    return !!this.barter?.value && this.barter.value > 0;
  }

  acceptBarter(): void {
    if (!this.barterId || !this.barter) {
      this.toastr.error('Información de trueque incompleta');
      return;
    }

    if (this.processing) return;

    this.processing = true;
    this.barterService.updateBarterStatus(this.barterId, 'aceptado').pipe(
      // Obtener los datos actualizados después de aceptar
      switchMap(() => this.barterService.getBarter(this.barterId!))
    ).subscribe({
      next: (updatedBarter) => {
        // Actualizar la referencia local con los datos frescos del servidor
        this.barter = updatedBarter;
        this.toastr.success('Propuesta de trueque aceptada correctamente');
        this.processing = false;

        // Añadir un pequeño retraso para que el usuario vea el cambio de estado
        setTimeout(() => {
          // Pasar el estado actualizado al cerrar
          this.closeModal(true, 'aceptado');
        }, 500);
      },
      error: (error) => {
        console.error('Error al aceptar trueque:', error);
        this.toastr.error('Error al aceptar la propuesta de trueque');
        this.processing = false;
      }
    });
  }
  // Reemplazar la función rejectBarter por esta versión corregida:
  rejectBarter(): void {
    if (!this.barterId) return;
    this.loading = true;
    this.processing = true;

    this.barterService.updateBarterStatus(this.barterId, 'rechazado').pipe(
      // Al rechazar, inmediatamente actualiza la vista local
      tap(() => {
        // Actualizar estado local inmediatamente para mejorar UX
        if (this.barter) {
          this.barter.status = 'disponible';
          this.barter.id_user_receiving = 0;
          this.barter.receiving_user = undefined; // Cambiado de null a undefined
          this.barter.id_prod_request = 0;
          this.barter.requested_product = undefined; // Cambiado de null a undefined
          this.barter.value = 0;
          this.barter.exchange_type = 'product_for_product';
        }
      }),
      // Luego obtener datos frescos del servidor (opcional pero recomendado)
      switchMap(() => this.barterService.getBarter(this.barterId!)) // Corregido: getBarter en lugar de getBarterById
    ).subscribe({
      next: (updatedBarter) => {
        // Actualizar con los datos más recientes del servidor
        this.barter = updatedBarter;
        this.toastr.success('Has rechazado esta propuesta. El trueque sigue disponible para nuevas ofertas.');
        this.loading = false;
        this.processing = false;
        // Notificar al componente padre para actualizar la lista si es necesario
        this.close.emit({ refresh: true, status: 'disponible' });
      },
      error: (error) => {
        console.error('Error al rechazar el trueque:', error);
        this.toastr.error('No se pudo rechazar la propuesta');
        this.loading = false;
        this.processing = false;
      }
    });
  }

  // Verificar si el usuario actual puede aceptar/rechazar la propuesta
  canRespondToProposal(): boolean {
    if (!this.barter || !this.currentUserId) return false;
    return this.barter.status === 'pendiente' &&
      this.barter.id_user_offer === this.currentUserId;
  }

  // Verificar si el usuario actual es el oferente
  isBarterOfferer(): boolean {
    if (!this.barter || !this.currentUserId) return false;

    return this.barter.id_user_offer === this.currentUserId;
  }

  // Obtener nombre a mostrar para estados
  getStatusLabel(): string {


    // Si tenemos initialStatus y no hay barter o su estado es indefinido, usar initialStatus
    if (this.initialStatus && (!this.barter || !this.barter.status)) {
      return this.getStatusLabelFromValue(this.initialStatus);
    }

    if (!this.barter) return 'Estado no disponible';

    // Verificar explícitamente para cada tipo de estado
    if (this.barter.status === 'aprobado_admin') {
      return 'Aprobado por administración';
    }

    if (!this.barter.status) return 'Estado pendiente';

    return this.getStatusLabelFromValue(this.barter.status);
  }

  // Método auxiliar para convertir el valor del estado en un texto legible
  private getStatusLabelFromValue(status: string): string {
    switch (status) {
      case 'pendiente': return 'Pendiente de respuesta';
      case 'aceptado': return 'Aceptado - Esperando aprobación administrativa';
      case 'aprobado_admin': return 'Aprobado por administración';
      case 'rechazado': return 'Rechazado';
      case 'completado': return 'Completado';
      case 'disponible': return 'Disponible';
      default: return `Estado: ${status}`;
    }
  }

  // Obtener clase CSS para el estado
  getStatusClass(): string {
    // Si tenemos initialStatus y no hay barter o su estado es indefinido, usar initialStatus
    if (this.initialStatus && (!this.barter || !this.barter.status)) {
      return this.getStatusClassFromValue(this.initialStatus);
    }

    if (!this.barter || !this.barter.status) return 'status-unknown';

    return this.getStatusClassFromValue(this.barter.status);
  }

  // Método auxiliar para convertir el valor del estado en una clase CSS
  private getStatusClassFromValue(status: string): string {
    switch (status) {
      case 'pendiente': return 'status-pending';
      case 'aceptado': return 'status-accepted';
      case 'aprobado_admin': return 'status-approved';
      case 'rechazado': return 'status-rejected';
      case 'completado': return 'status-completed';
      case 'disponible': return 'status-available';
      default: return 'status-unknown';
    }
  }

  // Añade este método para verificar si el usuario actual es administrador
  isAdmin(): boolean {
    const userData = localStorage.getItem('user');
    if (!userData) return false;

    try {
      const user = JSON.parse(userData);
      return user.rol === 'admin';
    } catch (e) {
      return false;
    }
  }

  // Método para aprobar un trueque como administrador
  approveBarterByAdmin(): void {
    if (!this.barterId || !this.barter) {
      this.toastr.error('Información de trueque incompleta');
      return;
    }

    if (this.processing) return;

    this.processing = true;
    console.log(`Enviando petición para aprobar trueque: ${this.barterId} -> aprobado_admin`);

    this.barterService.updateBarterStatus(this.barterId, 'aprobado_admin').subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor para aprobación:', response);

        // Verificar que el trueque tenga el estado correcto
        if (response && response.barter && response.barter.status) {
          console.log(`✅ Estado devuelto por el servidor: ${response.barter.status}`);
        } else {
          console.warn('⚠️ La respuesta no contiene el estado actualizado del trueque');
        }

        // Actualizar el estado localmente
        if (this.barter) {
          (this.barter as any).status = 'aprobado_admin';
          console.log('✅ Estado actualizado localmente a:', this.barter.status);
        }

        this.toastr.success('Trueque aprobado correctamente');
        this.processing = false;

        // Forzar renderizado antes de cerrar para mostrar el estado actualizado
        setTimeout(() => {
          this.closeModal(true, 'aprobado_admin');
        }, 500);
      },
      error: (error) => {
        console.error('❌ Error al aprobar trueque:', error);
        this.toastr.error('Error al aprobar el trueque');
        this.processing = false;
      }
    });
  }

  // Añade este método para depuración
  getDebugInfo(): string {
    if (!this.barter) return 'Sin datos';

    return `ID: ${this.barter.id_barter}, Estado: ${this.barter.status || 'vacío'}, 
      Initial: ${this.initialStatus || 'no definido'}`;
  }

  // Método para iniciar la animación
  startExchangeAnimation(): void {
    this.showExchangeAnimation = true;

    // Iniciar la animación después de un breve retraso
    setTimeout(() => {
      const animationContainer = document.querySelector('.exchange-animation-container');
      if (animationContainer) {
        animationContainer.classList.add('animate');

        // Reproducir sonido de éxito (opcional)
        const successSound = new Audio('assets/sounds/success.mp3');
        successSound.play().catch(err => console.log('No se pudo reproducir el sonido'));

        // Mostrar mensaje de felicitación después de que termine la animación
        this.animationTimeout = setTimeout(() => {
          this.toastr.success('¡Felicidades! El trueque ha sido completado exitosamente');
        }, 1500);
      }
    }, 200);
  }

  // Asegúrate de limpiar los timeouts al destruir el componente
  ngOnDestroy(): void {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }

  // Cerrar el modal
  closeModal(refresh: boolean = false, status?: string): void {
    this.close.emit({ refresh, status });
  }

  // Manejar clics fuera del modal para cerrarlo
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.isOpen && !this.loading && !this.processing) {
      const modalContent = this.formElement?.nativeElement;
      if (modalContent && !modalContent.contains(event.target)) {
        this.closeModal();
      }
    }
  }

  // Prevenir que clics dentro del modal lo cierren
  onFormClick(event: Event): void {
    event.stopPropagation();
  }

  // Método para navegación
  goBack(): void {
    this.router.navigate(['/userviewbar']);
  }

  // Añade este método a tu clase BarterDetailsComponent
  getProductImageUrl(product: any): string {
    if (!product) return this.getRandomFallbackImage();

    // Primero intentar obtener imágenes del array de imágenes
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      // Determinar si las imágenes son strings o objetos
      if (typeof product.images[0] === 'string') {
        return product.images[0];
      } else if (product.images[0]?.url) {
        return product.images[0].url;
      }
    }

    // Si no hay array de imágenes, verificar si tiene la propiedad 'image'
    if (product.image) {
      return product.image;
    }

    // Si no se encuentra ninguna imagen, devolver una imagen predeterminada
    return this.getRandomFallbackImage();
  }

  // Añadir estos métodos

  getExchangeType(): 'product_for_product' | 'product_with_money' | 'money_only' {
    if (!this.barter) return 'product_for_product';

    // Si tiene la propiedad exchange_type, usarla directamente
    if ((this.barter as any).exchange_type) {
      return (this.barter as any).exchange_type;
    }

    // Inferir basado en si hay un valor monetario
    if (this.barter.value && this.barter.value > 0) {
      // Si no hay producto de oferta o es un producto especial de tipo "money_offer"
      if (!this.barter.offered_product ||
        (this.barter.offered_product && this.barter.offered_product.type === 'money_offer')) {
        return 'money_only';
      }
      // Si hay producto y valor, es un intercambio mixto
      return 'product_with_money';
    }

    // Por defecto, es producto por producto
    return 'product_for_product';
  }

  hasMonetaryValue(): boolean {
    return !!this.barter?.value && this.barter.value > 0;
  }

  // ¿El usuario currentUser es el que paga el valor adicional?
  isCurrentUserPaying(): boolean {
    // Si no hay barter o no hay valor, no hay nada que pagar
    if (!this.barter || !this.barter.value) return false;

    // Para ofertas de solo dinero: Usuario B (quien hizo la propuesta) es quien paga
    if (this.barter.exchange_type === 'money_only') {
      // El que recibe el producto (usuario B) es quien paga
      return this.barter.id_user_receiving === this.currentUserId;
    } else {
      // Para otros tipos de trueque, la lógica existente aplica
      // El usuario con el producto de menor valor es quien paga la diferencia
      if (!this.barter.offered_product || !this.barter.requested_product) return false;

      const offeredPrice = this.barter.offered_product.price || 0;
      const requestedPrice = this.barter.requested_product.price || 0;

      // Si el usuario currentUser es el offerer y su producto vale menos
      if (this.barter.id_user_offer === this.currentUserId && offeredPrice < requestedPrice) {
        return true;
      }

      // Si el usuario currentUser es el receiver y su producto vale menos
      if (this.barter.id_user_receiving === this.currentUserId && requestedPrice < offeredPrice) {
        return true;
      }

      return false;
    }
  }

  isCurrentUserReceiving(): boolean {
    // Si no hay barter o no hay valor, no hay nada que recibir
    if (!this.barter || !this.barter.value) return false;

    // Para ofertas de solo dinero: Usuario A (dueño del producto original) es quien recibe el dinero
    if (this.barter.exchange_type === 'money_only') {
      // El dueño del producto ofertado (usuario A) es quien recibe el dinero
      return this.barter.id_user_offer === this.currentUserId;
    } else {
      // Para otros tipos de trueque, la lógica existente aplica
      // El usuario con el producto de mayor valor es quien recibe la diferencia
      if (!this.barter.offered_product || !this.barter.requested_product) return false;

      const offeredPrice = this.barter.offered_product.price || 0;
      const requestedPrice = this.barter.requested_product.price || 0;

      // Si el usuario currentUser es el offerer y su producto vale más
      if (this.barter.id_user_offer === this.currentUserId && offeredPrice > requestedPrice) {
        return true;
      }

      // Si el usuario currentUser es el receiver y su producto vale más
      if (this.barter.id_user_receiving === this.currentUserId && requestedPrice > offeredPrice) {
        return true;
      }

      return false;
    }
  }

  // Verificar si el usuario actual es el que ofrece el producto (Usuario A)
  isCurrentUserOfferingProduct(): boolean {
    if (!this.barter || !this.currentUserId) return false;
    return this.barter.id_user_offer === this.currentUserId;
  }

  // Verificar si el usuario actual es el que recibe el producto (Usuario B)
  isCurrentUserReceivingProduct(): boolean {
    if (!this.barter || !this.currentUserId) return false;
    return this.barter.id_user_receiving === this.currentUserId;
  }

  // Para agregar dirección de recogida
  addPickupAddress(): void {
    // Guardar referencia del trueque en localStorage para usar en la página de direcciones
    localStorage.setItem('currentBarterCheckout', JSON.stringify({
      barterId: this.barter?.id_barter,
      addressType: 'pickup',
      exchangeType: this.barter?.exchange_type || 'product_for_product'
    }));

    // Navegar a la página de direcciones con parámetro para recogida
    this.router.navigate(['/address-management'], {
      queryParams: {
        type: 'pickup',
        barterId: this.barter?.id_barter,
        returnUrl: `/barter-details/${this.barter?.id_barter}`
      }
    });
  }

  // Para agregar dirección de entrega
  addDeliveryAddress(): void {
    // Guardar referencia del trueque en localStorage para usar en la página de direcciones
    localStorage.setItem('currentBarterCheckout', JSON.stringify({
      barterId: this.barter?.id_barter,
      addressType: 'delivery',
      exchangeType: this.barter?.exchange_type || 'product_for_product'
    }));

    // Navegar a la página de direcciones con parámetro para entrega
    this.router.navigate(['/address-management'], {
      queryParams: {
        type: 'delivery',
        barterId: this.barter?.id_barter,
        returnUrl: `/barter-details/${this.barter?.id_barter}`
      }
    });
  }

  // Para proceder al checkout
  proceedToCheckout(): void {
    if (!this.barter) {
      this.toastr.error('Información del trueque no disponible');
      return;
    }

    // Guardar información del trueque para usarla en el checkout
    localStorage.setItem('barterCheckout', JSON.stringify({
      barterId: this.barter.id_barter,
      exchangeType: this.barter.exchange_type || 'product_for_product',
      value: this.barter.value || 0,
      logisticsFee: this.LOGISTICS_FEE,
      isOfferingUser: this.isCurrentUserOfferingProduct(),
      isReceivingUser: this.isCurrentUserReceivingProduct(),
      offeredProductId: this.barter.id_prod_offer,
      requestedProductId: this.barter.id_prod_request
    }));

    // Navegar a la página de checkout específica para trueques
    this.router.navigate(['/barter-checkout', this.barter.id_barter]);
  }

  // ✅ NUEVO MÉTODO PARA PROCESAR IMÁGENES DEL CARRUSEL (AGREGAR AL FINAL DE LA CLASE)
  processProductImagesForCarousel(product: any, type: 'offered' | 'requested'): void {
    let productImages: string[] = [];

    // Verificar si el producto tiene imágenes
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      console.log(`Producto ${type} tiene ${product.images.length} imágenes para carrusel`);

      // Extraer las URLs de las imágenes del producto
      productImages = product.images.map((img: any) => {
        if (typeof img === 'string') {
          return img;
        } else if (img && img.url) {
          return img.url;
        }
        return null;
      }).filter((url: string | null) => url !== null);

      // Ordenar para que la imagen principal aparezca primero
      productImages.sort((a, b) => {
        const imgA = product.images.find((img: any) =>
          (typeof img === 'string' ? img : img.url) === a
        );
        const imgB = product.images.find((img: any) =>
          (typeof img === 'string' ? img : img.url) === b
        );

        const isMainA = imgA && typeof imgA === 'object' && imgA.is_main;
        const isMainB = imgB && typeof imgB === 'object' && imgB.is_main;

        if (isMainA && !isMainB) return -1;
        if (!isMainA && isMainB) return 1;
        return 0;
      });
    } else if (product?.image_url) {
      // Si hay una sola imagen en image_url
      console.log(`Usando image_url del producto ${type} para carrusel`);
      productImages = [product.image_url];
    }

    // Si no hay imágenes, usar imagen de fallback
    if (productImages.length === 0) {
      productImages = [this.getRandomFallbackImage()];
    }

    // Asignar las imágenes al array correspondiente
    if (type === 'offered') {
      this.offeredProductImages = productImages;
      console.log(`Total de imágenes ofrecidas en carrusel: ${this.offeredProductImages.length}`);
    } else {
      this.requestedProductImages = productImages;
      console.log(`Total de imágenes solicitadas en carrusel: ${this.requestedProductImages.length}`);
    }
  }

  // ✅ MÉTODOS PARA MANEJAR EL CARRUSEL DEL PRODUCTO OFRECIDO (AGREGAR AL FINAL)
  setActiveOfferedImage(index: number): void {
    if (this.activeOfferedImageIndex === index) return;
    this.activeOfferedImageIndex = index;
  }

  nextOfferedImage(): void {
    const newIndex = (this.activeOfferedImageIndex + 1) % this.offeredProductImages.length;
    this.setActiveOfferedImage(newIndex);
  }

  prevOfferedImage(): void {
    const newIndex = (this.activeOfferedImageIndex - 1 + this.offeredProductImages.length) % this.offeredProductImages.length;
    this.setActiveOfferedImage(newIndex);
  }

  // ✅ MÉTODOS PARA MANEJAR EL CARRUSEL DEL PRODUCTO SOLICITADO (AGREGAR AL FINAL)
  setActiveRequestedImage(index: number): void {
    if (this.activeRequestedImageIndex === index) return;
    this.activeRequestedImageIndex = index;
  }

  nextRequestedImage(): void {
    const newIndex = (this.activeRequestedImageIndex + 1) % this.requestedProductImages.length;
    this.setActiveRequestedImage(newIndex);
  }

  prevRequestedImage(): void {
    const newIndex = (this.activeRequestedImageIndex - 1 + this.requestedProductImages.length) % this.requestedProductImages.length;
    this.setActiveRequestedImage(newIndex);
  }

  // ✅ MÉTODO PARA MANEJAR ERRORES DE CARGA DE IMÁGENES DEL CARRUSEL (AGREGAR AL FINAL)
  handleImageError(event: any, index: number, type: 'offered' | 'requested'): void {
    console.warn(`Error cargando imagen ${index} del producto ${type} en carrusel`);
    // Reemplazar con imagen de respaldo si falla la carga
    const fallbackImage = this.getRandomFallbackImage();
    event.target.src = fallbackImage;

    // Actualizar el array correspondiente
    if (type === 'offered' && this.offeredProductImages[index]) {
      this.offeredProductImages[index] = fallbackImage;
    } else if (type === 'requested' && this.requestedProductImages[index]) {
      this.requestedProductImages[index] = fallbackImage;
    }
  }
}
