import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityService } from './services/inactivity.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { NotificationService } from './services/notification.service';
import { SocketService } from './services/socket.service';
import { Router } from '@angular/router';
/**
 * 🚀 COMPONENTE RAÍZ DE CASANARESERV
 * Componente principal que gestiona el ciclo de vida de la aplicación
 * Maneja autenticación, notificaciones, inactividad y sistema de chat global
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  // 📝 PROPIEDADES BÁSICAS DE LA APLICACIÓN
  title = 'CasanareServ';                                   // Título de la aplicación
  private authSubscription: Subscription = new Subscription(); // Suscripción a cambios de auth
  // 💬 PROPIEDADES DEL SISTEMA DE CHAT GLOBAL
  showChatWidget = false;                                   // Controla visibilidad del widget
  chatProductId?: number;                                   // ID del producto en chat
  chatBarterId?: number;                                    // ID del trueque en chat
  chatOtherUserName = '';                                   // Nombre del otro usuario
  chatOtherUserAvatar = '';                                 // Avatar del otro usuario
  currentUserId?: number;                                   // ID del usuario actual
  /**
   * 🏗️ CONSTRUCTOR CON INYECCIÓN DE DEPENDENCIAS
   * Inicializa todos los servicios necesarios para la aplicación
   */
  constructor(
    private inactivityService: InactivityService,           // Servicio de inactividad
    private notificationService: NotificationService,       // Servicio de notificaciones
    private authService: AuthService,                       // Servicio de autenticación
    private socketService: SocketService,                   // Servicio de WebSockets
    private router: Router                                  // Router de Angular
  ) {}
  /**
   * 🔄 INICIALIZACIÓN DEL COMPONENTE
   * Configura servicios y suscripciones al cargar la aplicación
   */
  ngOnInit(): void {
    // 🔐 INICIALIZACIÓN PARA USUARIOS AUTENTICADOS
    // Verificar si ya hay sesión activa al cargar la app
    if (this.authService.isAuthenticated()) {
      this.inactivityService.startMonitoring();            // Iniciar monitoreo de inactividad
      const userData = this.authService.getUserData();
      if (userData && userData.id) {
        this.notificationService.refreshNotifications(userData.id); // Cargar notificaciones
      }
    }
    // 📡 SUSCRIPCIÓN A CAMBIOS DE AUTENTICACIÓN
    // Reaccionar cuando el usuario se loguea o desloguea
    this.authSubscription = this.authService.authStatusChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.inactivityService.startMonitoring();          // Activar monitoreo al login
      } else {
        this.inactivityService.stopMonitoring();           // Desactivar al logout
      }
    });
    // 💾 RESTAURAR ESTADO DEL CHAT TRAS REFRESH
    // Mantener el chat abierto si estaba activo antes de recargar
    if (localStorage.getItem('globalChatOpen') === 'true') {
      this.showChatWidget = true;                          // Restaurar visibilidad
      // Posibilidad de restaurar datos adicionales del localStorage
    }
    // 🔌 SERVICIOS AUTO-INICIALIZADOS
    // SocketService se inicializa automáticamente al inyectarse
  }
  /**
   * 🧹 LIMPIEZA AL DESTRUIR EL COMPONENTE
   * Cancelar suscripciones y detener servicios para evitar memory leaks
   */
  ngOnDestroy(): void {
    // 📡 CANCELAR SUSCRIPCIONES
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();                 // Evitar memory leaks
    }
    // ⏹️ DETENER SERVICIOS ACTIVOS
    this.inactivityService.stopMonitoring();              // Parar monitoreo de inactividad
  }
  /**
   * 💬 ABRIR CHAT DESDE CUALQUIER PARTE DE LA APLICACIÓN
   * Método público para iniciar conversaciones desde productos o trueques
   * 
   * @param options - Configuración del chat a abrir
   */
  openChat(options: {
    productId?: number,                                    // ID del producto (opcional)
    barterId?: number,                                     // ID del trueque (opcional)
    otherUserName?: string,                                // Nombre del interlocutor
    otherUserAvatar?: string                               // Avatar del interlocutor
  }) {
    console.log('⭐ Redirigiendo al chat con:', options);
    // 🚀 NAVEGACIÓN A PÁGINA DE CHAT
    // Redirigir a componente de chat con parámetros
    this.router.navigate(['/chat'], { 
      queryParams: {
        productId: options.productId,
        barterId: options.barterId,
        otherUserName: options.otherUserName || 'Usuario',
        otherUserAvatar: options.otherUserAvatar
      }
    });
    // 💾 PERSISTIR PARÁMETROS DEL CHAT
    // Guardar últimos parámetros para posible restauración
    localStorage.setItem('lastChatParams', JSON.stringify(options));
  }
  /**
   * ❌ CERRAR WIDGET DE CHAT
   * Oculta el chat y limpia el estado persistido
   */
  closeChatWidget() {
    this.showChatWidget = false;                           // Ocultar widget
    localStorage.removeItem('globalChatOpen');             // Limpiar estado guardado
  }
}