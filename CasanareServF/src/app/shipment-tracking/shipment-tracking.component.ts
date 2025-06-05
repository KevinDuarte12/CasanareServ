import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { ShipmentService } from '../services/shipment-tracking.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-shipment-tracking',
  imports: [
    CommonModule,
    HeaderComponent, 
    FooterComponent, 
    NavbarComponent
  ],
  templateUrl: './shipment-tracking.component.html',
  styleUrl: './shipment-tracking.component.css'
})
export class ShipmentTrackingComponent implements OnInit {
  shipmentData: any = null;
  loading: boolean = true;
  error: string = '';
  
  // Datos para mostrar en la interfaz
  trackingType: 'purchase' | 'barter' = 'purchase';
  reference: string = '';
  products: any[] = [];
  trackingNumber: string = '';
  estimatedDelivery: Date | null = null;
  trackingEvents: any[] = [];
  currentStatus: string = 'pendiente';

  // ✅ AGREGAR: Imágenes de respaldo (copiado de UserviewbarComponent)
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private shipmentService: ShipmentService,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.toastr.warning('Debes iniciar sesión para ver el rastreo');
      this.router.navigate(['/login']);
      return;
    }

    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      const transactionId = params['transaction'];
      const barterId = params['barter'];
      
      if (transactionId) {
        this.loadTransactionShipment(transactionId);
      } else if (barterId) {
        this.loadBarterShipment(barterId);
      } else {
        this.error = 'No se especificó un ID de transacción o trueque válido';
        this.loading = false;
      }
    });
  }

  private loadTransactionShipment(transactionId: number): void {
    this.loading = true;
    
    this.shipmentService.getShipmentByTransaction(transactionId).subscribe({
      next: (data) => {
        this.processShipmentData(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading transaction shipment:', error);
        this.error = 'Error al cargar información de envío';
        this.loading = false;
        this.toastr.error('No se pudo cargar la información de envío');
      }
    });
  }

  private loadBarterShipment(barterId: number): void {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.error = 'No se pudo identificar el usuario';
      this.loading = false;
      return;
    }

    this.loading = true;
    
    this.shipmentService.getShipmentByBarter(barterId, userId).subscribe({
      next: (data) => {
        this.processShipmentData(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading barter shipment:', error);
        this.error = 'Error al cargar información de envío';
        this.loading = false;
        this.toastr.error('No se pudo cargar la información de envío');
      }
    });
  }

  private processShipmentData(data: any): void {
    this.shipmentData = data;
    this.trackingType = data.type;
    this.reference = data.reference;
    this.products = data.products || [];
    this.trackingNumber = data.shipment?.tracking_number || '';
    this.estimatedDelivery = data.shipment?.estimated_delivery ? new Date(data.shipment.estimated_delivery) : null;
    this.trackingEvents = data.shipment?.tracking_events || [];
    this.currentStatus = data.shipment?.status || 'pendiente';

    console.log('Shipment data processed:', {
      type: this.trackingType,
      reference: this.reference,
      products: this.products.length,
      hasTrackingNumber: !!this.trackingNumber
    });
  }

  // ✅ AGREGAR: Método para obtener URL de imagen de producto (copiado de UserviewbarComponent)
  getProductImageUrl(product: any): string {
    if (!product) return this.getRandomFallbackImage(0);

    // IMPORTANTE: Primera prioridad - Buscar productImages como en productos en venta
    if (product.productImages && product.productImages.length > 0) {
      if (typeof product.productImages[0] === 'string') {
        return product.productImages[0];
      } else if (product.productImages[0]?.url) {
        return product.productImages[0].url;
      } else if (product.productImages[0]?.image_url) {
        return product.productImages[0].image_url;
      }
    }

    // Si product_offer tiene productImages
    if (product.product_offer && product.product_offer.productImages &&
      product.product_offer.productImages.length > 0) {
      if (typeof product.product_offer.productImages[0] === 'string') {
        return product.product_offer.productImages[0];
      } else if (product.product_offer.productImages[0]?.url) {
        return product.product_offer.productImages[0].url;
      } else if (product.product_offer.productImages[0]?.image_url) {
        return product.product_offer.productImages[0].image_url;
      }
    }

    // Otras estructuras comunes
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      if (typeof product.images[0] === 'string') {
        return product.images[0];
      } else if (product.images[0]?.url) {
        return product.images[0].url;
      }
    }

    // Imagen directa
    if (product.image && typeof product.image === 'string') {
      return product.image;
    }

    // URL directa
    if (product.url && typeof product.url === 'string') {
      return product.url;
    }

    return this.getRandomFallbackImage(product?.id_product || product?.id || 0);
  }

  // ✅ AGREGAR: Método para imagen de respaldo (copiado de UserviewbarComponent)
  getRandomFallbackImage(productId: number): string {
    if (!productId || !this.fallbackImages || this.fallbackImages.length === 0) {
      return 'img/product-1.jpg';
    }

    const index = productId % this.fallbackImages.length;
    return this.fallbackImages[index];
  }

  // ✅ CORREGIR: Método para manejar errores de imagen (tipado correctamente)
  handleImageError(event: Event, index?: number): void {
    const target = event.target as HTMLImageElement | null;
    if (target) {
      // Usar imagen de respaldo basada en el índice si está disponible
      if (index !== undefined) {
        target.src = this.getRandomFallbackImage(index);
      } else {
        target.src = 'img/product-1.jpg';
      }
    }
  }

  // Método para formatear fecha
  formatDate(date: string | Date): string {
    if (!date) return 'No disponible';
    
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Método para formatear precio
  formatPrice(price: number): string {
    if (!price) return '$0';
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price);
  }

  // Método para obtener el icono del estado actual
  getStatusIcon(): string {
    switch (this.currentStatus) {
      case 'pendiente':
        return 'fas fa-clock';
      case 'en_transito':
        return 'fas fa-truck';
      case 'entregado':
        return 'fas fa-check-circle';
      case 'devuelto':
        return 'fas fa-undo';
      default:
        return 'fas fa-question-circle';
    }
  }

  // Método para obtener la clase CSS del estado
  getStatusClass(): string {
    switch (this.currentStatus) {
      case 'pendiente':
        return 'text-warning';
      case 'en_transito':
        return 'text-info';
      case 'entregado':
        return 'text-success';
      case 'devuelto':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  }

  // Método para determinar si mostrar el progreso
  getProgressWidth(): string {
    switch (this.currentStatus) {
      case 'pendiente':
        return '25%';
      case 'en_transito':
        return '75%';
      case 'entregado':
        return '100%';
      default:
        return '0%';
    }
  }

  // Método para navegar de vuelta
  goBack(): void {
    if (this.trackingType === 'purchase') {
      this.router.navigate(['/user-profile'], { queryParams: { tab: 'comprados' } });
    } else {
      this.router.navigate(['/user-profile'], { queryParams: { tab: 'trueques-completados' } });
    }
  }
}
