import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BarterService } from '../services/barter.service';
import { DeliveryAddressService } from '../services/delivery-address.service';
import { ProductService } from '../services/productos.services';
import { Barter } from '../interfaces/barter';
import { DeliveryAddress } from '../interfaces/deliveryAddress';
import { AddressFormModalComponent } from '../address-form-modal/address-form-modal.component';

@Component({
  selector: 'app-barter-checkout',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    RouterLink,
    RouterModule,
    AddressFormModalComponent
  ],
  templateUrl: './barter-checkout.component.html',
  styleUrls: ['./barter-checkout.component.css']
})
export class BarterCheckoutComponent implements OnInit {
  barterId: number | null = null;
  barter: Barter | null = null;
  checkoutData: any = null;
  loading: boolean = true;
  isProcessingPayment: boolean = false;
  
  // Direcciones seleccionadas y modal
  pickupAddress: any = null;    // Dirección de recogida
  deliveryAddress: any = null;  // Dirección de entrega
  addresses: DeliveryAddress[] = [];
  showAddressModal: boolean = false;
  addressToEdit: DeliveryAddress | null = null;
  
  // Nuevo: variable para rastrear el contexto actual de edición
  editingContext: 'pickup' | 'delivery' | null = null;
  
  // Valor logístico fijo
  readonly LOGISTICS_FEE: number = 10000;
  
  // Total a pagar
  totalPayment: number = 0;

  // Array de rutas de imágenes estáticas para fallback
  private fallbackImages: string[] = [
    'img/product-1.jpg',
    'img/product-2.jpg',
    'img/product-3.jpg',
    'img/product-4.jpg',
    'img/product-5.jpg',
    'img/product-6.jpg',
    'img/product-7.jpg',
    'img/product-8.jpg'
  ];

  // Caché de imágenes de productos
  private productImagesCache: Map<number, string> = new Map();

  constructor(
    private barterService: BarterService,
    private addressService: DeliveryAddressService,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Recuperar datos del checkout
    const checkoutDataStr = localStorage.getItem('barterCheckout');
    if (checkoutDataStr) {
      this.checkoutData = JSON.parse(checkoutDataStr);
      this.barterId = this.checkoutData.barterId;
    } else {
      // Si no hay datos en localStorage, intentar obtener de URL
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) this.barterId = +id;
      });
    }

    if (!this.barterId) {
      this.toastr.error('No se pudo identificar el trueque');
      this.router.navigate(['/userviewbar']);
      return;
    }

    // Cargar datos del trueque y direcciones
    this.loadBarterDetails();
    this.loadUserAddresses();
  }

  loadBarterDetails(): void {
    if (!this.barterId) return;
    
    this.barterService.getBarter(this.barterId).subscribe({
      next: (data) => {
        if (!data) {
          this.toastr.error('No se pudo cargar el trueque');
          this.router.navigate(['/userviewbar']);
          return;
        }
        this.barter = data;
        this.calculateTotalPayment();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del trueque:', error);
        this.toastr.error('Error al cargar detalles del trueque');
        this.loading = false;
        this.router.navigate(['/userviewbar']);
      }
    });
  }

  // Modificado para separar la selección de direcciones
  loadUserAddresses(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    // Usando el servicio de direcciones existente
    this.addressService.getUserAddresses(userId).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        
        // Preseleccionar dirección predeterminada si existe
        const defaultAddress = addresses.find(a => a.is_default);
        if (defaultAddress) {
          if (this.needsPickupAddress() && !this.pickupAddress) {
            this.pickupAddress = defaultAddress;
          }
          
          if (this.needsDeliveryAddress() && !this.deliveryAddress) {
            this.deliveryAddress = defaultAddress;
          }
        }
      },
      error: (error) => {
        console.error('Error al cargar direcciones:', error);
        this.toastr.error('No se pudieron cargar las direcciones');
      }
    });
  }

  // Actualizar estos dos métodos:
  selectPickupAddress(address?: DeliveryAddress): void {
    if (address) {
      this.pickupAddress = address;
      console.log('🏠 Dirección de recogida seleccionada:', address);
    }
  }

  selectDeliveryAddress(address?: DeliveryAddress): void {
    if (address) {
      this.deliveryAddress = address;
      console.log('📦 Dirección de entrega seleccionada:', address);
    }
  }

  calculateTotalPayment(): void {
    if (!this.barter) {
      this.totalPayment = this.LOGISTICS_FEE;
      return;
    }
    
    // Inicialmente el total es la tarifa logística
    this.totalPayment = this.LOGISTICS_FEE;
    
    // Si el usuario actual debe pagar valor adicional
    if (this.isCurrentUserPaying()) {
      this.totalPayment += (this.barter.value || 0);
    }
  }

  // Determinar si el usuario actual paga valor adicional
  isCurrentUserPaying(): boolean {
    if (!this.barter || !this.checkoutData) return false;
    
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    
    // Para ofertas de solo dinero: Usuario B (quien recibe el producto) paga
    if (this.barter.exchange_type === 'money_only') {
      return this.barter.id_user_receiving === currentUserId;
    } else if (this.barter.exchange_type === 'product_with_money') {
      // Para trueques producto+dinero: depende del valor de los productos
      return this.checkoutData.isReceivingUser && (this.barter.value || 0) > 0;
    }
    
    return false;
  }

  // Modificar el método getCurrentUserId para aceptar un parámetro opcional
  getCurrentUserId(ignoreParam?: any): number | null {
    const userData = localStorage.getItem('user');
    if (!userData) return null;
    
    try {
      const user = JSON.parse(userData);
      return user.id;
    } catch (e) {
      return null;
    }
  }

  // Método actualizado para determinar si se debe mostrar la sección de dirección de recogida
  needsPickupAddress(): boolean {
    if (!this.barter) return false;
    
    // Obtener el ID del usuario actual
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    
    // Si es producto regular (no es trueque), no necesita dirección de recogida
    if (this.barter.offered_product?.type === 'regular') return false;
    
    // Para trueques, la lógica depende del tipo de intercambio y del rol del usuario
    
    // Caso: Solo dinero (money_only)
    if (this.barter.exchange_type === 'money_only') {
      // Solo el Usuario A (vendedor/oferente) necesita dirección de recogida
      return this.barter.id_user_offer === currentUserId;
    }
    
    // Caso: Producto por producto o Producto más dinero
    // Ambos usuarios necesitan dirección de recogida
    return true;
  }

  // Método para determinar si se debe mostrar la sección de dirección de entrega
  needsDeliveryAddress(): boolean {
    if (!this.barter) return false;
    
    // Obtener el ID del usuario actual
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    
    // Caso: Solo dinero (money_only)
    if (this.barter.exchange_type === 'money_only') {
      // Si es Usuario A (vendedor), no necesita dirección de entrega
      if (this.barter.id_user_offer === currentUserId) {
        return false;
      }
    }
    
    // Para todos los demás casos, siempre se necesita dirección de entrega
    return true;
  }

  // MÉTODOS MEJORADOS PARA GESTIÓN DE DIRECCIONES

  // Actualizado para capturar el contexto
  openAddressModal(address: DeliveryAddress | null | undefined, context?: 'pickup' | 'delivery'): void {
    this.addressToEdit = address || null;
    this.editingContext = context || null;
    this.showAddressModal = true;
    
    // Mostrar información de debug
    console.log(`🔍 Abriendo modal para ${this.addressToEdit ? 'editar' : 'crear'} dirección. Contexto: ${this.editingContext || 'ninguno'}`);
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
    this.addressToEdit = null;
    this.editingContext = null;
  }

  // Método para aplicar una dirección al contexto correcto
  applyNewAddress(address: DeliveryAddress): void {
    if (this.editingContext === 'pickup') {  // Corregir: Faltaba paréntesis aquí
      console.log('🏠 Aplicando nueva dirección como dirección de recogida:', address);
      this.pickupAddress = address;
      this.toastr.success('Dirección de recogida actualizada');
    } 
    else if (this.editingContext === 'delivery') {
      console.log('📦 Aplicando nueva dirección como dirección de entrega:', address);
      this.deliveryAddress = address;
      this.toastr.success('Dirección de entrega actualizada');
    }
  }

  // Versión actualizada que utiliza el contexto de edición
  onAddressSaved(address: DeliveryAddress): void {
    // Recargar todas las direcciones para mantener la lista actualizada
    this.loadUserAddresses();
    
    // Aplicar en el contexto específico si hay uno
    if (this.editingContext) {
      this.applyNewAddress(address);
    } else {
      this.toastr.success('Dirección guardada correctamente');
    }
    
    // Si estábamos editando una dirección que ya estaba seleccionada
    if (this.addressToEdit) {
      if (this.pickupAddress?.id === this.addressToEdit.id) {
        // Buscar la dirección actualizada en la próxima carga
        setTimeout(() => {
          const updatedAddress = this.addresses.find(a => a.id === address.id);
          if (updatedAddress) this.pickupAddress = updatedAddress;
        }, 100);
      }
      
      if (this.deliveryAddress?.id === this.addressToEdit.id) {
        // Buscar la dirección actualizada en la próxima carga
        setTimeout(() => {
          const updatedAddress = this.addresses.find(a => a.id === address.id);
          if (updatedAddress) this.deliveryAddress = updatedAddress;
        }, 100);
      }
    }
    
    // Limpiar el contexto
    this.editingContext = null;
  }

  deleteAddress(id: number): void {
    if (confirm('¿Estás seguro que deseas eliminar esta dirección?')) {
      this.addressService.deleteAddress(id).subscribe({
        next: () => {
          this.toastr.success('Dirección eliminada correctamente');
          
          // Limpiar las selecciones si corresponde
          if (this.pickupAddress?.id === id) {
            this.pickupAddress = null;
          }
          if (this.deliveryAddress?.id === id) {
            this.deliveryAddress = null;
          }
          
          // Recargar direcciones
          this.loadUserAddresses();
        },
        error: (error) => {
          console.error('Error al eliminar dirección:', error);
          this.toastr.error('No se pudo eliminar la dirección');
        }
      });
    }
  }

  setDefaultAddress(id: number): void {
    this.addressService.setDefaultAddress(id).subscribe({
      next: () => {
        this.toastr.success('Dirección establecida como predeterminada');
        
        // No seleccionamos automáticamente la dirección predeterminada
        // para mantener la independencia de las selecciones
        this.loadUserAddresses();
      },
      error: (error) => {
        console.error('Error al establecer dirección predeterminada:', error);
        this.toastr.error('No se pudo establecer como dirección predeterminada');
      }
    });
  }

  // Método para proceder al pago
  proceedToPayment() {
    if (this.isProcessingPayment) return;
    this.isProcessingPayment = true;
    
    // Validar que hay direcciones seleccionadas
    if (this.needsPickupAddress() && !this.pickupAddress) {
      this.toastr.error('Debes seleccionar una dirección de recogida'); // CAMBIADO: toastService -> toastr
      this.isProcessingPayment = false;
      return;
    }
    
    if (!this.deliveryAddress) {
      this.toastr.error('Debes seleccionar una dirección de entrega'); // CAMBIADO: toastService -> toastr
      this.isProcessingPayment = false;
      return;
    }
    
    // Crear objeto de checkout con las direcciones seleccionadas
    const checkoutData = {
      pickup_address_id: this.pickupAddress?.id || null,
      delivery_address_id: this.deliveryAddress?.id,
      // Puedes añadir más datos aquí si necesitas
    };
    
    console.log('Enviando datos de checkout:', checkoutData);
    
    // Enviar al servicio
    this.barterService.completeBarterCheckout(this.barterId, checkoutData)
      .subscribe({
        next: (response) => {
          console.log('Checkout completado:', response);
          this.isProcessingPayment = false;
          
          // Mostrar mensaje de éxito
          this.toastr.success('Direcciones guardadas correctamente'); // CAMBIADO: toastService -> toastr
          
          // Redirigir según el estado del barter
          if (response.barter.offer_checkout_completed && 
              response.barter.request_checkout_completed) {
            // Si ambos completaron, ir a página de trueque completado
            this.router.navigate(['/barter-complete', this.barterId]);
          } else {
            // Si solo uno completó, ir a página de espera
            this.router.navigate(['/barter-waiting', this.barterId]);
          }
        },
        error: (error) => {
          console.error('Error en checkout:', error);
          this.isProcessingPayment = false;
          this.toastr.error('Error al procesar las direcciones: ' + 
            (error.error?.msg || 'Inténtalo de nuevo')); // CAMBIADO: toastService -> toastr
        }
      });
  }

  /**
   * Método para obtener imágenes de productos para el barter checkout
   * @param product Producto del trueque
   * @returns URL de imagen
   */
  getProductImage(product: any): string {
    if (!product || !product.id_product) {
      return this.fallbackImages[0];
    }
    
    const productId = product.id_product;
    const index = productId % this.fallbackImages.length;
    
    // 1. Verificar si ya tenemos la imagen en caché
    if (this.productImagesCache.has(productId)) {
      return this.productImagesCache.get(productId) || 
             this.fallbackImages[index];
    }
    
    // 2. Si no está en caché, iniciar la carga
    this.loadProductImageAsync(productId, index);
    
    // 3. Mientras se carga, devolver imagen de fallback
    return this.fallbackImages[index];
  }

  /**
   * Método asíncrono para cargar imágenes de productos
   * @param productId ID del producto
   * @param index Índice para fallback
   */
  private loadProductImageAsync(productId: number, index: number): void {
    // Marcar como "en carga" para evitar múltiples solicitudes
    this.productImagesCache.set(productId, '');
    
    this.productService.getProduct(productId).subscribe({
      next: (productDetails: any) => {
        let imageUrl: string = '';
        
        // Buscar imagen en el producto
        if (productDetails && productDetails.images && 
            Array.isArray(productDetails.images) && productDetails.images.length > 0) {
            
          // Buscar imagen principal usando conversión a booleano
          const mainImage = productDetails.images.find((img: any) => !!img.is_main);
          
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
        
        // Verificar imágenes en productImages (estructura alternativa)
        else if (productDetails.productImages && 
                 Array.isArray(productDetails.productImages) && 
                 productDetails.productImages.length > 0) {
          
          const mainImage = productDetails.productImages.find((img: any) => !!img.is_main);
          
          if (mainImage && mainImage.url) {
            imageUrl = mainImage.url;
          } else if (productDetails.productImages[0].url) {
            imageUrl = productDetails.productImages[0].url;
          }
        }
        
        // Guardar en caché
        const finalImageUrl = imageUrl || this.fallbackImages[index];
        this.productImagesCache.set(productId, finalImageUrl);
      },
      error: (error) => {
        console.error(`Error cargando imagen para producto ${productId}:`, error);
        // Mantener el fallback en caché para no seguir intentando
        this.productImagesCache.set(productId, this.fallbackImages[index]);
      }
    });
  }

  /**
   * Método para manejar errores de carga de imágenes
   */
  handleImageError(event: any): void {
    console.warn('Error al cargar imagen, usando fallback');
    event.target.src = 'img/product-1.jpg'; // Usar siempre la primera imagen como fallback
    event.target.onerror = null; // Prevenir bucle infinito
  }

  // Método para obtener el texto apropiado para la dirección de recogida
  getPickupAddressLabel(): string {
    if (!this.barter) return 'Dirección de recogida';
    
    const currentUserId = this.getCurrentUserId();
    
    // Caso: Solo dinero (money_only)
    if (this.barter.exchange_type === 'money_only') {
      // Solo Usuario A (vendedor) tiene sección de recogida
      if (this.barter.id_user_offer === currentUserId) {
        return 'Dirección donde se recogerá tu producto vendido';
      }
    } 
    // Casos: Producto por producto o Producto más dinero
    else {
      // Usuario A (dueño del producto original)
      if (this.barter.id_user_offer === currentUserId) {
        return 'Dirección donde entregarás tu producto para el trueque';
      } 
      // Usuario B (quien propuso el trueque)
      else if (this.barter.id_user_receiving === currentUserId) {
        return 'Dirección donde entregarás tu producto para el trueque';
      }
    }
    
    return 'Dirección de recogida';
  }

  // Método para obtener el texto apropiado para la dirección de entrega
  getDeliveryAddressLabel(): string {
    if (!this.barter) return 'Dirección de entrega';
    
    const currentUserId = this.getCurrentUserId();
    
    // Caso: Solo dinero (money_only)
    if (this.barter.exchange_type === 'money_only') {
      // Solo Usuario B (comprador) tiene sección de entrega
      if (this.barter.id_user_receiving === currentUserId) {
        return 'Dirección donde recibirás el producto comprado';
      }
    }
    // Casos: Producto por producto o Producto más dinero
    else {
      // Usuario A (dueño del producto original)
      if (this.barter.id_user_offer === currentUserId) {
        return 'Dirección donde recibirás el producto del trueque';
      } 
      // Usuario B (quien propuso el trueque)
      else if (this.barter.id_user_receiving === currentUserId) {
        return 'Dirección donde recibirás el producto del trueque';
      }
    }
    
    return 'Dirección de entrega';
  }
}
