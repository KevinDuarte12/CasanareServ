import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-userviewbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    EditProductComponent,
    EditBarterComponent,
    BarterDetailsComponent  // Añadir esta línea
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
  public emailNotificationsEnabled: boolean = true;
  public pushNotificationsEnabled: boolean = true;

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

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private barterService: BarterService,
    private router: Router,
    private toastr: ToastrService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    // Inicializar el formulario de trueque
    this.truequeForm = this.fb.group({
      selectedProduct: ['', Validators.required],
      notes: ['', Validators.maxLength(500)]
    });
  }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();

    if (this.isLoggedIn) {
      this.loadUserData();
      this.loadUserNotifications(); // Asegurarse que esto se llama
      this.updateUnreadCount();
    } else {
      this.isLoading = false;
    }

    // Suscripción a los parámetros con soporte para destacar notificaciones
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      const action = params['action'];
      const highlightNotifId = params['highlight'];

      if (tab) {
        this.activeTab = tab;

        if (tab === 'notificaciones' && highlightNotifId) {
          // Destacar la notificación específica
          setTimeout(() => {
            this.highlightNotification(highlightNotifId);
          }, 500); // Dar tiempo a que carguen las notificaciones
        }
      }

      if (tab === 'trueques' && action === 'proponer') {
        this.showEditBarter = true;
      }
    });
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

  // Carga información del usuario desde localStorage
  loadUserData(): void {
    const userData = localStorage.getItem('user');

    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.userId = user.id || 0;
        this.userName = user.name || 'Usuario';
        this.userEmail = user.email || '';
        this.userInitials = this.generateUserInitials(user.name || '');

        if (user.profileImage && user.profileImage.trim() !== '') {
          this.userProfileImage = user.profileImage;
        } else {
          this.userProfileImage = this.defaultProfileImage;
        }

        // Cargar productos del usuario
        this.loadUserProductsForSale();

      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        this.toastr.error('Error al cargar datos del usuario');
        this.userProfileImage = this.defaultProfileImage;
      } finally {
        this.isLoading = false;
      }
    } else {
      this.isLoading = false;
      this.toastr.warning('No se encontraron datos del usuario');
      this.userProfileImage = this.defaultProfileImage;
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

  // Maneja errores de carga de imágenes de productos
  handleImageError(event: Event, index: number): void {
    const img = event.target as HTMLImageElement;
    const productId = this.productsForSale[index]?.id_product || index;
    img.src = this.getRandomFallbackImage(productId);
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

  // Abre el modal para editar un producto existente
  editProduct(productId: number): void {
    this.editProductId = productId;
    this.showProductModal = true;
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
    if (product.productImages && product.productImages.length > 0) {
      return product.productImages[0].url;
    }

    if (product.images && product.images.length > 0) {
      return product.images[0].url;
    }

    if (product.id_product) {
      return this.getRandomFallbackImage(product.id_product);
    }

    return 'img/pc-gamer.jpg';
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

    if (!this.userId || !this.targetProductId || !this.targetProductOwnerId) {
      this.toastr.error('Información incompleta para proponer trueque');
      return;
    }

    const barterRequest: BarterRequest = {
      id_prod_offer: this.truequeForm.value.selectedProduct,
      id_prod_request: this.targetProductId,
      id_user_offer: this.userId,
      id_user_receiving: this.targetProductOwnerId,
      status: "pendiente", // Usar valor literal para asegurar el tipo correcto
      notes: this.truequeForm.value.notes || ''
    };

    this.barterService.createBarter(barterRequest).subscribe({
      next: (response) => {
        this.toastr.success('Propuesta de trueque enviada con éxito');
        this.showProponerTrueque = false;
        this.truequeForm.reset();
        // No se puede usar loadBartersForUser() porque no existe este método
        this.changeTab('trueques'); // Para actualizar la lista de trueques
      },
      error: (error) => {
        console.error('Error al enviar propuesta de trueque:', error);
        this.toastr.error('Error al enviar la propuesta de trueque');
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

    this.barterService.getBartersByUser(this.userId).subscribe({
      next: (barters) => {
        this.userBarters = barters;
        
        // Trueques pendientes - aquellos iniciados por el usuario o dirigidos a él
        // que están en espera, aceptados pero no aprobados por admin
        this.userBartersPending = barters.filter(b => {
          const isPendingOrAccepted = ['pendiente', 'aceptado', 'pendiente_admin'].includes(b.status);
          const isUserInvolved = b.id_user_offer === this.userId || b.id_user_receiving === this.userId;
          return isPendingOrAccepted && isUserInvolved;
        });
        
        // Trueques aprobados por admin
        this.userBartersCompleted = barters.filter(b => {
          if (!b.status) return false;
          
          const statusStr = String(b.status).toLowerCase();
          return statusStr.includes('aprob') || 
                 statusStr.includes('aprov') || 
                 statusStr === 'aprobado_admin' ||
                 statusStr === 'completado';
        });
        
        // Trueques recibidos - propuestas de otros usuarios hacia ti que están pendientes
        this.userBartersReceived = barters.filter(b => 
          b.id_user_receiving === this.userId && 
          ['pendiente'].includes(b.status)
        );
        
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
    if (!status) return 'Desconocido';
    
    const statusLower = String(status).toLowerCase();
    
    // Mapa de estados
    const statusMap: {[key: string]: string} = {
      'pendiente': 'En espera',
      'aceptado': 'Pendiente por admin',
      'pendiente_admin': 'Pendiente por admin',
      'rechazado': 'Rechazado',
      'cancelado': 'Cancelado'
    };
    
    // Si es alguna variación de "aprobado"
    if (statusLower.includes('aprob') || statusLower.includes('aprov') || statusLower === 'aprobado_admin') {
      return 'Aprobado por admin';
    }
    
    if (statusLower === 'completado') {
      return 'Completado';
    }
    
    return statusMap[statusLower] || 'Desconocido';
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
  public updateProfileImage(): void {
    // Implementar lógica para actualizar imagen
  }

  public editField(field: string): void {
    // Implementar lógica para editar campo
  }

  public changePassword(): void {
    // Implementar lógica para cambiar contraseña
  }

  public enable2FA(): void {
    // Implementar lógica para activar 2FA
  }

  // public toggleEmailNotifications(): void {
  //   this.emailNotificationsEnabled = !this.emailNotificationsEnabled;
    
  // }

  // public togglePushNotifications(): void {
  //   this.pushNotificationsEnabled = !this.pushNotificationsEnabled;
  
  // }

  // public deactivateAccount(): void {

  // }
}

// Definir una interfaz para las notificaciones correctamente
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