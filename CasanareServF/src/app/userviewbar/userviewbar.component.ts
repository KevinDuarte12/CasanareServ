import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../services/productos.services';
import { BarterService } from '../services/barter.service';
import { EditProductComponent } from '../edit-product/edit-product.component';
import { EditBarterComponent } from '../edit-barter/edit-barter.component';
import { BarterDetailsComponent } from '../barter-details/barter-details.component';
import { Barter, BarterRequest, BarterProposalRequest } from '../interfaces/barter';
import { NotificationService } from '../services/notification.service';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { UserService } from '../services/user.services';
import { ImageService } from '../services/image.service';
import { user } from '../interfaces/user'; // Asegúrate de que esta importación esté
import { Image } from '../interfaces/image'; // Y también esta


@Component({
  selector: 'app-userviewbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EditProductComponent,
    EditBarterComponent,
    BarterDetailsComponent,
    EditUserComponent // Añadir esta línea
  ],
  templateUrl: './userviewbar.component.html',
  styleUrl: './userviewbar.component.css'
})
export class UserviewbarComponent implements OnInit {
  // Información del usuario
  userName: string = '';
  userEmail: string = '';
  userProfileImage: string | null = null;
  defaultProfileImage: string = 'img/perfil3.png';
  userInitials: string = '';
  isLoggedIn: boolean = false;
  userId: number = 0;
  isLoading: boolean = true;
  public userPhone: string = '';
  public userLocation: string = '';
  public isMenuOpen: boolean = false;

  // Nuevas propiedades para el perfil
  userAddress: string = '';
  userDepartment: string = '';
  userMunicipality: string = '';
  showPasswordModal: boolean = false;

  // Gestión de trueques
  showBarterModal: boolean = false;
  selectedOwnProduct: number | null = null;
  selectedTargetProduct: number | null = null;
  barterComment: string = '';
  barterAddedValue: number = 0;

  // Gestión modal de productos
  showProductModal: boolean = false;
  editProductId: number | undefined = undefined;

  // Productos del usuario
  productsForSale: any[] = [];
  barterProducts: any[] = [];

  // Imágenes de respaldo
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

  selectedBarterToEdit: number | null = null;
  // Control de navegación por pestañas
  activeTab: string = 'en-venta';

  // Notificaciones
  notifications: Notification[] = [];
  unreadNotificationCount: number = 0;
  isLoadingNotifications: boolean = false;

  // Propuesta de trueque
  showProponerTrueque: boolean = false;
  targetProductId: number | null = null;
  targetProductName: string = '';
  targetProductOwnerId: number | null = null;
  truequeForm: FormGroup;

  // Añade esta propiedad a la clase
  userProducts: any[] = [];

  // Añade estas propiedades a la clase
  userBarters: any[] = [];
  isLoadingBarters: boolean = false;

  // Añade esta propiedad a la clase (línea 70, junto a las demás propiedades)
  showEditBarter: boolean = false;

  // Añade estas propiedades
  showBarterDetailsModal: boolean = false;
  selectedBarterId: number | null = null;

  // Añade estas propiedades justo después de userBarters
  userBartersPending: any[] = [];
  userBartersCompleted: any[] = [];
  userBartersReceived: any[] = [];

  // Añadir estas propiedades a la clase
  showEditProfileModal = false;

  // Agregar estas propiedades en la clase UserviewbarComponent
  public userService: UserService; // Servicio de usuario
  public userDocumentType: string = ''; // Tipo de documento
  public userDocumentNumber: string = ''; // Número de documento

  // Actualiza el constructor para incluir userService
  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private barterService: BarterService,
    private router: Router,
    private toastr: ToastrService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    userService: UserService, // Inyecta UserService
    private imageService: ImageService
  ) {
    this.userService = userService; // Asigna el servicio a la propiedad de la clase
    
    // Inicializar el formulario de trueque
    this.truequeForm = this.fb.group({
      selectedProduct: ['', Validators.required],
      notes: ['', Validators.maxLength(500)]
    });
  }

  @HostListener('window:keydown.escape')
  handleEscKey() {
    this.closeMenu();
  }

  @HostListener('window:click', ['$event'])
  handleClick(event: MouseEvent) {
    const navbar = document.querySelector('.navbar');
    const menu = document.querySelector('.navbar-menu');
    
    if (!navbar?.contains(event.target as Node) && !menu?.contains(event.target as Node)) {
      this.closeMenu();
    }
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();

    if (this.isLoggedIn) {
      // Cargar datos básicos iniciales
      this.loadUserData();
      
      // Cargar datos completos del perfil
      this.loadUserProfile();
      
      // Resto del código...
    }
  }

  // Añadir este método para destacar una notificación específica
  highlightNotification(notificationId: string): void {
    // Primero asegurarse que las notificaciones están cargadas
    if (!this.notifications || this.notifications.length === 0) {
      this.loadUserNotifications(() => {
        this.scrollToAndHighlightNotification(notificationId);
      });
    } else {
      this.scrollToAndHighlightNotification(notificationId);
    }
  }

  scrollToAndHighlightNotification(notificationId: string): void {
    // Buscar la notificación relacionada con el trueque
    const targetNotification = this.notifications.find(n =>
      (n.entity_type === 'barter' && n.entity_id.toString() === notificationId) ||
      n.id_notification.toString() === notificationId
    );

    if (targetNotification) {
      // Marcar como leída si aún no lo está
      if (!targetNotification.is_read) {
        this.markNotificationAsRead(targetNotification.id_notification);
      }

      // Dar tiempo al DOM para actualizar
      setTimeout(() => {
        // Encontrar el elemento y hacer scroll
        const element = document.getElementById(`notification-${targetNotification.id_notification}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted-notification');

          // Remover la clase después de 3 segundos
          setTimeout(() => {
            element.classList.remove('highlighted-notification');
          }, 3000);
        }
      }, 100);
    }
  }

  // Método para cargar datos de usuario
  loadUserData(): void {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userId = user.id || 0;
        this.userName = user.name || 'Usuario';
        this.userEmail = user.email || '';
        this.userInitials = this.generateUserInitials(user.name || '');
        
        // Cargar datos adicionales del perfil
        this.userPhone = user.phone || '';
        this.userDepartment = user.department || '';
        this.userMunicipality = user.city || '';
        this.userDocumentType = user.document_type || '';
        this.userDocumentNumber = user.document_number || '';

        // Mostrar ubicación concatenada si ambos datos existen
        if (user.department && user.city) {
          this.userLocation = `${user.city}, ${user.department}`;
        } else if (user.department) {
          this.userLocation = user.department;
        } else if (user.city) {
          this.userLocation = user.city;
        } else {
          this.userLocation = 'No especificada';
        }

        // Configurar imagen de perfil
        if (user.profileImage && user.profileImage.trim() !== '') {
          this.userProfileImage = user.profileImage;
        } else {
          this.userProfileImage = this.defaultProfileImage;
        }

        // Después de cargar datos básicos, obtener detalles del perfil del servidor
        this.refreshUserProfile();

      } catch (error) {
        console.error('Error al procesar datos de usuario:', error);
        this.userInitials = 'U';
        this.userProfileImage = this.defaultProfileImage;
      }
    }
  }

  // Método para actualizar datos de perfil desde el servidor
  refreshUserProfile(): void {
    this.userService.getUserProfile().subscribe({
      next: (data: user) => {
        // Actualizar datos principales
        this.userName = data.name;
        this.userEmail = data.email;
        this.userPhone = data.phone || '';
        this.userDepartment = data.department || '';
        this.userMunicipality = data.city || '';
        this.userDocumentType = data.document_type || '';
        this.userDocumentNumber = data.document_number || '';
        
        // Actualizar ubicación formateada
        if (data.department && data.city) {
          this.userLocation = `${data.city}, ${data.department}`;
        } else if (data.department) {
          this.userLocation = data.department;
        } else if (data.city) {
          this.userLocation = data.city;
        } else {
          this.userLocation = 'No especificada';
        }
        
        // Actualizar imagen de perfil
        if (data.profileImage) {
          this.userProfileImage = data.profileImage;
        } else if (data.userImages && data.userImages.length > 0) {
          const mainImage = data.userImages.find((img: Image) => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : data.userImages[0].url;
        }
        
        // Actualizar datos en localStorage
        this.updateUserInStorage(data);
      },
      error: (error) => {
        console.error('Error al obtener perfil de usuario:', error);
      }
    });
  }

  // Método auxiliar para actualizar localStorage
  private updateUserInStorage(userData: user): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      user.name = userData.name;
      user.email = userData.email;
      user.phone = userData.phone;
      user.department = userData.department;
      user.city = userData.city;
      user.document_type = userData.document_type;
      user.document_number = userData.document_number;
      
      if (userData.profileImage) {
        user.profileImage = userData.profileImage;
      } else if (userData.userImages && userData.userImages.length > 0) {
        const mainImage = userData.userImages.find((img: Image) => img.is_main);
        if (mainImage) {
          user.profileImage = mainImage.url;
        }
      }
      
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  // Genera iniciales para avatar cuando no hay imagen
  generateUserInitials(name: string): string {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0].substring(0, 2).toUpperCase();
      }
    }
    return 'US';
  }

  // Cierra sesión y redirecciona
  logout(): void {
    this.toastr.info(`¡Hasta pronto, ${this.userName}!`, 'Sesión cerrada');
    this.authService.logout();
    this.router.navigate(['/']);
  }

  // Actualiza o añade este método en userviewbar.component.ts
  handleImageError(event: Event, index: number): void {
    // Verificar que el target no sea nulo y que sea una instancia de HTMLImageElement
    const target = event.target as HTMLImageElement;
    if (target && target instanceof HTMLImageElement) {
      target.src = this.getRandomFallbackImage(index);
    }
  }

  // Maneja errores de carga de imagen de perfil
  handleProfileImageError(event: any): void {
    console.warn('Error al cargar la imagen de perfil, usando imagen predeterminada');
    event.target.src = this.defaultProfileImage;

    event.target.onerror = () => {
      console.error('No se pudo cargar la imagen predeterminada');
      event.target.style.display = 'none';

      const avatarElement = event.target.closest('.avatar');
      if (avatarElement) {
        avatarElement.textContent = this.userInitials || 'U';
      }
    };
  }

  // Abre el modal para proponer trueques
  proposeBarterModal(): void {
    this.showBarterModal = true;
  }

  // Crea una propuesta de trueque
  createBarter(): void {
    if (!this.selectedOwnProduct || !this.selectedTargetProduct) {
      this.toastr.warning('Debes seleccionar los productos para el trueque');
      return;
    }

    if (!this.userId) {
      this.toastr.error('No se ha podido identificar al usuario. Por favor, inicia sesión nuevamente');
      return;
    }

    const targetProduct = this.findTargetProduct(this.selectedTargetProduct);

    if (!targetProduct) {
      this.toastr.error('Producto solicitado no encontrado');
      return;
    }

    const barterRequest: BarterProposalRequest = {
      useExistingProduct: true,
      id_prod_offer: this.selectedOwnProduct,
      id_prod_request: this.selectedTargetProduct,
      id_user_offer: this.userId as number,
      id_user_receiving: targetProduct.id_user,
      status: 'pendiente' as 'pendiente',
      notes: this.barterComment,
      value: this.barterAddedValue > 0 ? this.barterAddedValue : undefined,
      productOffer: {
        name: '',
        description: '',
        value: 0
      }
    };

    this.barterService.createBarter(barterRequest as unknown as BarterRequest).subscribe({
      next: (response) => {
        this.toastr.success('Propuesta de trueque enviada con éxito');
        this.handleBarterModalClose(true);
      },
      error: (err) => {
        console.error('Error al crear trueque:', err);
        this.toastr.error(err.error?.msg || 'Error al crear la propuesta de trueque');
      }
    });
  }

  // Método auxiliar para encontrar un producto objetivo por ID
  private findTargetProduct(productId: number): any {
    // Esta implementación dependerá de cómo se manejen los productos disponibles
    // Por ahora, devolvemos un objeto simulado
    return { id_user: 1 }; // Objeto de ejemplo, adaptar según la implementación real
  }

  // Carga productos en venta del usuario
  loadUserProductsForSale(): void {
    if (!this.userId) {
      console.warn('No se pueden cargar productos - userId es null');
      return;
    }

    this.isLoading = true;

    this.productService.getProductsByUser(this.userId).subscribe({
      next: (products) => {
        // Filtrar productos por tipo
        this.productsForSale = products.filter(p =>
          p.type === 'regular' && p.status === 'disponible'
        );

        // Cargar productos de trueque
        this.barterProducts = products.filter(p =>
          p.type === 'barter' && p.status === 'disponible'
        );

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.toastr.error('No se pudieron cargar tus productos');
        this.isLoading = false;
      }
    });
  }

  // Abre el modal para crear un nuevo producto
  openProductModal(): void {
    this.editProductId = undefined;
    this.showProductModal = true;
  }

  // Corrige el método editProduct en userviewbar.component.ts
  editProduct(productId: number): void {
    console.log(`Editando producto con ID: ${productId}`);
    
    if (!productId) {
      console.error('ID de producto inválido');
      this.toastr.error('No se puede editar este producto');
      return;
    }
    
    // Si estamos editando un producto desde un trueque, debemos manejar correctamente la relación
    const isPartOfBarter = this.userBartersPending?.some(
      barter => {
        // Comprobamos si el ID del producto coincide con cualquiera de las posibles propiedades
        return (barter.id_product_offer === productId) || 
               (barter.product_offer?.id_product === productId) ||
               (barter.id_product === productId);
      }
    );
    
    if (isPartOfBarter) {
      // Buscar el barter correspondiente
      const barterToEdit = this.userBartersPending.find(
        barter => 
          (barter.id_product_offer === productId) || 
          (barter.product_offer?.id_product === productId) ||
          (barter.id_product === productId)
      );
      
      // Si el trueque ya tiene propuesta (status = pendiente), no permitir edición
      if (barterToEdit && barterToEdit.status === 'pendiente') {
        this.toastr.warning('No se puede editar un trueque que ya tiene una propuesta');
        return;
      }
    }
    
    // Proceder con la edición normal del producto
    this.editProductId = productId;
    this.showProductModal = true;
    
    console.log('Abriendo modal de edición para producto ID:', productId);
  }

  // Confirma y procesa la eliminación de un producto
  confirmDeleteProduct(productId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      this.productService.deleteProduct(productId).subscribe({
        next: () => {
          this.toastr.success('Producto eliminado correctamente');
          this.loadUserProductsForSale();
        },
        error: (err) => {
          console.error('Error al eliminar producto:', err);
          this.toastr.error('No se pudo eliminar el producto');
        }
      });
    }
  }

  // Maneja el cierre del modal de producto
  handleProductModalClose(refresh: boolean): void {
    this.showProductModal = false;

    if (refresh) {
      this.loadUserProductsForSale();
      this.toastr.success('Producto guardado correctamente');
    }
  }

  // Modifica el método changeTab para cargar trueques en las pestañas correspondientes
  changeTab(tabId: string): void {
    this.activeTab = tabId;
    this.closeMenu(); // Cierra el menú al cambiar de pestaña

    // Cargar datos específicos según la pestaña
    if (tabId === 'en-venta') {
      this.loadUserProductsForSale();
    } else if (tabId === 'trueques' || tabId === 'trueques-pendientes') {
      this.loadBartersForUser();
    } else if (tabId === 'trueques-completados') {
      this.loadBartersForUser();
    } else if (tabId === 'trueques-recibidos') {
      this.loadBartersForUser();
    } else if (tabId === 'notificaciones') {
      this.loadUserNotifications();
    }
  }

  // Obtiene la URL de imagen para un producto
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
  
    // Resto del código existente para otras estructuras
    // ... 
  
    return this.getRandomFallbackImage(product?.id_product || 0);
  }

  // Selecciona una imagen de respaldo consistente basada en ID
  getRandomFallbackImage(productId: number): string {
    if (!productId || !this.fallbackImages || this.fallbackImages.length === 0) {
      return 'img/pc-gamer.jpg';
    }

    const index = productId % this.fallbackImages.length;
    return this.fallbackImages[index];
  }

  // Maneja el cierre del modal de trueque
  handleBarterModalClose(event: { refresh: boolean, status?: string } | boolean): void {
    // Determinar si el parámetro es un objeto o un boolean
    const isRefreshBoolean = typeof event === 'boolean';
    const refresh = isRefreshBoolean ? event : event.refresh;
    const status = !isRefreshBoolean ? event.status : undefined;

    // Si viene del modal de detalles
    if (!isRefreshBoolean) {
      this.showBarterDetailsModal = false;

      if (refresh) {
        // Recargar las notificaciones
        this.loadNotifications();

        // Acciones según el status devuelto
        if (status === 'aceptado') {
          this.toastr.success('Has aceptado la propuesta de trueque');
        } else if (status === 'rechazado') {
          this.toastr.success('Has rechazado la propuesta de trueque');
        }
      }
    }
    // Si viene del modal de creación/edición de trueque
    else {
      this.showBarterModal = false;
      this.showEditBarter = false; // Cerrar también este modal si está abierto
      this.selectedOwnProduct = null;
      this.selectedTargetProduct = null;
      this.barterComment = '';
      this.barterAddedValue = 0;

      if (refresh) {
        this.loadUserProductsForSale();
        this.toastr.success('Operación de trueque completada con éxito');
      }
    }
  }

  // Cargar notificaciones del usuario
  loadUserNotifications(callback?: Function): void {
    if (!this.userId) return;

    this.isLoadingNotifications = true;

    this.notificationService.loadUserNotifications(this.userId).subscribe({
      next: (response) => {
        this.notifications = response.notifications || [];
        this.isLoadingNotifications = false;
        this.updateUnreadCount();

        if (callback) callback();
      },
      error: (error) => {
        console.error('Error al cargar notificaciones:', error);
        this.toastr.error('No se pudieron cargar las notificaciones');
        this.isLoadingNotifications = false;
      }
    });
  }

  // Actualizar contador de notificaciones no leídas
  updateUnreadCount(): void {
    if (!this.userId) return;

    this.notificationService.getUnreadCount(this.userId).subscribe({
      next: (response) => {
        this.unreadNotificationCount = response.unread_count || 0;
      },
      error: (error) => {
        console.error('Error al obtener conteo de notificaciones:', error);
      }
    });
  }

  // Marcar una notificación como leída
  markNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        // Actualizar estado local
        const notification = this.notifications.find(n => n.id_notification === notificationId);
        if (notification) notification.is_read = true;

        this.updateUnreadCount();
        this.toastr.success('Notificación marcada como leída');
      },
      error: (error) => {
        console.error('Error al marcar notificación:', error);
        this.toastr.error('No se pudo marcar la notificación como leída');
      }
    });
  }

  // Marcar todas las notificaciones como leídas
  markAllNotificationsAsRead(): void {
    if (!this.userId || this.unreadNotificationCount === 0) return;

    this.notificationService.markAllAsRead(this.userId).subscribe({
      next: () => {
        // Actualizar estados locales
        this.notifications.forEach(notification => {
          notification.is_read = true;
        });

        this.unreadNotificationCount = 0;
        this.toastr.success('Todas las notificaciones marcadas como leídas');
      },
      error: (error) => {
        console.error('Error al marcar todas las notificaciones:', error);
        this.toastr.error('No se pudieron marcar todas las notificaciones');
      }
    });
  }

  // Eliminar una notificación
  deleteNotification(notificationId: number): void {
    if (confirm('¿Estás seguro que deseas eliminar esta notificación?')) {
      this.notificationService.deleteNotification(notificationId).subscribe({
        next: () => {
          // Eliminar del array local
          this.notifications = this.notifications.filter(
            n => n.id_notification !== notificationId
          );

          this.updateUnreadCount();
          this.toastr.success('Notificación eliminada');
        },
        error: (error) => {
          console.error('Error al eliminar notificación:', error);
          this.toastr.error('No se pudo eliminar la notificación');
        }
      });
    }
  }

  // Navegar a la entidad relacionada con la notificación
  navigateToEntity(notification: Notification): void {
    // Marcar como leída si no está leída
    if (!notification.is_read) {
      this.markNotificationAsRead(notification.id_notification);
    }

    // Mejorar este caso para mayor claridad
    if (notification.entity_type === 'barter' && notification.entity_id) {
      if (notification.type === 'new_barter') {
        // Si ya estamos en la vista correcta, solo mostrar un mensaje
        if (this.activeTab === 'notificaciones') {
          this.highlightNotification(notification.id_notification.toString());
        } else {
          // Si no estamos en la pestaña correcta, cambiar a ella y luego destacar
          this.activeTab = 'notificaciones';
          setTimeout(() => {
            this.highlightNotification(notification.id_notification.toString());
          }, 300);
        }
      } else {
        // Para otros tipos de notificaciones de trueque
        this.viewBarterDetails(notification.entity_id);
      }
    } else if (notification.action_url) {
      // ...resto del código...
    }
  }

  // Formatear fecha de notificación
  formatNotificationDate(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Justo ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `Hace ${diffInDays} días`;

    // Si es más antiguo, mostrar fecha completa
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Obtener clase CSS para el icono según tipo de notificación
  getNotificationIconClass(type: string): string {
    switch (type) {
      case 'barter':
      case 'barter_status':
      case 'barter_response':
      case 'new_barter':
        return 'barter';
      case 'purchase':
      case 'sale':
        return 'sale';
      case 'system':
        return 'system';
      default:
        return '';
    }
  }

  // Obtener icono según tipo de notificación
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'barter':
      case 'barter_status':
      case 'barter_response':
      case 'new_barter':
        return 'fas fa-exchange-alt';
      case 'purchase':
        return 'fas fa-shopping-cart';
      case 'sale':
        return 'fas fa-dollar-sign';
      case 'system':
        return 'fas fa-bell';
      default:
        return 'fas fa-bell';
    }
  }

  // Método para cargar productos del usuario para trueque
  loadUserProducts() {
    if (!this.userId) return;

    this.productService.getProductsByUser(this.userId).subscribe({
      next: (products) => {
        this.userProducts = products.filter(p => p.status === 'disponible');
        console.log('Productos disponibles para trueque:', this.userProducts);
      },
      error: (error) => {
        console.error('Error al cargar productos del usuario:', error);
        this.toastr.error('No se pudieron cargar tus productos disponibles');
      }
    });
  }

  // Método para enviar la propuesta de trueque
  proponerTrueque() {
    if (!this.truequeForm.valid) {
      this.toastr.warning('Por favor selecciona un producto para ofrecer');
      return;
    }
  
    // Verificar que todos los valores requeridos existan antes de continuar
    if (!this.userId || !this.targetProductId || !this.targetProductOwnerId) {
      this.toastr.error('Información incompleta para proponer trueque');
      return;
    }
  
    // Validación: Evitar trueques con uno mismo - USAR ERROR en vez de INFO
    if (this.userId === this.targetProductOwnerId) {
      this.toastr.error('No puedes proponer un trueque a ti mismo');
      return;
    }
  
    const targetProductOwner = this.targetProductOwnerId;
    
    console.log('🚨 VERIFICANDO BARTERS EXISTENTES PARA PRODUCTO:', this.targetProductId);
    
    // Primero verificar si el producto objetivo ya es parte de un trueque existente
    this.barterService.getBartersByProductOffered(this.targetProductId).subscribe({
      next: (existingBarters) => {
        console.log('🔍 Resultado de búsqueda:', existingBarters);
        
        // Si encontramos un barter existente para este producto
        if (existingBarters && existingBarters.length > 0) {
          const existingBarter = existingBarters[0]; // Tomar el primero si hay varios
          
          console.log('✅ ENCONTRADO barter existente para este producto:', existingBarter);
          
          // Enviar propuesta al barter existente usando proposeForExistingBarter
          const proposal = {
            id_prod_request: this.truequeForm.value.selectedProduct,
            id_user_receiving: targetProductOwner,
            notes: this.truequeForm.value.notes || ''
          };
          
          console.log(`🔄 ACTUALIZANDO barter existente ID: ${existingBarter.id_barter}`, proposal);
          
          this.barterService.proposeForExistingBarter(existingBarter.id_barter, proposal).subscribe({
            next: (response) => {
              console.log('✅ Propuesta enviada correctamente:', response);
              this.toastr.success('Propuesta de trueque enviada con éxito');
              this.showProponerTrueque = false;
              this.truequeForm.reset();
              this.changeTab('trueques-pendientes');
            },
            error: (err) => {
              console.error('❌ Error al enviar propuesta:', err);
              this.toastr.error('Error al enviar la propuesta de trueque');
            }
          });
        } else {
          console.log('⚠️ No se encontró trueque existente, creando uno nuevo');
          // Si no hay un trueque existente, crear uno nuevo
          this.createNewBarterProposal();
        }
      },
      error: (err) => {
        console.error('❌ Error verificando trueques existentes:', err);
        // Si hay error, intentar crear uno nuevo
        this.createNewBarterProposal();
      }
    });
  }
  
  // Método auxiliar para crear propuestas nuevas
  private createNewBarterProposal() {
    const barterRequest: BarterRequest = {
      id_prod_offer: this.truequeForm.value.selectedProduct,
      id_prod_request: this.targetProductId!,
      id_user_offer: this.userId!,
      id_user_receiving: this.targetProductOwnerId!,
      status: "pendiente",
      notes: this.truequeForm.value.notes || ''
    };
  
    this.barterService.createBarter(barterRequest).subscribe({
      next: () => {
        this.toastr.success('Propuesta de trueque enviada con éxito');
        this.showProponerTrueque = false;
        this.truequeForm.reset();
        this.changeTab('trueques-pendientes');
      },
      error: (error) => {
        console.error('Error al enviar propuesta de trueque:', error);
        
        // Mostrar el mensaje de error que viene del backend
        const errorMessage = error.error?.message || error.error?.msg || 
                             error.error ;
        this.toastr.error(errorMessage);
      }
    });
  }

  // Método para cancelar la propuesta
  cancelarPropuesta() {
    this.showProponerTrueque = false;
    this.truequeForm.reset();
  }

  // Reemplaza el método loadBartersForUser existente con este:
  loadBartersForUser(): void {
    if (!this.userId) return;

    this.isLoadingBarters = true;
    console.log(`Cargando trueques para usuario ID: ${this.userId}...`);

    this.barterService.getBartersByUser(this.userId).subscribe({
      next: (barters) => {
        console.log('Barters originales:', JSON.stringify(barters));
        
        // Normalizar datos para que tengan una estructura consistente
        this.userBarters = barters.map(b => this.normalizeBarter(b));
        
        // Trueques pendientes - pendientes o aceptados sin aprobación de admin
        this.userBartersPending = this.userBarters.filter(b => {
          const status = (b.status || '').toLowerCase();
          return status === 'disponible' || 
                 status === 'pendiente' || 
                 status === 'aceptado' || 
                 !status;
        });
        
        // Trueques completados - aprobados por admin o completados
        this.userBartersCompleted = this.userBarters.filter(b => {
          if (!b.status) return false;
          
          const status = String(b.status).toLowerCase();
          return status.includes('aprob') || 
                 status.includes('aprov') || 
                 status === 'aprobado_admin' ||
                 status === 'completado';
        });
        
        // Trueques recibidos - propuestas hacia el usuario actual
        this.userBartersReceived = this.userBarters.filter(b => 
          b.id_user_receiving === this.userId && 
          b.status === 'pendiente'
        );
        
        console.log('Trueques pendientes:', this.userBartersPending.length);
        console.log('Trueques completados:', this.userBartersCompleted.length);
        console.log('Trueques recibidos:', this.userBartersReceived.length);
        
        this.isLoadingBarters = false;
      },
      error: (error) => {
        console.error('Error al cargar trueques:', error);
        this.toastr.error('Error al cargar trueques');
        this.isLoadingBarters = false;
      }
    });
  }

  // Añadir estos métodos para manejar trueques desde notificaciones

  // Ver detalles de un trueque
  viewBarterDetails(barterId: number, notificationId?: number): void {
    // Si hay un ID de notificación, marcarla como leída
    if (notificationId) {
      this.notificationService.markAsRead(notificationId).subscribe({
        next: () => {
          console.log('Notificación marcada como leída');
          // Actualizar conteo de notificaciones no leídas
          this.getUnreadNotificationsCount();
        },
        error: (error) => {
          console.error('Error al marcar notificación como leída:', error);
        }
      });
    }

    // Configurar y abrir el modal
    this.selectedBarterId = barterId;
    this.showBarterDetailsModal = true;
  }


  // Actualizar el método acceptBarter para usar el modal
  acceptBarter(barterId: number): void {
    this.selectedBarterId = barterId;
    this.showBarterDetailsModal = true;
  }

  // Actualizar el método rejectBarter para usar el modal
  rejectBarter(barterId: number): void {
    this.selectedBarterId = barterId;
    this.showBarterDetailsModal = true;
  }

  // Agrega este método para corregir el error getUnreadNotificationsCount
  getUnreadNotificationsCount(): void {
    if (!this.userId) return;

    this.notificationService.getUnreadCount(this.userId).subscribe({
      next: (response) => {
        this.unreadNotificationCount = response.unread_count || 0;
      },
      error: (error) => {
        console.error('Error al obtener conteo de notificaciones no leídas:', error);
      }
    });
  }

  // Agrega este método para corregir el error loadNotifications
  loadNotifications(): void {
    if (!this.userId) return;

    this.loadUserNotifications();
  }

  // Añade este método para mostrar nombres más amigables de estados
  getStatusDisplayName(status: string): string {
    if (!status || status === 'undefined' || status === '') {
      return 'Disponible'; // Estado por defecto para cualquier estado vacío o desconocido
    }
    
    const statusLower = String(status).toLowerCase();
    
    // Mapa completo y preciso de todos los estados posibles
    const statusMap: {[key: string]: string} = {
      'disponible': 'Disponible para trueque',
      'pendiente': 'Propuesta recibida',
      'aceptado': 'Pendiente de administrador',
      'aprobado_admin': 'Aprobado por administrador',
      'completado': 'Trueque completado',
      'rechazado': 'Propuesta rechazada',
      'cancelado': 'Trueque cancelado'
    };
    
    // Verificar si hay un nombre exacto para el estado
    if (statusMap[statusLower]) {
      return statusMap[statusLower];
    }
    
    // Para compatibilidad, verificamos coincidencias parciales
    if (statusLower.includes('dispon')) {
      return 'Disponible para trueque';
    }
    
    if (statusLower.includes('pend')) {
      return 'Propuesta recibida';
    }
    
    if (statusLower.includes('acept') || statusLower.includes('acept')) {
      return 'Pendiente de administrador';
    }
    
    if (statusLower.includes('aprob') || statusLower.includes('aprov') || 
        statusLower.includes('admin')) {
      return 'Aprobado por administrador';
    }
    
    if (statusLower.includes('complet')) {
      return 'Trueque completado';
    }
    
    if (statusLower.includes('recha') || statusLower.includes('rechaz')) {
      return 'Propuesta rechazada';
    }
    
    if (statusLower.includes('cancel')) {
      return 'Trueque cancelado';
    }
    
    // Si no coincide con ninguna opción
    return `${status}`; // Devolver el estado original en lugar de "Desconocido"
  }

  // Añadir este método para ayudar con la depuración
  debugBarterStatus(): void {
    console.log('=== DEPURACIÓN DE TRUEQUES ===');
    console.log('Todos los trueques:', this.userBarters);
    
    if (!this.userBarters || this.userBarters.length === 0) {
      console.log('No hay trueques para mostrar');
      this.toastr.info('No hay trueques disponibles para depurar');
      return;
    }
    
    // Contar por estado
    const statusCounts = this.userBarters.reduce((acc: any, barter: any) => {
      const status = barter.status || 'sin_estado';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Conteo por estado:', statusCounts);
    this.toastr.info(`Estados encontrados: ${Object.keys(statusCounts).join(', ')}`);
    
    // Mostrar clasificación
    console.log('Trueques pendientes:', this.userBartersPending);
    console.log('Trueques completados:', this.userBartersCompleted);
    console.log('Trueques recibidos:', this.userBartersReceived);
    
    // Buscar específicamente estados problemáticos
    const problemBarters = this.userBarters.filter(b => !b.status);
    if (problemBarters.length > 0) {
      console.log('⚠️ Trueques sin estado:', problemBarters);
    }
  }

  // Añadir este método después del método debugBarterStatus
  deleteBarter(barterId: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este trueque? Esta acción no se puede deshacer.')) {
      this.barterService.deleteBarter(barterId).subscribe({
        next: () => {
          this.toastr.success('Trueque eliminado correctamente');
          
          
          this.userBartersPending = this.userBartersPending.filter(b => 
            (b.id_barter || b.id) !== barterId
          );
          
          this.userBartersCompleted = this.userBartersCompleted.filter(b => 
            (b.id_barter || b.id) !== barterId
          );
          
          this.userBartersReceived = this.userBartersReceived.filter(b => 
            (b.id_barter || b.id) !== barterId
          );
        },
        error: (err) => {
          console.error('Error al eliminar el trueque:', err);
          this.toastr.error('No se pudo eliminar el trueque');
        }
      });
    }
  }

  public updateProfileImage(): void {
    // Crear instancia de input tipo file de forma programática
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Manejar el evento de selección de archivo
    fileInput.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      const file: File = (target.files as FileList)[0];
      
      if (file) {
        // Mostrar indicador de carga
        this.toastr.info('Subiendo imagen...', 'Por favor espera');
        
        // Crear FormData para enviar la imagen
        const formData = new FormData();
        formData.append('image', file);
        
        // Llamar al servicio para subir imagen
        this.userService.uploadProfileImage(this.userId!, formData).subscribe({
          next: (response) => {
            // Actualizar la imagen de perfil en la vista
            this.userProfileImage = response.image.url;
            
            // Actualizar la imagen en localStorage
            const userData = localStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              user.profileImage = response.image.url;
              localStorage.setItem('user', JSON.stringify(user));
            }
            
            this.toastr.success('Imagen de perfil actualizada correctamente');
          },
          error: (error) => {
            console.error('Error al subir imagen:', error);
            this.toastr.error('Error al subir la imagen');
          }
        });
      }
      
      // Eliminar el input después de usarlo
      document.body.removeChild(fileInput);
    });
    
    // Activar el diálogo para seleccionar archivos
    fileInput.click();
  }

  public editField(field: string): void {
    switch(field) {
      case 'address':
        // Implementar lógica para editar dirección
        break;
      case 'department':
        // Implementar lógica para editar departamento
        break;
      case 'municipality':
        // Implementar lógica para editar municipio
        break;
      default:
        this.toastr.warning('Campo no editable');
    }
  }

  public changePassword(): void {
    this.showPasswordModal = true;
    // Aquí puedes implementar la lógica para cambiar la contraseña
    // Por ejemplo, abrir un modal con el formulario de cambio de contraseña
  }

  public enable2FA(): void {
    // Implementar lógica para activar 2FA
  }
  public deactivateAccount(): void {
    // Implementar lógica para desactivar cuenta
  }

  public closeMenu(): void {
    this.isMenuOpen = false;
  }

  public toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // Añade estos métodos a tu UserviewbarComponent

  // Método para editar un trueque existente
  editBarter(barterId: number): void {
    console.log(`Iniciando edición del trueque ID: ${barterId}`);
    
    // Buscar el trueque en las listas disponibles
    const barter = this.userBarters.find(b => (b.id_barter || b.id) === barterId);
    
    if (!barter) {
      this.toastr.error('No se encontró el trueque para editar');
      return;
    }
    
    // Establecer el ID del trueque a editar y abrir el modal
    this.selectedBarterToEdit = barterId;
    this.showEditBarter = true;
  }

  // Método para obtener el estado de un trueque por su ID
  getBarterStatus(barterId: number): string {
    // Buscar el trueque en las listas disponibles
    const barter = this.userBarters.find(b => (b.id_barter || b.id) === barterId);
    
    if (!barter) {
      return 'desconocido';
    }
    
    return barter.status || 'disponible';
  }

  // Métodos auxiliares para acceder a datos del trueque de forma consistente
  getProductName(trueque: any): string {
    // Para el producto ofrecido
    if (trueque.product_offer) {
      return trueque.product_offer.name || 'Producto sin nombre';
    }
    
    // Para el producto en sí mismo
    if (trueque.name) {
      return trueque.name;
    }
    
    // Para productos con estructura diferente
    if (trueque.product_name) {
      return trueque.product_name;
    }
    
    // Para estructuras de respuesta alternativas
    if (trueque.product && trueque.product.name) {
      return trueque.product.name;
    }
    
    return 'Producto sin nombre';
  }

  getProductPrice(trueque: any): number {
    // Para el producto ofrecido
    if (trueque.product_offer && trueque.product_offer.price) {
      return trueque.product_offer.price;
    }
    
    // Para el precio directo
    if (trueque.price) {
      return trueque.price;
    }
    
    // Para estructuras de respuesta alternativas
    if (trueque.product && trueque.product.price) {
      return trueque.product.price;
    }
    
    // Para valores diferentes del objeto
    if (trueque.value) {
      return trueque.value;
    }
    
    return 0;
  }

  // Método para normalizar la estructura de datos
  private normalizeBarter(barter: any): any {
    const normalized = { ...barter };
    
    // Asegurarse de que el ID sea consistente
    normalized.id = normalized.id_barter || normalized.id;
    
    // IMPORTANTE: Asegurar que el estado siempre tenga un valor válido
    if (!normalized.status || normalized.status === '' || normalized.status === 'undefined') {
      normalized.status = 'disponible'; // Valor por defecto
      console.log(`Corrigiendo estado para trueque ${normalized.id}: disponible`);
    }
    
    // Preservar estructura completa de imágenes si existe
    if (normalized.images) {
      // Asegurarse que images sea un array
      if (!Array.isArray(normalized.images)) {
        normalized.images = [normalized.images];
      }
    }
    
    // Reconstruir adecuadamente product_offer
    if (!normalized.product_offer) {
      normalized.product_offer = {
        id_product: normalized.id_product_offer || normalized.id_prod_offer,
        name: normalized.product_name || normalized.offered_product?.name || 'Producto sin nombre',
        price: normalized.price || normalized.offered_product?.price || 0,
        description: normalized.description || normalized.offered_product?.description || '',
      };
      
      // Copiar imágenes correctamente
      if (normalized.images) {
        normalized.product_offer.images = [...normalized.images];
      }
      
      // También tratar de usar las imágenes del offered_product si existen
      if (normalized.offered_product && normalized.offered_product.images) {
        normalized.product_offer.images = normalized.offered_product.images;
      }
    }
    
    // Si no hay status, usar un valor predeterminado
    if (!normalized.status) {
      normalized.status = 'disponible';
    }
    
    // Agregar un log para debug
    console.log(`Trueque ${normalized.id} normalizado:`, normalized);
    
    // Preservar productImages explícitamente si existe
    if (barter.productImages) {
      normalized.productImages = [...barter.productImages];
    }
    
    return normalized;
  }

  // Método para depurar un trueque específico
  debugTrueque(trueque: any): void {
    console.log('=== DEBUG TRUEQUE ===');
    console.log('Trueque completo:', trueque);
    console.log('ID:', trueque.id_barter || trueque.id);
    console.log('Estado:', trueque.status);
    console.log('Datos de producto ofrecido:', {
      id_product: trueque.id_product_offer || trueque.id_prod_offer,
      product_offer: trueque.product_offer,
      name: this.getProductName(trueque),
      price: this.getProductPrice(trueque)
    });
    
    // Añadir un botón temporal en el HTML para llamar a esta función
    this.toastr.info(`Trueque #${trueque.id_barter || trueque.id} inspeccionado - Ver consola`);
  }

  // Método para diagnóstico de imágenes
  debugProductImages(trueque: any): void {
    console.log('=== DEBUG DE IMÁGENES DEL TRUEQUE ===');
    console.log('ID del trueque:', trueque.id_barter || trueque.id);
    console.log('Trueque completo:', trueque);
    
    // Examinar posibles rutas de imágenes
    console.log('Posibles rutas de imágenes:');
    console.log('trueque.images:', trueque.images);
    console.log('trueque.product_offer?.images:', trueque.product_offer?.images);
    console.log('trueque.offered_product?.images:', trueque.offered_product?.images);
    
    // URL según el método actual
    console.log('URL de imagen actual:', this.getProductImageUrl(trueque.product_offer || trueque));
    
    this.toastr.info('Debug de imágenes en consola');
  }

  // Actualizar el método para editar el perfil
  public editProfile(): void {
    this.showEditProfileModal = true;
  }

  // Método para manejar el cierre del modal
  handleProfileModalClose(updated: boolean): void {
    if (updated) {
      // Recargar datos del usuario desde el servidor si se actualizó
      this.refreshUserProfile();
      this.toastr.success('Perfil actualizado correctamente');
    }
    this.showEditProfileModal = false;
  }

  // Reemplaza el método onFileSelected
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.toastr.info('Subiendo imagen...', 'Por favor espera');
      
      this.imageService.uploadProfileImage(this.userId, file)
        .subscribe({
          next: (response) => {
            this.toastr.success('Imagen de perfil actualizada correctamente');
            
            // Actualiza la imagen de perfil del usuario
            if (response && response.image && response.image.url) {
              this.userProfileImage = response.image.url;
              
              // Actualiza localStorage si es necesario
              const userData = localStorage.getItem('user');
              if (userData) {
                const user = JSON.parse(userData);
                user.profileImage = response.image.url;
                localStorage.setItem('user', JSON.stringify(user));
              }
            }
          },
          error: (error) => {
            console.error('Error al subir imagen:', error);
            this.toastr.error('No se pudo actualizar la imagen de perfil');
          }
        });
    }
  }

  // Método para cargar datos según la pestaña seleccionada
  loadTabData(tab: string) {
    this.isLoading = true;
    
    switch (tab) {
      case 'en-venta':
        this.loadProductsForSale();
        break;
      case 'trueques-pendientes':
        this.loadPendingBarters();
        break;
      // Otros casos...
    }
  }

  // Método específico para cargar productos en venta
  loadProductsForSale() {
    this.isLoading = true;
    
    this.productService.getUserProducts(this.userId).subscribe({
      next: (data) => {
        this.productsForSale = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.toastr.error('No se pudieron cargar tus productos');
        this.isLoading = false;
      }
    });
  }

  // Añadir este método a la clase UserviewbarComponent
  loadPendingBarters(): void {
    this.isLoadingBarters = true;
    
    // Si ya tienes un método para cargar todos los barters, puedes llamarlo
    this.barterService.getBartersByUser(this.userId).subscribe({
      next: (barters) => {
        // Filtrar solo los pendientes
        this.userBartersPending = barters.filter(b => {
          const status = (b.status || '').toLowerCase();
          return status === 'disponible' || status === 'pendiente';
        }).map(b => this.normalizeBarter(b));
        
        this.isLoadingBarters = false;
      },
      error: (error) => {
        console.error('Error al cargar trueques pendientes:', error);
        this.toastr.error('No se pudieron cargar los trueques pendientes');
        this.isLoadingBarters = false;
      }
    });
  }

  // Añadir este método a la clase UserviewbarComponent
  loadUserProfile(): void {
    if (!this.userId) return;
    
    this.isLoading = true; // Agregar indicador de carga
    
    this.userService.getUserProfile().subscribe({
      next: (userData: UserProfileResponse) => {
        console.log('Datos completos de usuario cargados:', userData);
        
        // Actualizar datos de perfil
        this.userName = userData.name || '';
        this.userEmail = userData.email || '';
        this.userPhone = userData.phone || '';
        this.userDepartment = userData.department || '';
        this.userMunicipality = userData.city || '';
        this.userDocumentType = userData.document_type || '';
        this.userDocumentNumber = userData.document_number || '';
        
        // Formatear ubicación para mostrar
        this.userLocation = userData.city && userData.department ? 
          `${userData.city}, ${userData.department}` : 
          (userData.city || userData.department || 'No especificada');
        
        // Actualizar imagen de perfil
        if (userData.profileImage) {
          this.userProfileImage = userData.profileImage;
        } else if (userData.userImages && userData.userImages.length > 0) {
          const mainImage = userData.userImages.find(img => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : userData.userImages[0].url;
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar perfil de usuario:', error);
        this.toastr.error('No se pudo cargar la información del perfil');
        this.isLoading = false;
      }
    });
  }
}

// Definir una interfaz para las notificaciones
interface Notification {
  id_notification: number;
  is_read: boolean;
  entity_type: string;
  entity_id: number;
  type: string;
  action_url?: string;
  title: string;
  message: string;
  created_at: string;
}

// Primero, añade esta interfaz al inicio del archivo o cerca de la interfaz Notification
interface UserImage {
  id: number;
  url: string;
  is_main: boolean;
}

// Añade esta interfaz para tipar la respuesta de getUserProfile
interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  rol: string;
  phone?: string;
  department?: string;
  city?: string;
  document_type?: string;
  document_number?: string;
  profileImage?: string;
  userImages?: UserImage[];
  // otras propiedades que pueda tener
}
