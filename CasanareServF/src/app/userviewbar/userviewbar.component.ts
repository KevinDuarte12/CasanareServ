import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { UserService } from '../services/user.services';
import { ImageService } from '../services/image.service';
import { ToastrService } from 'ngx-toastr';
import { Image } from '../interfaces/image';
import { BarterRequest } from '../interfaces/barter';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/productos.services';
import { BarterService } from '../services/barter.service';
import { EditProductComponent } from '../edit-product/edit-product.component';
import { EditBarterComponent } from '../edit-barter/edit-barter.component';

@Component({
  selector: 'app-userviewbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EditProductComponent,
    EditBarterComponent
  ],
  templateUrl: './userviewbar.component.html',
  styleUrl: './userviewbar.component.css'
})
export class UserviewbarComponent implements OnInit {
  // Propiedades para almacenar la información del usuario
  userName: string = '';
  userEmail: string = '';
  userProfileImage: string | null = null;
  defaultProfileImage: string = 'img/perfil3.png';
  userInitials: string = '';
  isLoggedIn: boolean = false;
  userId: number = 0;
  isLoading: boolean = true;

  // Propiedades para el trueque
  showBarterModal: boolean = false;
  userProducts: any[] = []; // Productos del usuario
  availableProducts: any[] = []; // Productos disponibles para trueque
  filteredAvailableProducts: any[] = []; // Productos filtrados
  selectedOwnProduct: number | null = null;
  selectedTargetProduct: number | null = null;
  barterComment: string = '';
  barterAddedValue: number = 0;

  // Propiedades para el modal de edición de producto
  showProductModal: boolean = false;
  editProductId: number | undefined = undefined;

  // Propiedad para almacenar los productos en venta
  productsForSale: any[] = [];

  // Imágenes de respaldo si no hay URL disponible
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

  // Pestaña activa
  activeTab: string = 'en-venta';

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private userService: UserService,
    private imageService: ImageService,
    private productService: ProductService,
    private barterService: BarterService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Verificar si el usuario está autenticado
    this.isLoggedIn = this.authService.isAuthenticated();

    if (this.isLoggedIn) {
      // Cargar los datos del usuario desde el token o localStorage
      this.loadUserData();

      // Inicializar la pestaña activa
      this.activeTab = 'en-venta';

      // Actualizar los contadores de notificaciones
      setTimeout(() => {
        this.updateNotificationCounters();
      }, 100);
    } else {
      this.isLoading = false;
    }
  }

  // Método para cargar datos del usuario
  loadUserData(): void {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userId = user.id || 0;
        this.userName = user.name || 'Usuario';
        this.userEmail = user.email || '';

        // Generar iniciales para el avatar si no hay imagen
        this.userInitials = this.generateUserInitials(user.name || '');

        // Verificar si hay una imagen de perfil
        if (user.profileImage && user.profileImage.trim() !== '') {
          this.userProfileImage = user.profileImage;
        } else {
          // No hay imagen en el usuario, usar la predeterminada
          this.userProfileImage = this.defaultProfileImage;
        }

        // Cargar los productos del usuario
        this.loadUserProductsForSale();

      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        this.toastr.error('Error al cargar datos del usuario');
        // En caso de error, establecer la imagen predeterminada
        this.userProfileImage = this.defaultProfileImage;
      } finally {
        this.isLoading = false;
      }
    } else {
      this.isLoading = false;
      this.toastr.warning('No se encontraron datos del usuario');
      // Si no hay datos de usuario, usar imagen predeterminada
      this.userProfileImage = this.defaultProfileImage;
    }
  }

  // Método para inicializar la funcionalidad de las pestañas
  initTabFunctionality(): void {
    // Eliminar este método y reemplazarlo con una implementación más robusta
    // No agregaremos event listeners directamente
  }

  /**
   * Genera las iniciales del usuario para el avatar
   */
  generateUserInitials(name: string): string {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0].substring(0, 2).toUpperCase();
      }
    }
    return 'US'; // Usuario sin nombre
  }

  /**
   * Cierra la sesión del usuario
   */
  logout(): void {
    this.toastr.info(`¡Hasta pronto, ${this.userName}!`, 'Sesión cerrada');
    this.authService.logout();
    this.router.navigate(['/']);
  }

  /**
   * Redirige al usuario a la página de login
   */
  redirectToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Actualiza los contadores de notificaciones
   */
  private updateNotificationCounters(): void {
    const unreadNotifications = document.querySelectorAll('.notification-item.unread').length;
    const notificationsCounter = document.querySelector('.tab[data-tab="notificaciones"] .tab-counter');
    if (notificationsCounter) {
      notificationsCounter.textContent = unreadNotifications.toString();
      (notificationsCounter as HTMLElement).style.display = unreadNotifications > 0 ? 'inline-block' : 'none';
    }

    // Actualizar otros contadores
    const recibidosCounter = document.querySelector('.tab[data-tab="recibidos"] .tab-counter');
    if (recibidosCounter) {
      const recibidosCount = document.querySelectorAll('#recibidos .product-card').length;
      recibidosCounter.textContent = recibidosCount.toString();
      (recibidosCounter as HTMLElement).style.display = recibidosCount > 0 ? 'inline-block' : 'none';
    }

    const truequeRecibidosCounter = document.querySelector('.tab[data-tab="trueques-recibidos"] .tab-counter');
    if (truequeRecibidosCounter) {
      const truequeRecibidosCount = document.querySelectorAll('#trueques-recibidos .product-card').length;
      truequeRecibidosCounter.textContent = truequeRecibidosCount.toString();
      (truequeRecibidosCounter as HTMLElement).style.display = truequeRecibidosCount > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Maneja errores de carga de imagen
   */
  handleImageError(event: Event, index: number): void {
    // Usar una imagen de respaldo basada en el índice
    const img = event.target as HTMLImageElement;
    const productId = this.productsForSale[index]?.id_product || index;
    img.src = this.getRandomFallbackImage(productId);
  }

  /**
   * Maneja errores cuando la imagen de perfil no se puede cargar
   */
  handleProfileImageError(event: any): void {
    console.warn('Error al cargar la imagen de perfil, usando imagen predeterminada');
    event.target.src = this.defaultProfileImage;

    // Añadir un segundo manejador de error para el caso en que la imagen predeterminada también falle
    event.target.onerror = () => {
      console.error('No se pudo cargar la imagen predeterminada');
      event.target.style.display = 'none';

      // Buscar el elemento contenedor (avatar) y mostrar las iniciales
      const avatarElement = event.target.closest('.avatar');
      if (avatarElement) {
        avatarElement.textContent = this.userInitials || 'U';
      }
    };
  }

  // 1. Añadir el método closeBarterModal que falta
  closeBarterModal(): void {
    this.showBarterModal = false;
    this.selectedOwnProduct = null;
    this.selectedTargetProduct = null;
    this.barterComment = '';
    this.barterAddedValue = 0;
  }

  // 2. Corregir la línea donde 'any' es usado como valor
  // Asegurarse de que el barterService tenga el método getUserBarters
  // Si tu BarterService aún no tiene este método, agrégalo:

  // Añadir método proposeBarterModal que falta
  proposeBarterModal(): void {
    this.showBarterModal = true;
  }

  // Método para cargar productos del usuario
  loadUserProducts(): void {
    if (!this.userId) {
      this.toastr.warning('No se pudo identificar al usuario');
      return;
    }

    // Asumiendo que tienes un servicio product que obtiene productos de un usuario
    this.productService.getProductsByUser(this.userId).subscribe({
      next: (products) => {
        // Filtrar solo productos disponibles (no en trueque, no vendidos)
        this.userProducts = products.filter(p => p.status === 'disponible');
        this.filteredAvailableProducts = []; // Inicializar array

        if (this.userProducts.length === 0) {
          this.toastr.warning('No tienes productos disponibles para ofrecer en trueque', 'Atención');
        }
      },
      error: (err) => {
        console.error('Error al cargar productos del usuario:', err);
        this.toastr.error('No se pudieron cargar tus productos');
        this.userProducts = [];
      }
    });
  }

  // Método para cargar productos disponibles para trueque
  loadAvailableProducts(): void {
    if (!this.userId) {
      this.toastr.warning('No se pudo identificar al usuario');
      return;
    }

    // Obtener productos disponibles de otros usuarios
    this.productService.getAvailableProducts().subscribe({
      next: (products) => {
        // Filtrar productos que no sean del usuario actual
        this.availableProducts = products.filter(
          p => p.id_user !== this.userId && p.status === 'disponible'
        );
        this.filteredAvailableProducts = [...this.availableProducts];
      },
      error: (err) => {
        console.error('Error al cargar productos disponibles:', err);
        this.toastr.error('No se pudieron cargar los productos disponibles');
        this.availableProducts = [];
        this.filteredAvailableProducts = [];
      }
    });
  }

  // Método para filtrar productos disponibles
  filterAvailableProducts(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '') {
      this.filteredAvailableProducts = [...this.availableProducts];
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    this.filteredAvailableProducts = this.availableProducts.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)
    );
  }

  // Corregir método createBarter para manejar correctamente userId
  createBarter(): void {
    if (!this.selectedOwnProduct || !this.selectedTargetProduct) {
      this.toastr.warning('Debes seleccionar los productos para el trueque');
      return;
    }

    // Verificar que el usuario esté identificado
    if (!this.userId) {
      this.toastr.error('No se ha podido identificar al usuario. Por favor, inicia sesión nuevamente');
      return;
    }

    // Obtener información del producto objetivo
    const targetProduct = this.availableProducts.find(p => p.id_product === this.selectedTargetProduct);

    if (!targetProduct) {
      this.toastr.error('Producto solicitado no encontrado');
      return;
    }

    // Construir objeto para la API
    const barterRequest = {
      useExistingProduct: true,
      id_prod_offer: this.selectedOwnProduct,
      id_prod_request: this.selectedTargetProduct,
      id_user_offer: this.userId as number, // Forzar como number ya que validamos que no es null
      id_user_receiving: targetProduct.id_user,
      notes: this.barterComment,
      value: this.barterAddedValue > 0 ? this.barterAddedValue : undefined,
      // Este campo es usado solo si useExistingProduct es false
      productOffer: {
        name: '',
        description: '',
        value: 0
      }
    };

    // Llamar al servicio de trueques
    this.barterService.createBarter(barterRequest).subscribe({
      next: (response) => {
        this.toastr.success('Propuesta de trueque enviada con éxito');
        this.closeBarterModal();

        // Recargar las pestañas relacionadas con trueques
        this.loadUserBartersPending();
      },
      error: (err) => {
        console.error('Error al crear trueque:', err);
        this.toastr.error(err.error?.msg || 'Error al crear la propuesta de trueque');
      }
    });
  }

  // Método para cargar trueques pendientes del usuario
  loadUserBartersPending(): void {
    if (!this.userId) {
      console.warn('No se pueden cargar trueques - userId es null');
      return;
    }

    this.barterService.getUserBarters(this.userId).subscribe({
      next: (barters) => {
        // Filtrar por estado pendiente
        const pendingBarters = barters.filter(b => b.status === 'pendiente');

        // Actualizar la interfaz
        this.updateBartersList('trueques-pendientes', pendingBarters);

        // Actualizar contador
        this.updateTabCounter('trueques-pendientes', pendingBarters.length);
      },
      error: (err) => {
        console.error('Error al cargar trueques pendientes:', err);
      }
    });
  }

  // Método para actualizar la lista de trueques en el DOM
  private updateBartersList(tabId: string, barters: any[]): void {
    const tabContent = document.getElementById(tabId);
    if (!tabContent) return;

    const productGrid = tabContent.querySelector('.product-grid');
    if (!productGrid) return;

    // Limpiar contenido actual
    productGrid.innerHTML = '';

    if (barters.length === 0) {
      productGrid.innerHTML = `
        <div class="empty-state">
          <p>No hay trueques en esta categoría</p>
        </div>
      `;
      return;
    }

    // Crear tarjetas para cada trueque
    barters.forEach(barter => {
      const card = document.createElement('div');
      card.className = 'product-card';

      card.innerHTML = `
        <div class="product-img placeholder-trueque"></div>
        <div class="product-info">
          <div class="product-title">${barter.offered_product?.name || 'Producto'}</div>
          <div class="product-price">${barter.offered_product?.price || 0}</div>
          <span class="status status-trueque-pendiente">Trueque Pendiente</span>
          <div class="exchange-info">
            <strong>Se cambia por:</strong> ${barter.requested_product?.name || 'Producto'}
          </div>
        </div>
      `;

      productGrid.appendChild(card);
    });
  }

  // Método para actualizar contador en pestaña
  private updateTabCounter(tabId: string, count: number): void {
    const tab = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (!tab) return;

    let counter = tab.querySelector('.tab-counter');

    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'tab-counter';
      tab.appendChild(counter);
    }

    counter.textContent = count.toString();
    (counter as HTMLElement).style.display = count > 0 ? 'inline-block' : 'none';
  }

  // Método para cargar productos en venta
  loadUserProductsForSale(): void {
    if (!this.userId) {
      console.warn('No se pueden cargar productos - userId es null');
      return;
    }

    // Mostrar un indicador de carga
    const productGrid = document.querySelector('#en-venta .product-grid');
    if (productGrid) {
      productGrid.innerHTML = '<div class="loading-products">Cargando productos...</div>';
    }

    this.productService.getProductsByUser(this.userId).subscribe({
      next: (products) => {
        // Filtrar solo productos para venta (type = regular) y disponibles
        this.productsForSale = products.filter(p =>
          p.type === 'regular' && p.status === 'disponible'
        );

        // Actualizar el DOM con los productos cargados
        this.updateProductsForSaleUI();

        // Cargar productos de tipo barter para la sección de trueques
        this.loadBarterProducts(products);
      },
      error: (err) => {
        console.error('Error al cargar productos en venta:', err);

        // Mostrar mensaje de error en la interfaz
        if (productGrid) {
          productGrid.innerHTML = '<div class="error-message">No se pudieron cargar tus productos</div>';
        }
      }
    });
  }

  // Método nuevo para cargar productos de tipo barter en la sección de trueques
  loadBarterProducts(products: any[]): void {
    // Filtrar productos de tipo barter
    const barterProducts = products.filter(p =>
      p.type === 'barter' && p.status === 'disponible'
    );

    // Actualizar la UI de trueques pendientes
    this.updateBarterProductsUI(barterProducts);

    // Actualizar contador de trueques pendientes
    this.updateTabCounter('trueques-pendientes', barterProducts.length);
  }

  // Reemplaza el método updateBarterProductsUI con esta versión completa
  // Versión actualizada con cards idénticas a las de "En Venta"
  updateBarterProductsUI(barterProducts: any[]): void {
    const tabContent = document.getElementById('trueques-pendientes');
    if (!tabContent) return;

    // Obtener el contenedor con la clase correcta
    let productGridContainer = tabContent.querySelector('.row.px-xl-5') as HTMLElement;
    if (!productGridContainer) {
      console.error('No se encontró el contenedor .row.px-xl-5 en la pestaña trueques-pendientes');
      return;
    }

    // Limpiar contenido actual
    productGridContainer.innerHTML = '';

    // Mostrar mensaje cuando no hay productos
    if (barterProducts.length === 0) {
      productGridContainer.innerHTML = `
        <div class="col-12">
          <div class="empty-state">
            <div class="text-center py-5">
              <i class="fas fa-exchange-alt fa-4x text-muted mb-3"></i>
              <h4>No tienes productos disponibles para trueque</h4>
              <p class="text-muted">Agrega un producto para trueque para comenzar.</p>
              <button class="btn btn-primary mt-3" id="add-barter-btn">
                <i class="fas fa-plus-circle mr-2"></i>Proponer Trueque
              </button>
            </div>
          </div>
        </div>
      `;

      // Agregar event listener al botón
      setTimeout(() => {
        const addButton = document.getElementById('add-barter-btn');
        if (addButton) {
          addButton.addEventListener('click', () => {
            this.proposeBarterModal();
          });
        }
      }, 0);
      return;
    }

    // Crear cards para cada producto con EXACTAMENTE la misma estructura que en la sección "En Venta"
    barterProducts.forEach((product, index) => {
      // Crear columna contenedora
      const productCol = document.createElement('div');
      productCol.className = 'col-lg-3 col-md-4 col-sm-6 pb-1';

      // Crear el HTML interno EXACTAMENTE igual al de las cards de la sección "En Venta"
      productCol.innerHTML = `
        <div class="product-item bg-light mb-4">
          <div class="product-img position-relative overflow-hidden">
            <!-- Imagen del producto -->
            <img src="${this.getProductImageUrl(product)}" alt="${product?.name || 'Producto'}" class="img-fluid w-100"
                 onerror="this.onerror=null; this.src='${this.getRandomFallbackImage(product.id_product)}'">
            
            <!-- Botones de acción hover -->
            <div class="product-action">
              <a class="btn btn-outline-dark btn-square" href="javascript:void(0)"
                 data-product-id="${product.id_product}">
                <i class="fas fa-pencil-alt"></i>
              </a>
              <a class="btn btn-outline-dark btn-square" href="javascript:void(0)"
                 data-product-id="${product.id_product}">
                <i class="fas fa-trash-alt"></i>
              </a>
            </div>
          </div>
          
          <div class="text-center py-4">
            <!-- Nombre del producto -->
            <a class="h6 text-decoration-none text-truncate" href="javascript:void(0)">
              ${product?.name || 'Producto sin nombre'}
            </a>
            
            <!-- Precio del producto -->
            <div class="d-flex align-items-center justify-content-center mt-2">
              <h5>$${product?.price ? product.price.toLocaleString('es-CO') : '0'}</h5>
            </div>
            
            <!-- Etiqueta de estado y tipo -->
            <div class="d-flex align-items-center justify-content-center mb-1">
              <span class="badge badge-primary">
                Disponible para trueque
              </span>
              <span class="badge badge-success ml-2">
                Disponible
              </span>
            </div>
            
            <!-- Fecha de creación -->
            <small class="text-muted">${product?.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''}</small>
          </div>
        </div>
      `;

      // Agregar al contenedor principal
      productGridContainer.appendChild(productCol);

      // Agregar event listeners a los botones
      setTimeout(() => {
        // Botones de edición
        const editBtns = productCol.querySelectorAll('.btn-outline-dark.btn-square:first-child');
        editBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.editProduct(product.id_product);
          });
        });

        // Botones de eliminación
        const deleteBtns = productCol.querySelectorAll('.btn-outline-dark.btn-square:last-child');
        deleteBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.confirmDeleteProduct(product.id_product);
          });
        });

        // Click en el nombre del producto también edita
        const productTitle = productCol.querySelector('.h6.text-decoration-none');
        if (productTitle) {
          productTitle.addEventListener('click', () => {
            this.editProduct(product.id_product);
          });
        }
      }, 0);
    });
  }

  // Método para abrir el modal de producto
  openProductModal(): void {
    this.editProductId = undefined; // Para crear un producto nuevo
    this.showProductModal = true;
  }

  // Método para editar un producto existente
  editProduct(productId: number): void {
    this.editProductId = productId;
    this.showProductModal = true;
  }

  // Método para confirmar la eliminación de un producto
  confirmDeleteProduct(productId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      this.productService.deleteProduct(productId).subscribe({
        next: () => {
          this.toastr.success('Producto eliminado correctamente');
          // Recargar productos
          this.loadUserProductsForSale();
        },
        error: (err) => {
          console.error('Error al eliminar producto:', err);
          this.toastr.error('No se pudo eliminar el producto');
        }
      });
    }
  }

  // Método para manejar el cierre del modal de producto
  handleProductModalClose(refresh: boolean): void {
    this.showProductModal = false;

    if (refresh) {
      // Si se creó o actualizó un producto, recargar la lista
      this.loadUserProductsForSale();

      // Mostrar mensaje de éxito
      this.toastr.success('Producto guardado correctamente');
    }
  }

  // Método para cambiar entre pestañas
  changeTab(tabId: string): void {
    this.activeTab = tabId;

    // Ocultar todos los contenidos
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.remove('active');
    });

    // Mostrar el contenido seleccionado
    const selectedContent = document.getElementById(tabId);
    if (selectedContent) {
      selectedContent.classList.add('active');
    }

    // Cargar datos específicos según la pestaña
    if (tabId === 'en-venta') {
      this.loadUserProductsForSale();
    } else if (tabId === 'trueques-pendientes') {
      // Recargar productos de tipo barter
      this.productService.getProductsByUser(this.userId).subscribe({
        next: (products) => {
          this.loadBarterProducts(products);
        },
        error: (err) => {
          console.error('Error al cargar productos para trueques:', err);
        }
      });
    }
  }

  // Método para obtener la URL de la imagen de un producto
  getProductImageUrl(product: any): string {
    // Primero intentar obtener la imagen desde productImages
    if (product.productImages && product.productImages.length > 0) {
      return product.productImages[0].url;
    }
    
    // Luego intentar con images (si el backend devuelve imágenes con ese nombre)
    if (product.images && product.images.length > 0) {
      return product.images[0].url;
    }
    
    // Si ambos fallan, usar una imagen de respaldo basada en el ID del producto
    if (product.id_product) {
      return this.getRandomFallbackImage(product.id_product);
    }
    
    // Si todo falla, usar placeholder genérico
    return 'assets/img/product-placeholder.jpg';
  }

  // Método para obtener una imagen de respaldo aleatoria basada en el ID del producto
  getRandomFallbackImage(productId: number): string {
    if (!productId || !this.fallbackImages || this.fallbackImages.length === 0) {
      return 'assets/img/product-placeholder.jpg'; // Imagen por defecto
    }
    
    // Usar el ID del producto para seleccionar una imagen consistente
    const index = productId % this.fallbackImages.length;
    return this.fallbackImages[index];
  }

  // Método para actualizar la UI de productos en venta
  updateProductsForSaleUI(): void {
    const productGrid = document.querySelector('#en-venta .product-grid');
    if (!productGrid) return;

    // Limpiar el grid existente
    productGrid.innerHTML = '';

    // Si no hay productos, mostrar mensaje
    if (!this.productsForSale || this.productsForSale.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-box-open fa-4x text-muted mb-3"></i>
        <h4>No tienes productos en venta</h4>
        <p class="text-muted">¡Comienza a vender tus productos!</p>
        <button class="btn btn-primary mt-3" id="add-product-btn">
          <i class="fas fa-plus-circle mr-2"></i>Añadir Producto
        </button>
      </div>
    `;
      productGrid.appendChild(emptyState);

      // Agregar event listener al botón
      setTimeout(() => {
        const addButton = document.getElementById('add-product-btn');
        if (addButton) {
          addButton.addEventListener('click', () => {
            this.openProductModal();
          });
        }
      }, 0);
      return;
    }

    // Añadir cada producto al grid
    this.productsForSale.forEach((product, index) => {
      // Crear el elemento de tarjeta de producto
      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      // Obtener la URL de la imagen
      const imageUrl = this.getProductImageUrl(product);

      // Construir el contenido de la tarjeta
      productCard.innerHTML = `
      <div class="product-img" style="background-image: url('${imageUrl}')">
        <div class="product-badge">Venta</div>
        <div class="product-action">
          <a class="btn btn-outline-dark btn-square edit-btn" href="javascript:void(0)" data-product-id="${product.id_product}">
            <i class="fas fa-pencil-alt"></i>
          </a>
          <a class="btn btn-outline-dark btn-square delete-btn" href="javascript:void(0)" data-product-id="${product.id_product}">
            <i class="fas fa-trash-alt"></i>
          </a>
        </div>
      </div>
      <div class="product-info">
        <div class="product-title">${product.name || 'Producto sin nombre'}</div>
        <div class="product-description">${product.description?.substring(0, 50) || ''}${product.description?.length > 50 ? '...' : ''}</div>
        <div class="product-price">$${product.price?.toLocaleString('es-CO') || 0}</div>
        <div class="product-footer">
          <span class="status ${product.stock <= 0 ? 'status-agotado' : 'status-disponible'}">
            ${product.stock <= 0 ? 'Agotado' : 'Disponible'}
          </span>
          <div class="product-actions">
            <button class="btn-edit" data-product-id="${product.id_product}">
              <i class="fas fa-pencil-alt"></i> Editar
            </button>
            <button class="btn-delete" data-product-id="${product.id_product}">
              <i class="fas fa-trash-alt"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
    `;

      // Agregar la tarjeta al grid
      productGrid.appendChild(productCard);

      // Agregar event listeners directamente a los botones de esta tarjeta
      setTimeout(() => {
        const editBtns = productCard.querySelectorAll('.edit-btn, .btn-edit');
        editBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            this.editProduct(product.id_product);
          });
        });

        const deleteBtns = productCard.querySelectorAll('.delete-btn, .btn-delete');
        deleteBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            this.confirmDeleteProduct(product.id_product);
          });
        });
      }, 0);
    });
  }

  // Método para manejar el cierre del modal de barter
  handleBarterModalClose(refresh: boolean): void {
    this.showBarterModal = false;
    
    if (refresh) {
      // Recargar datos relevantes
      this.loadUserBartersPending();
      this.toastr.success('Operación de trueque completada con éxito');
    }
  }
}