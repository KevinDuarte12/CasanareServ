import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/productos.services';
import { BarterService } from '../services/barter.service';
import { EditProductComponent } from '../edit-product/edit-product.component';
import { EditBarterComponent } from '../edit-barter/edit-barter.component';
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
    EditBarterComponent
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
  notifications: any[] = [];
  unreadNotificationCount: number = 0;
  isLoadingNotifications: boolean = false;

  constructor(
    private authService: AuthService,
    private productService: ProductService,
    private barterService: BarterService,
    private router: Router,
    private toastr: ToastrService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isAuthenticated();

    if (this.isLoggedIn) {
      this.loadUserData();
      this.activeTab = 'en-venta';
      // Cargar contador de notificaciones no leídas
      this.updateUnreadCount();
    } else {
      this.isLoading = false;
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

  // Cambia la pestaña activa y carga los datos correspondientes
  changeTab(tabId: string): void {
    this.activeTab = tabId;

    // Cargar datos específicos según la pestaña
    if (tabId === 'en-venta' || tabId === 'trueques-pendientes') {
      this.loadUserProductsForSale();
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
  handleBarterModalClose(refresh: boolean): void {
    this.showBarterModal = false;
    this.selectedOwnProduct = null;
    this.selectedTargetProduct = null;
    this.barterComment = '';
    this.barterAddedValue = 0;
    
    if (refresh) {
      this.loadUserProductsForSale();
      this.toastr.success('Operación de trueque completada con éxito');
    }
  }

  // Cargar notificaciones del usuario
  loadUserNotifications(): void {
    if (!this.userId) return;
    
    this.isLoadingNotifications = true;
    
    this.notificationService.loadUserNotifications(this.userId).subscribe({
      next: (response) => {
        this.notifications = response.notifications || [];
        this.isLoadingNotifications = false;
        this.updateUnreadCount();
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

  // Navegar al detalle de la entidad relacionada
  navigateToEntity(notification: any): void {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      this.markNotificationAsRead(notification.id_notification);
    }
    
    // Navegar según el tipo de entidad
    if (notification.action_url) {
      this.router.navigate([notification.action_url]);
    } else if (notification.entity_type === 'product' && notification.entity_id) {
      this.router.navigate(['/product', notification.entity_id]);
    } else if (notification.entity_type === 'barter' && notification.entity_id) {
      this.router.navigate(['/barter', notification.entity_id]);
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
}