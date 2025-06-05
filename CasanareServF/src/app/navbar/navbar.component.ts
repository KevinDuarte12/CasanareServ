import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.services';
import { CartService } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Image } from '../interfaces/image';
import { ToastrService } from 'ngx-toastr';
import { NotificationsComponent } from '../notifications/notifications.component'; // Importar el componente
import { SocketService } from '../services/socket.service'; // Asegúrate de importar el servicio de sockets
import { NotificationService } from '../services/notification.service'; // Asegúrate de importar el servicio de notificaciones
import { ChatService } from '../services/chat.service'; // Importar el servicio de chat

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationsComponent], // Añadir el componente a los imports
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isLoggedIn: boolean = false;
  userName: string = '';
  userProfileImage: string | null = null;
  defaultProfileImage: string = '/img/perfil3.png'; // Actualiza la ruta a tu imagen predeterminada
  notificationCount: number = 0;
  isUserMenuOpen = false;
  isMenuCollapsed = true;
  cartItemCount: number = 0; // Contador del carrito
  previousAuthState: boolean = false; // Para detectar cambios en el estado de autenticación
  unreadMessagesCount: number = 0;
  totalUnreadCount: number = 0; // Suma de notificaciones + mensajes
  isMoreOptionsMenuOpen = false; // ✅ AGREGAR esta línea
  // En navbar.component.ts

  // Variables para el menú de categorías
  isCategoriesMenuOpen = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cartService: CartService, // Inyectar el servicio del carrito
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService, // Inyectar ToastrService
    private socketService: SocketService, // Inyectar el servicio de sockets
    private notificationService: NotificationService, // Inyectar el servicio de notificaciones
    private chatService: ChatService // Importar el servicio de chat
  ) {}
  
  ngOnInit(): void {
    // ✅ VERIFICAR autenticación antes de suscripciones
    this.previousAuthState = this.authService.isAuthenticated();
    this.checkAuthStatus();
    
    // ✅ SUSCRIBIRSE a cambios de autenticación PRIMERO
    this.authService.authStatusChanged.subscribe((isAuthenticated) => {
      const currentAuthState = isAuthenticated;
      
      if (currentAuthState && !this.previousAuthState) {
        this.toastr.success('¡Bienvenido de nuevo!', 'Sesión iniciada');
        // ✅ SOLO AHORA cargar datos si está autenticado
        this.loadUnreadMessagesCount();
      } else if (!currentAuthState && this.previousAuthState) {
        this.toastr.info('Has cerrado sesión correctamente', 'Sesión finalizada');
        // ✅ LIMPIAR datos cuando se desautentica
        this.unreadMessagesCount = 0;
        this.notificationCount = 0;
        this.totalUnreadCount = 0;
      }
      
      this.previousAuthState = currentAuthState;
      this.checkAuthStatus();
    });
    
    // ✅ MODIFICAR: Solo suscribirse a carrito si está autenticado
    this.cartService.cartItems$.subscribe(items => {
      if (!this.authService.isAuthenticated()) {
        this.cartItemCount = 0;
      } else {
        this.updateCartCount(items);
      }
      this.cdr.detectChanges();
    });
    
    // ✅ MODIFICAR: Solo suscribirse a sockets si está autenticado
    if (this.authService.isAuthenticated()) {
      this.socketService.on('unread_messages_count', (data: {count: number}) => {
        this.unreadMessagesCount = data.count;
        this.totalUnreadCount = this.notificationCount + this.unreadMessagesCount;
      });
      
      this.notificationService.unreadCount$.subscribe(count => {
        this.notificationCount = count;
        this.totalUnreadCount = count + this.unreadMessagesCount;
      });
      
      this.loadUnreadMessagesCount();
    }
  }
  
  // Método para cargar el carrito (reemplaza loadCartItemCount)
  loadCart(): void {
    if (this.authService.isAuthenticated()) {
      this.cartService.getCart().subscribe({
        next: (cart) => {
          if (cart && cart.items) {
            this.updateCartCount(cart.items);
          }
        },
        error: (error: any) => {
          console.error('Error al cargar el carrito:', error);
          this.cartItemCount = 0;
        }
      });
    } else {
      this.cartItemCount = 0;
    }
  }
  
  checkAuthStatus(): void {
    this.isLoggedIn = this.authService.isAuthenticated();
    
    if (this.isLoggedIn) {
      // Obtener información del usuario desde localStorage
      const userData = this.authService.getUserData();
      if (userData) {
        this.userName = userData.name || 'Usuario';
        
        // Verificar si hay una imagen de perfil en los datos del usuario
        if (userData.userImages && userData.userImages.length > 0) {
          // Buscar la imagen principal - aquí se corrige el problema de tipado
          const mainImage = userData.userImages.find((img: Image) => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : userData.userImages[0].url;
        } else if (userData.profileImage) {
          this.userProfileImage = userData.profileImage;
        } else {
          // Si no hay datos de imagen, cargar el perfil completo
          this.loadUserProfile();
        }
      } else {
        // Si no hay datos en localStorage, cargarlos del backend
        this.loadUserProfile();
      }
      
      // Cargar carrito cuando el usuario está autenticado
      this.loadCart();
    } else {
      this.userProfileImage = null;
      this.userName = '';
      // Asegurarse de que el contador del carrito sea 0
      this.cartItemCount = 0;
      // Forzar la detección de cambios para actualizar la vista
      this.cdr.detectChanges();
    }
  }
  
  // Modificar el método loadUserProfile con cambios mínimos

  loadUserProfile(): void {
    console.log('Cargando perfil del usuario desde el servidor...');
    
    this.userService.getUserProfile().subscribe({
      next: (user) => {
        console.log('Datos del usuario recibidos:', user);
        
        // Guardar el nombre con verificación más estricta
        this.userName = user && user.name ? user.name : 'Usuario';
        
        // El resto se mantiene igual
        if (user.userImages && user.userImages.length > 0) {
          const mainImage = user.userImages.find((img: Image) => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : user.userImages[0].url;
          console.log('Imagen de perfil encontrada:', this.userProfileImage);
        } else if (user.profileImage) {
          this.userProfileImage = user.profileImage;
        } else {
          console.log('Usuario sin imagen de perfil');
          this.userProfileImage = null;
        }
        
        // Asegurarse de guardar correctamente los datos en localStorage
        this.authService.updateUserData({
          ...user,
          profileImage: this.userProfileImage
        });
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error obteniendo información del usuario:', err);
      }
    });
  }
  
  // Modificar el método logout
  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    // Resetear el contador explícitamente
    this.cartItemCount = 0;
    this.cdr.detectChanges();
    
    // Mostrar mensaje de despedida
    this.toastr.info(`¡Hasta pronto, ${this.userName}!`, 'Sesión cerrada');
    
    // Llamar al logout del servicio
    this.authService.logout();
    
    // Restablecer el estado local
    this.isLoggedIn = false;
    this.userName = '';
    this.userProfileImage = null;
    this.notificationCount = 0;
    this.isUserMenuOpen = false;
    this.isMoreOptionsMenuOpen = false; // ✅ AGREGAR esta línea
    
    // Asegurarse de que el contador sea 0
    setTimeout(() => {
      this.cartItemCount = 0;
      this.cdr.detectChanges();
    }, 0);
    
    // Navegar a la página de inicio
    this.router.navigate(['/']);
  }
  
  // Método para obtener notificaciones (opcional)
  getNotifications(): void {
    this.notificationCount = 0;
  }

  // Reemplaza el método toggleMenu que usa jQuery
  toggleMenu(): void {
    this.isMenuCollapsed = !this.isMenuCollapsed;
    
    // Cerrar menús desplegables cuando se cierra el menú principal
    if (this.isMenuCollapsed) {
      this.isUserMenuOpen = false;
      this.isMoreOptionsMenuOpen = false; // ✅ AGREGAR esta línea
    }
    
    this.cdr.detectChanges();
  }

  // Método para alternar el menú de usuario
  toggleUserMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.isUserMenuOpen = !this.isUserMenuOpen;
    
    // ✅ AGREGAR: Cerrar el menú "Más opciones" si está abierto
    if (this.isUserMenuOpen) {
      this.isMoreOptionsMenuOpen = false;
    }
    
    this.cdr.detectChanges();
    
    // Agregar un manejador de clics en el documento para cerrar el menú cuando se hace clic afuera
    if (this.isUserMenuOpen) {
      setTimeout(() => {
        const documentClickHandler = (e: MouseEvent) => {
          const userMenu = document.querySelector('.user-menu-fix');
          if (userMenu && !userMenu.contains(e.target as Node)) {
            this.isUserMenuOpen = false;
            this.cdr.detectChanges();
            document.removeEventListener('click', documentClickHandler);
          }
        };
        
        document.addEventListener('click', documentClickHandler);
      }, 0);
    }
  }

  // ✅ AGREGAR este método después del método toggleUserMenu():
  toggleMoreOptionsMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isMoreOptionsMenuOpen = !this.isMoreOptionsMenuOpen;
    
    // Cerrar otros menús si están abiertos
    if (this.isMoreOptionsMenuOpen) {
      this.isUserMenuOpen = false;
    }
    
    this.cdr.detectChanges();
    
    // Agregar listener para cerrar al hacer clic fuera
    if (this.isMoreOptionsMenuOpen) {
      setTimeout(() => {
        const documentClickHandler = (e: MouseEvent) => {
          const moreOptionsMenu = document.querySelector('.more-options-menu');
          if (moreOptionsMenu && !moreOptionsMenu.contains(e.target as Node)) {
            this.isMoreOptionsMenuOpen = false;
            this.cdr.detectChanges();
            document.removeEventListener('click', documentClickHandler);
          }
        };
        
        document.addEventListener('click', documentClickHandler);
      }, 0);
    }
  }

  // ✅ AGREGAR este método después del anterior:
  closeMoreOptionsMenu(): void {
    this.isMoreOptionsMenuOpen = false;
    this.cdr.detectChanges();
  }

  // Método para cerrar el menú de usuario al hacer clic fuera
  closeUserMenu = (): void => {
    this.isUserMenuOpen = false;
    this.cdr.detectChanges();
    document.removeEventListener('click', this.closeUserMenu);
  }
  
  // Método para obtener la imagen de perfil
  getUserProfileImage(): string {
    // Si el usuario tiene una imagen de perfil, mostrarla
    if (this.userProfileImage) {
      return this.userProfileImage;
    }
    
    // Si no tiene imagen, mostrar la predeterminada
    return this.defaultProfileImage;
  }
  
  // Método para manejar errores de carga de imágenes
  handleProfileImageError(event: any): void {
    console.warn('Error al cargar la imagen de perfil, usando imagen predeterminada');
    event.target.src = this.defaultProfileImage;
  }

  // Modificar el método updateCartCount
  private updateCartCount(items: any[]): void {
    if (!this.authService.isAuthenticated()) {
      this.cartItemCount = 0;
    } else if (Array.isArray(items)) {
      this.cartItemCount = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
    } else {
      this.cartItemCount = 0;
    }
    this.cdr.detectChanges();
  }

  // Método para cargar los mensajes no leídos
  loadUnreadMessagesCount(): void {
    // ✅ MODIFICAR: Verificar autenticación antes de cargar
    if (!this.authService.isAuthenticated()) {
      console.log('🔇 Usuario no autenticado, no cargando mensajes');
      this.unreadMessagesCount = 0;
      return;
    }
    
    const userId = this.authService.getUserData()?.id;
    if (userId) {
      this.chatService.getUnreadMessagesCount(userId).subscribe({
        next: (count) => {
          this.unreadMessagesCount = count;
          this.totalUnreadCount = this.notificationCount + this.unreadMessagesCount;
        },
        error: (error) => {
          // ✅ NO mostrar errores 401 durante logout
          if (error.status !== 401) {
            console.error('Error al cargar mensajes no leídos:', error);
          }
        }
      });
    }
  }

  goToCart(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Debes iniciar sesión para ver tu carrito', 'Acceso requerido');
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/cart']);
  }

  // Método para ir a la sección de mensajes
  goToMessages(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Debes iniciar sesión para ver tus mensajes', 'Acceso requerido');
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/user-profile'], { queryParams: { tab: 'mensajes' } });
  }

  // Método para toggle del menú de categorías
  toggleCategoriesMenu(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.isCategoriesMenuOpen = !this.isCategoriesMenuOpen;
    
    // Cerrar otros menús si están abiertos
    this.isUserMenuOpen = false;
    this.isMoreOptionsMenuOpen = false;
  }

  // Método para cerrar el menú de categorías
  closeCategoriesMenu() {
    this.isCategoriesMenuOpen = false;
  }

  // ACTUALIZAR el método goToCategory existente
  goToCategory(category: string) {
    console.log('Navegando a:', category);
    this.closeCategoriesMenu();
    
    // Navegación específica según la categoría
    switch(category) {
      case 'productos':
        // Navegar a tienda con tab de productos
        this.router.navigate(['/shop'], { 
          queryParams: { tab: 'products' }
        });
        break;
        
      case 'trueques':
        // Navegar a tienda con tab de trueques
        this.router.navigate(['/shop'], { 
          queryParams: { tab: 'barters' }
        });
        break;
        
      case 'servicios':
        // ✅ ACTUALIZAR: Navegar a tienda con tab de servicios
        this.router.navigate(['/shop'], { 
          queryParams: { tab: 'services' }
        });
        break;
        
      case 'subasta':
        // ✅ ACTUALIZAR: Navegar a tienda con tab de subastas
        this.router.navigate(['/shop'], { 
          queryParams: { tab: 'auctions' }
        });
        break;
        
      default:
        // Por defecto ir a tienda
        this.router.navigate(['/shop']);
        break;
    }
  }

  // Agregar al método de cerrar menús cuando se hace click fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    this.isUserMenuOpen = false;
    this.isMoreOptionsMenuOpen = false;
    this.isCategoriesMenuOpen = false; // Agregar esta línea
  }
}