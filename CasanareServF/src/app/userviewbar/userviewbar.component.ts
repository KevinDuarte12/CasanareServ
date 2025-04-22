import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { UserService } from '../services/user.services';
import { ImageService } from '../services/image.service';
import { ToastrService } from 'ngx-toastr';
import { Image } from '../interfaces/image'; // Importa la interfaz Image correctamente

@Component({
  selector: 'app-userviewbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './userviewbar.component.html',
  styleUrl: './userviewbar.component.css'
})
export class UserviewbarComponent implements OnInit {
  // Propiedades para almacenar la información del usuario
  userName: string = '';
  userEmail: string = '';
  userProfileImage: string | null = null;
  defaultProfileImage: string = 'img/perfil3.png'; // Imagen por defecto
  userInitials: string = '';
  isLoggedIn: boolean = false;
  userId: number | null = null;
  isLoading: boolean = true;

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private userService: UserService,
    private imageService: ImageService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Verificar si el usuario está autenticado
    this.isLoggedIn = this.authService.isAuthenticated();
    
    if (!this.isLoggedIn) {
      this.isLoading = false;
      return;
    }
    
    // Cargar datos del usuario
    this.loadUserData();
    
    // Inicializar las pestañas después de que el DOM esté listo
    setTimeout(() => {
      this.initTabsNavigation();
      this.updateNotificationCounters();
    }, 100);
  }

  /**
   * Carga los datos del usuario desde los servicios
   */
  loadUserData(): void {
    // Primero intentamos obtener datos del TokenService (más rápido)
    const userData = this.tokenService.getUserData();
    
    if (userData) {
      this.userId = userData.id;
      this.userName = userData.name || 'Usuario';
      this.userEmail = userData.email || 'usuario@example.com';
      
      // Intentar obtener imagen de perfil desde localStorage primero
      if (userData.profileImage) {
        this.userProfileImage = userData.profileImage;
      } else if (userData.userImages && userData.userImages.length > 0) {
        // Buscar la imagen principal
        const mainImage = userData.userImages.find((img: Image) => img.is_main);
        this.userProfileImage = mainImage ? mainImage.url : userData.userImages[0].url;
      } else {
        // Si no hay imagen, usar la imagen por defecto
        this.userProfileImage = this.defaultProfileImage;
      }
      
      // Generar iniciales para el avatar si no hay imagen de perfil
      this.generateUserInitials(this.userName);
      
      console.log('✅ Datos de usuario cargados desde cache:', {
        name: this.userName,
        email: this.userEmail,
        hasProfileImage: !!this.userProfileImage
      });
      
      this.isLoading = false;
    }
    
    // Luego hacemos una petición para obtener los datos más actualizados del servidor
    this.userService.getUserInfo().subscribe({
      next: (updatedUserData) => {
        if (updatedUserData) {
          this.userId = updatedUserData.id;
          this.userName = updatedUserData.name || this.userName;
          this.userEmail = updatedUserData.email || this.userEmail;
          
          // Intentar obtener la imagen de perfil
          if (updatedUserData.profileImage) {
            this.userProfileImage = updatedUserData.profileImage;
          } else if (updatedUserData.userImages && updatedUserData.userImages.length > 0) {
            // Buscar la imagen principal
            const mainImage = updatedUserData.userImages.find((img: Image) => img.is_main);
            this.userProfileImage = mainImage ? mainImage.url : updatedUserData.userImages[0].url;
          } else {
            // Si no hay imagen, usar la imagen por defecto
            this.userProfileImage = this.defaultProfileImage;
          }
          
          // Actualizar datos en el AuthService para mantener consistencia
          this.authService.updateUserData({
            ...updatedUserData,
            profileImage: this.userProfileImage
          });
          
          // Generar iniciales actualizadas
          this.generateUserInitials(this.userName);
          
          console.log('✅ Datos de usuario actualizados desde API:', {
            name: this.userName,
            email: this.userEmail,
            hasProfileImage: !!this.userProfileImage
          });
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error al obtener datos actualizados del usuario:', err);
        // Asegurar que tengamos una imagen incluso si hay error
        if (!this.userProfileImage) {
          this.userProfileImage = this.defaultProfileImage;
        }
        this.isLoading = false;
      }
    });
  }

  /**
   * Genera las iniciales del usuario para el avatar
   */
  generateUserInitials(name: string): void {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        this.userInitials = `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      } else if (nameParts.length === 1) {
        this.userInitials = nameParts[0].substring(0, 2).toUpperCase();
      }
    } else {
      this.userInitials = 'US'; // Usuario sin nombre
    }
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
   * Inicializa la navegación por pestañas usando JavaScript
   */
  private initTabsNavigation(): void {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Desactivar todas las pestañas
        tabs.forEach(t => t.classList.remove('active'));
        
        // Ocultar todos los contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        // Activar la pestaña seleccionada
        tab.classList.add('active');
        
        // Mostrar el contenido correspondiente
        const tabId = tab.getAttribute('data-tab');
        if (tabId) {
          const contentElement = document.getElementById(tabId);
          if (contentElement) {
            contentElement.classList.add('active');
          }
        }
      });
    });
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
   * Maneja errores cuando la imagen de perfil no se puede cargar
   */
  handleProfileImageError(event: any): void {
    console.warn('Error al cargar la imagen de perfil, usando imagen predeterminada');
    event.target.src = this.defaultProfileImage;
  }
}
