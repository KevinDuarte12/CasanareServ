import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.services';
import { CartService } from '../services/cart.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Image } from '../interfaces/image';
import { ToastrService } from 'ngx-toastr';
import { NotificationsComponent } from '../notifications/notifications.component'; // Importar el componente

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
  defaultProfileImage: string = 'img/perfil3.png'; // Actualiza la ruta a tu imagen predeterminada
  notificationCount: number = 0;
  isUserMenuOpen = false;
  isMenuCollapsed = true;
  cartItemCount: number = 0; // Contador del carrito
  previousAuthState: boolean = false; // Para detectar cambios en el estado de autenticación
  
  constructor(
    private authService: AuthService,
    private userService: UserService,
    private cartService: CartService, // Inyectar el servicio del carrito
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService // Inyectar ToastrService
  ) {}
  
  ngOnInit(): void {
    // Guardar el estado inicial de autenticación
    this.previousAuthState = this.authService.isAuthenticated();
    this.checkAuthStatus();
    
    // Suscribirse a cambios en la autenticación
    this.authService.authStatusChanged.subscribe(() => {
      // Verificar si el estado cambió para mostrar el mensaje adecuado
      const currentAuthState = this.authService.isAuthenticated();
      
      if (currentAuthState && !this.previousAuthState) {
        // Cambió de no autenticado a autenticado
        this.toastr.success('¡Bienvenido de nuevo!', 'Sesión iniciada');
      } else if (!currentAuthState && this.previousAuthState) {
        // Cambió de autenticado a no autenticado
        this.toastr.info('Has cerrado sesión correctamente', 'Sesión finalizada');
      }
      
      // Actualizar el estado anterior
      this.previousAuthState = currentAuthState;
      this.checkAuthStatus();
    });
    
    // Modificar la suscripción al carrito
    this.cartService.cartItems$.subscribe(items => {
      if (!this.authService.isAuthenticated()) {
        this.cartItemCount = 0;
      } else {
        this.updateCartCount(items);
      }
      this.cdr.detectChanges();
    });
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
  
  loadUserProfile(): void {
    this.userService.getUserProfile().subscribe({  // Cambiar getUserInfo por getUserProfile
      next: (user) => {
        this.userName = user.name || 'Usuario';
        
        // Buscar la imagen de perfil - aquí también se corrige el problema de tipado
        if (user.userImages && user.userImages.length > 0) {
          // Buscar primero una imagen marcada como principal
          const mainImage = user.userImages.find((img: Image) => img.is_main);
          this.userProfileImage = mainImage ? mainImage.url : user.userImages[0].url;
          console.log('Imagen de perfil encontrada:', this.userProfileImage);
        } else if (user.profileImage) {
          this.userProfileImage = user.profileImage;
        } else {
          console.log('Usuario sin imagen de perfil');
          this.userProfileImage = null;
        }
        
        // Actualizar datos en el AuthService
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
    this.cdr.detectChanges();
  }

  // Método para alternar el menú de usuario
  toggleUserMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation(); // Importante para evitar cierre inmediato
    
    this.isUserMenuOpen = !this.isUserMenuOpen;
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
}
