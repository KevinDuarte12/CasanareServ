import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BarterService } from '../services/barter.service';
import { ProductService } from '../services/productos.services';
import { UserService } from '../services/user.services';
import { Barter } from '../interfaces/barter';
import { environment } from '../../environment/environment';

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
  @Output() close = new EventEmitter<{refresh: boolean, status?: string}>();
  
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
      },
      error: (error) => {
        console.error('Error al cargar detalles del trueque:', error);
        this.toastr.error('Error al cargar detalles del trueque');
        this.loading = false;
      }
    });
  }

  loadProductImages(): void {
    // Inicializar con imágenes de fallback aleatorias para esta carga específica
    this.offeredProductImage = this.getRandomFallbackImage();
    this.requestedProductImage = this.getRandomFallbackImage();
    
    // Cargar imagen del producto ofrecido
    if (this.barter?.id_prod_offer) {
      this.productService.getProduct(this.barter.id_prod_offer).subscribe({
        next: (product) => {
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
          // Mantener la imagen de fallback en caso de error
        }
      });
    }

    // Cargar imagen del producto solicitado
    if (this.barter?.id_prod_request) {
      this.productService.getProduct(this.barter.id_prod_request).subscribe({
        next: (product) => {
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
    this.barterService.updateBarterStatus(this.barterId, 'aceptado').subscribe({
      next: () => {
        this.toastr.success('Propuesta de trueque aceptada correctamente');
        if (this.barter) {
          this.barter.status = 'aceptado';
        }
        this.processing = false;
        this.closeModal(true, 'aceptado');
      },
      error: (error) => {
        console.error('Error al aceptar trueque:', error);
        this.toastr.error('Error al aceptar la propuesta de trueque');
        this.processing = false;
      }
    });
  }

  rejectBarter(): void {
    if (!this.barterId || !this.barter) {
      this.toastr.error('Información de trueque incompleta');
      return;
    }

    if (this.processing) return;

    this.processing = true;
    this.barterService.updateBarterStatus(this.barterId, 'rechazado').subscribe({
      next: () => {
        this.toastr.success('Propuesta de trueque rechazada');
        if (this.barter) {
          this.barter.status = 'rechazado';
        }
        this.processing = false;
        this.closeModal(true, 'rechazado');
      },
      error: (error) => {
        console.error('Error al rechazar trueque:', error);
        this.toastr.error('Error al rechazar la propuesta de trueque');
        this.processing = false;
      }
    });
  }

  // Verificar si el usuario actual puede aceptar/rechazar la propuesta
  canRespondToProposal(): boolean {
    if (!this.barter || !this.currentUserId) return false;
    
    return this.barter.status === 'pendiente' && 
           this.barter.id_user_receiving === this.currentUserId;
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
    switch(status) {
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
    switch(status) {
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
}
