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
  pickupAddress: DeliveryAddress | null = null;
  deliveryAddress: DeliveryAddress | null = null;
  addresses: DeliveryAddress[] = [];
  showAddressModal: boolean = false;
  addressToEdit: DeliveryAddress | null = null;
  
  // Nuevo: variable para rastrear el contexto actual de edición
  editingContext: 'pickup' | 'delivery' | null = null;
  
  // Valor logístico fijo
  readonly LOGISTICS_FEE: number = 10000;
  
  // Total a pagar
  totalPayment: number = 0;

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
    this.addressService.getUserAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        
        // Buscar dirección predeterminada
        const defaultAddress = addresses.find(addr => addr.is_default);
        
        // Establecer dirección de recogida solo si aún no se ha seleccionado una
        if (!this.pickupAddress && addresses.length > 0) {
          this.pickupAddress = defaultAddress || addresses[0];
        }
        
        // Establecer dirección de entrega solo si aún no se ha seleccionado una
        // Esta lógica es independiente de la dirección de recogida
        if (!this.deliveryAddress && addresses.length > 0) {
          this.deliveryAddress = defaultAddress || addresses[0];
        }
      },
      error: (error) => {
        console.error('Error al cargar direcciones:', error);
        this.toastr.error('No se pudieron cargar las direcciones');
      }
    });
  }

  selectPickupAddress(address: DeliveryAddress): void {
    this.pickupAddress = address;
  }

  selectDeliveryAddress(address: DeliveryAddress): void {
    this.deliveryAddress = address;
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

  getCurrentUserId(): number | null {
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
    
    // En ofertas de solo dinero, solo el usuario A (oferente) necesita dirección de recogida
    if (this.barter.exchange_type === 'money_only') {
      return this.checkoutData?.isOfferingUser || false;
    }
    
    // En otros tipos de trueque, ambos usuarios necesitan dirección de recogida
    return true;
  }

  needsDeliveryAddress(): boolean {
    // Todos los usuarios necesitan dirección de entrega, independiente del tipo de trueque
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

  proceedToPayment(): void {
    // Validar que se hayan seleccionado las direcciones necesarias
    if (this.needsPickupAddress() && !this.pickupAddress) {
      this.toastr.warning('Por favor selecciona una dirección de recogida');
      return;
    }
    
    if (this.needsDeliveryAddress() && !this.deliveryAddress) {
      this.toastr.warning('Por favor selecciona una dirección de entrega');
      return;
    }
    
    this.isProcessingPayment = true;
    
    // Guardar las direcciones seleccionadas para el trueque
    const barterAddressData = {
      pickup_address_id: this.pickupAddress?.id,
      delivery_address_id: this.deliveryAddress?.id
    };
    
    console.log('🚚 Procesando pago con direcciones:', barterAddressData);
    
    // Aquí iría la integración con la API para guardar las direcciones
    // y continuar con el proceso de pago
    
    // Simulación de procesamiento de pago
    setTimeout(() => {
      // Aquí actualizarías el estado del trueque a "completado" en el backend
      this.barterService.updateBarterStatus(this.barterId!, 'completado').subscribe({
        next: () => {
          this.toastr.success('¡Pago procesado correctamente!');
          this.router.navigate(['/barter-confirmation', this.barterId]);
        },
        error: (error) => {
          console.error('Error al completar el trueque:', error);
          this.toastr.error('Error al procesar el pago');
          this.isProcessingPayment = false;
        }
      });
    }, 2000);
  }
}
