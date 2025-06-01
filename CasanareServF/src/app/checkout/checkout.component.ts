import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { DeliveryAddressService } from '../services/delivery-address.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { AddressFormModalComponent } from '../address-form-modal/address-form-modal.component';
import { DeliveryAddress } from '../interfaces/deliveryAddress';
import { ProductService } from '../services/productos.services';
import { Product } from '../interfaces/product';
import { Image } from '../interfaces/image';
import { TransactionService } from '../services/transaction.service';
import { Transaction } from '../interfaces/transaction';
import { UserService } from '../services/user.services';
import { Injector } from '@angular/core';
// Primero, definir una interfaz para CartItem
interface CartItem {
  id?: number;
  quantity: number;
  product?: Product; // Marcar como opcional con '?'
  price?: number;
  unit_price?: number;
  image?: string;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent,
    FooterComponent,
    AddressFormModalComponent
  ],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  addresses: DeliveryAddress[] = [];
  // Usar la nueva interfaz CartItem
  cartItems: CartItem[] = [];
  subtotal: number = 0;
  shipping: number = 10000; // Valor fijo de envío, igual que en cart
  tax: number = 0; // Para el IVA
  total: number = 0;
  selectedAddressId: number | null = null;
  loading = true;
  showAddressModal = false;
  addressToEdit: DeliveryAddress | null = null;
  isProcessingPayment = false;
  userPhone: string = ''; // Añadir esta propiedad

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
    private addressService: DeliveryAddressService,
    private cartService: CartService,
    private productService: ProductService, // Añadir este servicio
    private authService: AuthService,
    private transactionService: TransactionService, // Añade este servicio
    private toastr: ToastrService,
    private router: Router,
    private injector: Injector // Inyectar el Injector
  ) { }

  ngOnInit(): void {
    // Primero verificar autenticación
    this.checkAuthentication();

    // Si el código llega aquí, es porque el usuario está autenticado
    if (this.authService.isAuthenticated()) {
      this.loadCartItems();
      this.loadUserAddresses();
      this.loadUserProfile(); // Añadir este método
    }
  }

  private checkAuthentication(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.warning('Debes iniciar sesión para continuar con la compra');
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: '/checkout' }
      });
      // Agregar return para detener la ejecución si no está autenticado
      return;
    }
  }

  // Modificar el método loadCartItems

  loadCartItems(): void {
    this.cartService.getCart().subscribe({
      next: (response) => {
        this.cartItems = response.items || [];

        // Depurar la estructura del primer item para entender dónde están las imágenes
        if (this.cartItems.length > 0) {
          console.log('Primer item del carrito:');
          this.debugProductStructure(this.cartItems[0]);
          
          // Iniciar carga de imágenes inmediatamente
          this.cartItems.forEach(item => {
            if (item.product && item.product.id_product) {
              // Iniciar precarga de imágenes
              const index = item.product.id_product % this.fallbackImages.length;
              this.loadProductImageAsync(item.product.id_product, index);
            }
          });
        }

        this.calculateTotals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar el carrito:', error);
        this.toastr.error('No se pudo cargar los productos del carrito');
        this.loading = false;
      }
    });
  }

  loadUserAddresses(): void {
    this.addressService.getUserAddresses().subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        const defaultAddress = this.addresses.find(addr => addr.is_default);
        // Agregamos comprobación para evitar asignar undefined a selectedAddressId
        if (defaultAddress && defaultAddress.id !== undefined) {
          this.selectedAddressId = defaultAddress.id;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar direcciones:', error);
        this.toastr.error('No se pudieron cargar las direcciones');
        this.loading = false;
      }
    });
  }

  // Añadir este nuevo método
  loadUserProfile(): void {
    const userData = this.authService.getUserData();
    
    if (userData) {
      // Si ya tenemos el teléfono en el localStorage
      this.userPhone = userData.phone || '';
      
      // Opcionalmente, actualizar la información del perfil desde el servidor
      if (!this.userPhone) {
        const userService = this.injector.get(UserService); // o añadir UserService al constructor
        userService.getUserProfile().subscribe({
          next: (profile) => {
            this.userPhone = profile.phone || '';
          },
          error: (error) => {
            console.error('Error al cargar el perfil de usuario:', error);
          }
        });
      }
    }
  }

  // Método calculador de totales modificado para incluir IVA y envío
  calculateTotals(): void {
    // Calcular subtotal como suma de precio*cantidad de cada item
    this.subtotal = this.cartItems.reduce((sum, item) => {
      // Usar unit_price si está disponible, o buscarlo en el producto anidado
      const price = item.unit_price || item.price || (item.product ? item.product.price : 0);
      return sum + (price * item.quantity);
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

  openAddressModal(address?: DeliveryAddress): void {
    this.addressToEdit = address || null;
    this.showAddressModal = true;
  }

  closeAddressModal(): void {
    this.showAddressModal = false;
    this.addressToEdit = null;
  }

  onAddressSaved(data: {address: DeliveryAddress, context: 'pickup' | 'delivery' | 'general' | null}): void {
    this.loadUserAddresses();
    
    // Para checkout normal, siempre es dirección de entrega
    if (data.address.is_default && data.address.id !== undefined) {
      this.selectedAddressId = data.address.id;
    }
    
    this.toastr.success('Dirección guardada correctamente');
  }

  deleteAddress(id: number): void {
    if (confirm('¿Estás seguro que deseas eliminar esta dirección?')) {
      this.addressService.deleteAddress(id).subscribe({
        next: () => {
          this.toastr.success('Dirección eliminada correctamente');
          this.loadUserAddresses();
          if (this.selectedAddressId === id) {
            this.selectedAddressId = null;
          }
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
        this.selectedAddressId = id;
      },
      error: (error) => {
        console.error('Error al establecer dirección predeterminada:', error);
        this.toastr.error('No se pudo establecer como dirección predeterminada');
      }
    });
  }

  selectAddress(id: number): void {
    this.selectedAddressId = id;
  }

  /**
   * Procesa el pago del carrito utilizando PayU
   */
  proceedToPayment(): void {
    // Verificar si hay datos de usuario
    const userData = this.authService.getUserData();
    if (!userData || !userData.id) {
      // Intentar recuperar datos del token antes de fallar
      const token = localStorage.getItem('token');
      if (token) {
        try {
          this.authService.refreshUserProfile().subscribe({
            next: () => {
              // Verificar nuevamente después de refrescar
              const refreshedData = this.authService.getUserData();
              if (refreshedData && refreshedData.id) {
                // Continuar con el pago después de recuperar datos
                this.continueWithPayment(refreshedData);
              } else {
                this.handleMissingUserData();
              }
            },
            error: () => this.handleMissingUserData()
          });
        } catch (error) {
          this.handleMissingUserData();
        }
        return;
      } else {
        this.handleMissingUserData();
        return;
      }
    }

    // Si tenemos datos de usuario, continuar con el proceso normal
    this.continueWithPayment(userData);
  }

  private handleMissingUserData(): void {
    this.toastr.error('Error de autenticación. Por favor inicia sesión nuevamente');
    this.authService.saveRedirectUrl('/checkout');
    this.router.navigate(['/login']);
  }

  private continueWithPayment(userData: any): void {
    if (!this.selectedAddressId) {
      this.toastr.warning('Por favor selecciona una dirección de entrega');
      return;
    }

    if (this.cartItems.length === 0) {
      this.toastr.warning('Tu carrito está vacío');
      return;
    }


    if (!userData || !userData.id) {
      this.toastr.error('Error de autenticación. Por favor inicia sesión nuevamente');
      this.router.navigate(['/login']);
      return;
    }

    this.isProcessingPayment = true;

    // Obtener ID del carrito
    this.cartService.getCartId().subscribe({
      next: (cartId) => {
        if (!cartId) {
          this.toastr.error('No se pudo obtener el ID del carrito');
          this.isProcessingPayment = false;
          return;
        }

        // Datos completos para el pago
        const paymentData = {
          id_user: userData.id,
          id_cart: cartId,
          delivery_address_id: this.selectedAddressId,
          buyerEmail: userData.email,
          buyerName: userData.name,
          buyerPhone: this.userPhone || '',
          total: this.total,
          description: `Compra en CasanareServ - ${this.cartItems.length} productos`
        };

        // Llamada al endpoint de WebCheckout
        this.transactionService.createWebCheckoutPayment(paymentData).subscribe({
          next: (response) => {
            this.isProcessingPayment = false;
            
            if (response && response.url && response.formData) {
              // Guardar referencia para verificación posterior
              localStorage.setItem('lastPaymentRef', response.reference);
              
              // Método 1: Redirigir usando window.location
              // window.location.href = response.url;
              
              // Método 2: Crear un formulario y enviarlo programáticamente
              this.submitPayuForm(response.url, response.formData);
            } else {
              this.toastr.error('Error al generar el pago');
            }
          },
          error: (error) => {
            this.isProcessingPayment = false;
            console.error('Error en la solicitud de pago:', error);
            this.toastr.error('Error de conexión. Por favor intenta nuevamente.');
          }
        });
      },
      error: (error) => {
        this.isProcessingPayment = false;
        console.error('Error al obtener ID del carrito:', error);
        this.toastr.error('Error de conexión. Por favor intenta nuevamente.');
      }
    });
  }

  // Método para enviar el formulario a PayU
  private submitPayuForm(url: string, formData: any): void {
    // Crear elemento form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.style.display = 'none';

    // Agregar campos al formulario
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== undefined) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = formData[key];
        form.appendChild(input);
      }
    });

    // Agregar formulario al DOM y enviarlo
    document.body.appendChild(form);
    form.submit();
  }

  // Método mejorado para obtener la URL de imagen de un producto
  /**
   * Obtiene la URL de la imagen de un producto en el carrito
   * @param item Elemento del carrito
   * @returns URL de la imagen o imagen fallback
   */
  getProductImageUrl(item: CartItem): string {
    if (!item || !item.product) {
      return this.fallbackImages[0];
    }

    const productId = item.product.id_product;

    if (!productId) {
      return this.fallbackImages[0];
    }

    // 1. Verificar si ya tenemos la imagen en caché
    if (this.productImagesCache.has(productId)) {
      return this.productImagesCache.get(productId) || this.fallbackImages[0];
    }

    // 2. Buscar en diferentes ubicaciones posibles de la estructura de datos
    let imageUrl = '';

    // Buscar en productImages (estructura común en algunos backends)
    if (item.product.productImages &&
      Array.isArray(item.product.productImages) &&
      item.product.productImages.length > 0) {

      // Intentar encontrar imagen principal
      const mainImage = item.product.productImages.find((img: Image) => img.is_main);

      if (mainImage && mainImage.url) {
        imageUrl = mainImage.url;
      } else if (item.product.productImages[0].url) {
        imageUrl = item.product.productImages[0].url;
      }
    }

    // Buscar en la estructura images (como se usa en cart.component.ts)
    if (!imageUrl && item.product.images &&
      Array.isArray(item.product.images) &&
      item.product.images.length > 0) {

      // Buscar imagen principal
      const mainImage = item.product.images.find((img: Image) => img.is_main);

      if (mainImage && mainImage.url) {
        imageUrl = mainImage.url;
      } else if (item.product.images[0].url) {
        imageUrl = item.product.images[0].url;
      }
    }

    // Verificar si hay imagen directa en el producto
    if (!imageUrl && item.product.img_url) {
      imageUrl = item.product.img_url;
    }

    // Verificar si hay imagen directa en el item
    if (!imageUrl && item.image) {
      imageUrl = item.image;
    }

    // Si encontramos una imagen, almacenarla en caché
    if (imageUrl) {
      this.productImagesCache.set(productId, imageUrl);
      return imageUrl;
    }

    // Si no encontramos imagen, usar fallback y guardar en caché para no seguir buscando
    const fallbackIndex = productId ? (productId % this.fallbackImages.length) || 0 : 0;
    const fallbackImage = this.fallbackImages[fallbackIndex];
    if (productId) {
      this.productImagesCache.set(productId, fallbackImage);
    }

    return fallbackImage;
  }

  // Método para manejar errores de carga de imágenes
  handleImageError(event: any): void {
    console.warn('Error al cargar imagen, usando fallback');
    const randomIndex = Math.floor(Math.random() * this.fallbackImages.length);
    event.target.src = this.fallbackImages[randomIndex];
  }

  // Reemplazar el método debugProductStructure con esta versión tipada

  /**
   * Método para depurar la estructura de datos del producto
   * @param item Elemento del carrito a inspeccionar
   */
  private debugProductStructure(item: CartItem): void {
    console.group('Estructura de datos del producto:');
    console.log('Item completo:', item);

    if (item.product) {
      console.log('Propiedades del producto:');
      console.log('- id_product:', item.product.id_product);
      console.log('- name:', item.product.name);
      console.log('- productImages:', item.product.productImages);
      console.log('- images:', item.product.images);
      console.log('- img_url:', item.product.img_url);
    }

    console.log('- item.image:', item.image);
    console.groupEnd();
  }

  // Reemplazar el método loadProductImages con esta versión tipada

  /**
   * Carga las imágenes de los productos en el carrito de forma asíncrona
   */
  loadProductImages(): void {
    if (!this.cartItems || this.cartItems.length === 0) return;

    this.cartItems.forEach(item => {
      if (item.product && item.product.id_product) {
        const productId = item.product.id_product;

        // Solo cargar si no está en caché
        if (!this.productImagesCache.has(productId)) {
          this.productService.getProduct(productId).subscribe({
            next: (productDetail: Product) => {
              let imageUrl = '';

              // Buscar imagen
              if (productDetail.images &&
                Array.isArray(productDetail.images) &&
                productDetail.images.length > 0) {

                // Buscar imagen principal
                const mainImage = productDetail.images.find((img: Image) => !!img.is_main);

                if (mainImage && mainImage.url) {
                  imageUrl = mainImage.url;
                } else if (productDetail.images[0].url) {
                  imageUrl = productDetail.images[0].url;
                }
              }
              // Verificar otros campos de imágenes
              else if (productDetail.img_url) {
                imageUrl = productDetail.img_url;
              }

              // Guardar en caché
              if (imageUrl) {
                this.productImagesCache.set(productId, imageUrl);
                // Forzar actualización de la vista
                this.cartItems = [...this.cartItems];
              }
            },
            error: (error) => {
              console.error(`Error cargando imagen para producto ${productId}:`, error);
            }
          });
        }
      }
    });
  }

  // Añadir este método para calcular el precio total de un ítem de manera segura

  /**
   * Calcula el precio total de un ítem del carrito de forma segura
   * @param item Ítem del carrito
   * @returns El precio total del ítem
   */
  calculateItemTotal(item: any): number {
    // Determinar el precio unitario a usar
    const unitPrice = item.unit_price || item.price || (item.product ? item.product.price : 0);
    return unitPrice * item.quantity;
  }

  // Agregar este nuevo método basado en el cart.component.ts

  /**
   * Método para obtener imágenes de productos para el checkout
   * @param item Item del carrito
   * @returns URL de imagen
   */
  getProductImage(item: CartItem): string {
    if (!item || !item.product || !item.product.id_product) {
      return this.fallbackImages[0];
    }
    
    const productId = item.product.id_product;
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
      next: (productDetails: Product) => {
        let imageUrl: string = '';
        
        // Buscar imagen en el producto
        if (productDetails && productDetails.images && 
            Array.isArray(productDetails.images) && productDetails.images.length > 0) {
            
          // Buscar imagen principal usando conversión a booleano
          const mainImage = productDetails.images.find(img => !!img.is_main);
          
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
        
        // Guardar en caché
        const finalImageUrl = imageUrl || this.fallbackImages[index];
        this.productImagesCache.set(productId, finalImageUrl);
        
        // Forzar detección de cambios
        this.cartItems = [...this.cartItems];
      },
      error: (error) => {
        console.error(`Error cargando imagen para producto ${productId}:`, error);
        // Mantener el fallback en caché para no seguir intentando
        this.productImagesCache.set(productId, this.fallbackImages[index]);
      }
    });
  }
}
