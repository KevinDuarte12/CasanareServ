import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BarterService } from '../services/barter.service';
import { DeliveryAddressService } from '../services/delivery-address.service';
import { ProductService } from '../services/productos.services';
import { TransactionService } from '../services/transaction.service';
import { Barter } from '../interfaces/barter';
import { DeliveryAddress } from '../interfaces/deliveryAddress';
import { AddressFormModalComponent } from '../address-form-modal/address-form-modal.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-barter-checkout',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    FooterComponent,
    RouterLink,
    RouterModule,
    AddressFormModalComponent,
    NavbarComponent
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

  pickupAddress: any = null;
  deliveryAddress: any = null;
  addresses: DeliveryAddress[] = [];
  showAddressModal: boolean = false;
  addressToEdit: DeliveryAddress | null = null;
  editingContext: 'pickup' | 'delivery' | null = null;

  readonly LOGISTICS_FEE: number = 10000;
  totalPayment: number = 0;
  selectedAddressId: number | null = null;
  total: number = 0;

  // Nuevas propiedades para direcciones predeterminadas por contexto
  defaultPickupAddressId: number | null = null;
  defaultDeliveryAddressId: number | null = null;

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
  private productImagesCache: Map<number, string> = new Map();

  constructor(
    private barterService: BarterService,
    private addressService: DeliveryAddressService,
    private productService: ProductService,
    private transactionService: TransactionService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const checkoutDataStr = localStorage.getItem('barterCheckout');
    if (checkoutDataStr) {
      this.checkoutData = JSON.parse(checkoutDataStr);
      this.barterId = this.checkoutData.barterId;
    } else {
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

  loadUserAddresses(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    this.addressService.getUserAddresses(userId).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        
        // ✅ AGREGAR ESTA LÍNEA que falta:
        this.loadBarterAddressPreferences();
        
        // COMENTAR/ELIMINAR toda la lógica de auto-selección:
        // NO establezca automáticamente las direcciones predeterminadas en ambas secciones
        // Deje que el usuario seleccione cada una independientemente
        
        // Eliminar esta lógica que establece la misma dirección en ambos lugares:
        // const defaultAddress = addresses.find(a => a.is_default);
        // if (defaultAddress) {
        //   if (this.needsPickupAddress() && !this.pickupAddress) {
        //     this.pickupAddress = defaultAddress;
        //   }
        //   if (this.needsDeliveryAddress() && !this.deliveryAddress) {
        //     this.deliveryAddress = defaultDelivery;
        //   }
        // }
      },
      error: (error) => {
        console.error('Error al cargar direcciones:', error);
        this.toastr.error('No se pudieron cargar las direcciones');
      }
    });
  }

  selectPickupAddress(address: DeliveryAddress): void {
    if (address) {
      this.pickupAddress = address;
      console.log('🏠 Dirección de recogida seleccionada:', address);
    }
  }

  selectDeliveryAddress(address: DeliveryAddress): void {
    if (address) {
      this.deliveryAddress = address;
      console.log('📦 Dirección de entrega seleccionada:', address);
      // Actualiza el ID para el checkout
      this.selectedAddressId = address.id ?? null;
    }
  }

  selectAddress(address: DeliveryAddress): void {
    if (address && address.id) {
      this.selectedAddressId = address.id;
      console.log('📍 Dirección seleccionada para el envío:', address);
    }
  }

  calculateTotalPayment(): void {
    if (!this.barter) {
      this.totalPayment = this.LOGISTICS_FEE;
      this.total = this.LOGISTICS_FEE;
      return;
    }

    // ✅ FORZAR conversión a número para evitar concatenación
    this.totalPayment = this.LOGISTICS_FEE; // 10000

    if (this.isCurrentUserPaying()) {
      // ✅ CONVERTIR explícitamente a número
      const additionalValue = Number(this.barter.value) || 0;
      this.totalPayment += additionalValue;
      
      console.log('💰 Cálculo de total:', {
        logisticsFee: this.LOGISTICS_FEE,
        additionalValue: additionalValue,
        total: this.totalPayment
      });
    }

    this.total = this.totalPayment;
  }

  isCurrentUserPaying(): boolean {
    if (!this.barter || !this.checkoutData) return false;
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    if (this.barter.exchange_type === 'money_only') {
      return this.barter.id_user_receiving === currentUserId;
    } else if (this.barter.exchange_type === 'product_with_money') {
      return this.checkoutData.isReceivingUser && (this.barter.value || 0) > 0;
    }
    return false;
  }

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

  needsPickupAddress(): boolean {
    if (!this.barter) return false;
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    if (this.barter.offered_product?.type === 'regular') return false;
    if (this.barter.exchange_type === 'money_only') {
      return this.barter.id_user_offer === currentUserId;
    }
    return true;
  }

  needsDeliveryAddress(): boolean {
    if (!this.barter) return false;
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return false;
    if (this.barter.exchange_type === 'money_only') {
      if (this.barter.id_user_offer === currentUserId) {
        return false;
      }
    }
    return true;
  }

  openAddressModal(address: DeliveryAddress | null | undefined, context?: 'pickup' | 'delivery'): void {
    this.addressToEdit = address || null;
    this.editingContext = context || null;
    this.showAddressModal = true;
    console.log(`🔍 Abriendo modal para ${this.addressToEdit ? 'editar' : 'crear'} dirección. Contexto: ${this.editingContext || 'ninguno'}`);
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
    this.addressToEdit = null;
    this.editingContext = null;
  }

  applyNewAddress(address: DeliveryAddress): void {
    if (this.editingContext === 'pickup') {
      console.log('🏠 Aplicando nueva dirección como dirección de recogida:', address);
      this.pickupAddress = address;
      this.toastr.success('Dirección de recogida actualizada');
    } else if (this.editingContext === 'delivery') {
      console.log('📦 Aplicando nueva dirección como dirección de entrega:', address);
      this.deliveryAddress = address;
      // IMPORTANTE: Solo actualizar selectedAddressId si es para entrega
      this.selectedAddressId = address.id ?? null;
      this.toastr.success('Dirección de entrega actualizada');
    }
    // NO aplicar la dirección si no hay contexto específico
  }

  onAddressSaved(data: {address: DeliveryAddress, context: 'pickup' | 'delivery' | 'general' | null}): void {
    console.log('📥 Datos recibidos en onAddressSaved:', data);
    console.log('📥 Contexto recibido:', data.context);
    console.log('📥 Dirección recibida:', data.address);
    console.log('🏠 pickupAddress antes:', this.pickupAddress);
    console.log('📦 deliveryAddress antes:', this.deliveryAddress);
    
    // SOLO aplicar en el contexto específico
    if (data.context === 'pickup') {
      this.pickupAddress = data.address;
      console.log('✅ pickupAddress actualizada:', this.pickupAddress);
      
      // Agregar manualmente la nueva dirección al array si no existe
      if (!this.addresses.find(a => a.id === data.address.id)) {
        this.addresses.push(data.address);
        console.log('➕ Dirección agregada al array addresses');
      }
      
      this.toastr.success('Dirección de recogida actualizada');
    } else if (data.context === 'delivery') {
      this.deliveryAddress = data.address;
      this.selectedAddressId = data.address.id ?? null;
      console.log('✅ deliveryAddress actualizada:', this.deliveryAddress);
      
      // Agregar manualmente la nueva dirección al array si no existe
      if (!this.addresses.find(a => a.id === data.address.id)) {
        this.addresses.push(data.address);
        console.log('➕ Dirección agregada al array addresses');
      }
      
      this.toastr.success('Dirección de entrega actualizada');
    }
    
    console.log('🏠 pickupAddress después:', this.pickupAddress);
    console.log('📦 deliveryAddress después:', this.deliveryAddress);
    console.log('📋 Total direcciones en array:', this.addresses.length);
    
    this.editingContext = null;
  }

  deleteAddress(id: number): void {
    if (confirm('¿Estás seguro que deseas eliminar esta dirección?')) {
      this.addressService.deleteAddress(id).subscribe({
        next: () => {
          this.toastr.success('Dirección eliminada correctamente');
          if (this.pickupAddress?.id === id) {
            this.pickupAddress = null;
          }
          if (this.deliveryAddress?.id === id) {
            this.deliveryAddress = null;
          }
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
        this.loadUserAddresses();
      },
      error: (error) => {
        console.error('Error al establecer dirección predeterminada:', error);
        this.toastr.error('No se pudo establecer como dirección predeterminada');
      }
    });
  }

  // MÉTODO ACTUALIZADO PARA PAGO DE TRUEQUE
  proceedToPayment(): void {
    // Obtener datos del usuario
    const currentUserId = this.getCurrentUserId();
    const userDataStr = localStorage.getItem('user');
    
    if (!userDataStr || !currentUserId) {
      this.toastr.error('No se pudieron obtener los datos del usuario');
      return;
    }

    let userData;
    try {
      userData = JSON.parse(userDataStr);
    } catch (e) {
      this.toastr.error('Error al obtener los datos del usuario');
      return;
    }

    // ✅ CORREGIR: Verificar que tenemos el barter y su ID
    if (!this.barter || !this.barter.id_barter) {
      this.toastr.error('No se pudo identificar el trueque');
      return;
    }

    // Preparar los datos con las direcciones específicas según el usuario
    const isOfferingUser = this.barter.id_user_offer === currentUserId;
    
    let addressData: any = {};
    
    if (isOfferingUser) {
      // Usuario A (offering_user)
      addressData = {
        offer_pickup_address_id: this.pickupAddress?.id || null,
        offer_delivery_address_id: this.deliveryAddress?.id || null
      };
    } else {
      // Usuario B (receiving_user)  
      addressData = {
        request_pickup_address_id: this.pickupAddress?.id || null,
        request_delivery_address_id: this.deliveryAddress?.id || null
      };
    }

    // ✅ CORREGIR: Usar id_barter en lugar de barter_id
    const paymentData = {
      id_user: currentUserId,
      id_barter: this.barter.id_barter, // ← CAMBIO PRINCIPAL: usar id_barter
      total: this.total,
      buyerEmail: userData.email,
      buyerName: userData.name,
      buyerPhone: userData.phone,
      description: `Cargo por servicio de trueque #${this.barter.id_barter}`,
      // Agregar las direcciones específicas
      ...addressData
    };

    // ✅ AGREGAR LOGS para debugging
    console.log('📦 Datos de pago completos:', paymentData);
    console.log('🔍 Verificando campos obligatorios:');
    console.log('  - id_user:', paymentData.id_user);
    console.log('  - id_barter:', paymentData.id_barter);
    console.log('  - total:', paymentData.total);

    // Validar datos obligatorios antes de enviar
    if (!paymentData.id_user || !paymentData.id_barter || !paymentData.total) {
      this.toastr.error('Faltan datos obligatorios para el pago');
      console.error('❌ Datos faltantes:', {
        id_user: paymentData.id_user,
        id_barter: paymentData.id_barter,
        total: paymentData.total
      });
      return;
    }

    this.isProcessingPayment = true;

    // Continuar con el pago...
    this.transactionService.createBarterWebCheckoutPayment(paymentData).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del backend:', response);
        if (response && response.url && response.formData) {
          this.redirectToPayU(response.url, response.formData);
        } else {
          this.toastr.error('No se pudo iniciar el pago de trueque.');
          this.isProcessingPayment = false;
        }
      },
      error: (error) => {
        console.error('❌ Error completo del pago:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Mensaje:', error.message);
        console.error('❌ Error del servidor:', error.error);
        
        let errorMessage = 'Error al procesar el pago de trueque.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        
        this.toastr.error(errorMessage);
        this.isProcessingPayment = false;
      }
    });
  }

  // Redirección automática a PayU WebCheckout
  redirectToPayU(url: string, formData: any): void {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.style.display = 'none';

    for (const key in formData) {
      if (formData.hasOwnProperty(key)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
      }
    }

    document.body.appendChild(form);
    form.submit();
  }

  updateBarterStatus(status: string): void {
    this.router.navigate(['/barter-confirmation'], {
      queryParams: { id: this.barter?.id_barter }
    });
  }

  getProductImage(product: any): string {
    if (!product || !product.id_product) {
      return this.fallbackImages[0];
    }
    const productId = product.id_product;
    const index = productId % this.fallbackImages.length;
    if (this.productImagesCache.has(productId)) {
      return this.productImagesCache.get(productId) ||
        this.fallbackImages[index];
    }
    this.loadProductImageAsync(productId, index);
    return this.fallbackImages[index];
  }

  private loadProductImageAsync(productId: number, index: number): void {
    this.productImagesCache.set(productId, '');
    this.productService.getProduct(productId).subscribe({
      next: (productDetails: any) => {
        let imageUrl: string = '';
        if (productDetails && productDetails.images &&
          Array.isArray(productDetails.images) && productDetails.images.length > 0) {
          const mainImage = productDetails.images.find((img: any) => !!img.is_main);
          if (mainImage && mainImage.url) {
            imageUrl = mainImage.url;
          } else if (productDetails.images[0].url) {
            imageUrl = productDetails.images[0].url;
          }
        }
        else if (productDetails.img_url) {
          imageUrl = productDetails.img_url;
        }
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
        const finalImageUrl = imageUrl || this.fallbackImages[index];
        this.productImagesCache.set(productId, finalImageUrl);
      },
      error: (error) => {
        console.error(`Error cargando imagen para producto ${productId}:`, error);
        this.productImagesCache.set(productId, this.fallbackImages[index]);
      }
    });
  }

  handleImageError(event: any): void {
    console.warn('Error al cargar imagen, usando fallback');
    event.target.src = 'img/product-1.jpg';
    event.target.onerror = null;
  }

  getPickupAddressLabel(): string {
    if (!this.barter) return 'Dirección de recogida';
    const currentUserId = this.getCurrentUserId();
    if (this.barter.exchange_type === 'money_only') {
      if (this.barter.id_user_offer === currentUserId) {
        return 'Dirección donde se recogerá tu producto vendido';
      }
    }
    else {
      if (this.barter.id_user_offer === currentUserId) {
        return 'Dirección donde entregarás tu producto para el trueque';
      }
      else if (this.barter.id_user_receiving === currentUserId) {
        return 'Dirección donde entregarás tu producto para el trueque';
      }
    }
    return 'Dirección de recogida';
  }

  getDeliveryAddressLabel(): string {
    if (!this.barter) return 'Dirección de entrega';
    const currentUserId = this.getCurrentUserId();
    if (this.barter.exchange_type === 'money_only') {
      if (this.barter.id_user_receiving === currentUserId) {
        return 'Dirección donde recibirás el producto comprado';
      }
    }
    else {
      if (this.barter.id_user_offer === currentUserId) {
        return 'Dirección donde recibirás el producto del trueque';
      }
      else if (this.barter.id_user_receiving === currentUserId) {
        return 'Dirección donde recibirás el producto del trueque';
      }
    }
    return 'Dirección de entrega';
  }

  loadBarterAddressPreferences(): void {
    // Cargar desde localStorage las preferencias del usuario para trueques
    const userId = this.getCurrentUserId();
    const preferencesKey = `barter_address_preferences_${userId}`;
    const preferences = localStorage.getItem(preferencesKey);
    
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences);
        this.defaultPickupAddressId = parsed.defaultPickupAddressId || null;
        this.defaultDeliveryAddressId = parsed.defaultDeliveryAddressId || null;
        
        console.log('📋 Preferencias cargadas:', {
          pickup: this.defaultPickupAddressId,
          delivery: this.defaultDeliveryAddressId
        });
        
        // Aplicar direcciones predeterminadas si existen y son necesarias
        if (this.defaultPickupAddressId && this.needsPickupAddress() && !this.pickupAddress) {
          const defaultPickup = this.addresses.find(a => a.id === this.defaultPickupAddressId);
          if (defaultPickup) {
            this.pickupAddress = defaultPickup;
            console.log('🏠 Dirección de recogida predeterminada aplicada:', defaultPickup);
          }
        }
        
        if (this.defaultDeliveryAddressId && this.needsDeliveryAddress() && !this.deliveryAddress) {
          const defaultDelivery = this.addresses.find(a => a.id === this.defaultDeliveryAddressId);
          if (defaultDelivery) {
            this.deliveryAddress = defaultDelivery;
            this.selectedAddressId = defaultDelivery.id ?? null;
            console.log('📦 Dirección de entrega predeterminada aplicada:', defaultDelivery);
          }
        }
      } catch (e) {
        console.error('Error parsing barter address preferences:', e);
      }
    }
  }

  setDefaultBarterAddress(addressId: number, context: 'pickup' | 'delivery'): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    const preferencesKey = `barter_address_preferences_${userId}`;
    let preferences: any = {};
    
    try {
      const existing = localStorage.getItem(preferencesKey);
      if (existing) {
        preferences = JSON.parse(existing);
      }
    } catch (e) {
      preferences = {};
    }
    
    if (context === 'pickup') {
      preferences.defaultPickupAddressId = addressId;
      this.defaultPickupAddressId = addressId;
      this.toastr.success('Dirección establecida como predeterminada para recogida en trueques');
      console.log('🏠 Nueva dirección predeterminada para recogida:', addressId);
    } else if (context === 'delivery') {
      preferences.defaultDeliveryAddressId = addressId;
      this.defaultDeliveryAddressId = addressId;
      this.toastr.success('Dirección establecida como predeterminada para entrega en trueques');
      console.log('📦 Nueva dirección predeterminada para entrega:', addressId);
    }
    
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }

  // Verificar si una dirección es predeterminada para un contexto específico
  isDefaultForContext(addressId: number, context: 'pickup' | 'delivery'): boolean {
    if (context === 'pickup') {
      return this.defaultPickupAddressId === addressId;
    } else if (context === 'delivery') {
      return this.defaultDeliveryAddressId === addressId;
    }
    return false;
  }

  // Remover dirección predeterminada para un contexto
  removeDefaultBarterAddress(context: 'pickup' | 'delivery'): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    const preferencesKey = `barter_address_preferences_${userId}`;
    let preferences: any = {};
    
    try {
      const existing = localStorage.getItem(preferencesKey);
      if (existing) {
        preferences = JSON.parse(existing);
      }
    } catch (e) {
      preferences = {};
    }
    
    if (context === 'pickup') {
      preferences.defaultPickupAddressId = null;
      this.defaultPickupAddressId = null;
      this.toastr.info('Dirección predeterminada de recogida removida');
    } else if (context === 'delivery') {
      preferences.defaultDeliveryAddressId = null;
      this.defaultDeliveryAddressId = null;
      this.toastr.info('Dirección predeterminada de entrega removida');
    }
    
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  }

  getPickupAddressOptions(): DeliveryAddress[] {
    // Mostrar TODAS las direcciones disponibles
    return this.addresses;
  }

  getDeliveryAddressOptions(): DeliveryAddress[] {
    // Mostrar TODAS las direcciones disponibles
    return this.addresses;
  }

  loadUserAddressesWithoutAutoSelection(): void {
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    // Guardar las selecciones actuales
    const currentPickup = this.pickupAddress;
    const currentDelivery = this.deliveryAddress;
    
    this.addressService.getUserAddresses(userId).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        
        // MANTENER las selecciones actuales, NO sobrescribir
        if (currentPickup) {
          this.pickupAddress = currentPickup;
        }
        if (currentDelivery) {
          this.deliveryAddress = currentDelivery;
        }
        
        console.log('📋 Direcciones recargadas sin auto-selección');
      },
      error: (error) => {
        console.error('Error al cargar direcciones:', error);
        this.toastr.error('No se pudieron cargar las direcciones');
      }
    });
  }
}