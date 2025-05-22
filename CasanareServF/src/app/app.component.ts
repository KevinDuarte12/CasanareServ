import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InactivityService } from './services/inactivity.service';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { NotificationService } from './services/notification.service';
import { SocketService } from './services/socket.service';
import { ChatWidgetComponent } from './chat-widget/chat-widget.component'; // importa el componente si es standalone
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'CasanareServ';
  private authSubscription: Subscription = new Subscription();
  
  showChatWidget = false;
  chatProductId?: number;
  chatBarterId?: number;
  chatOtherUserName = '';
  chatOtherUserAvatar = '';
  currentUserId?: number;

  constructor(
    private inactivityService: InactivityService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private socketService: SocketService,
    private router: Router // Añade esto
  ) {}

  ngOnInit(): void {
    // Iniciar monitoreo si ya está autenticado
    if (this.authService.isAuthenticated()) {
      this.inactivityService.startMonitoring();
      const userData = this.authService.getUserData();
      if (userData && userData.id) {
        this.notificationService.refreshNotifications(userData.id);
      }
    }

    // Suscribirse a cambios de autenticación
    this.authSubscription = this.authService.authStatusChanged.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.inactivityService.startMonitoring();
      } else {
        this.inactivityService.stopMonitoring();
      }
    });

    // Mantener el chat abierto tras refresh
    if (localStorage.getItem('globalChatOpen') === 'true') {
      // Puedes restaurar los datos del chat desde localStorage si los guardas al abrir
      this.showChatWidget = true;
      // Restaura los datos necesarios aquí si los guardaste
    }

    // El servicio se inicializa automáticamente cuando se inyecta
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.inactivityService.stopMonitoring();
  }

  // Método para abrir el chat desde cualquier parte
  openChat(options: {
    productId?: number,
    barterId?: number,
    otherUserName?: string,
    otherUserAvatar?: string
  }) {
    console.log('⭐ Redirigiendo al chat con:', options);
    
    // En lugar de mostrar el widget, redirige a la página de chat
    this.router.navigate(['/chat'], { 
      queryParams: {
        productId: options.productId,
        barterId: options.barterId,
        otherUserName: options.otherUserName || 'Usuario',
        otherUserAvatar: options.otherUserAvatar
      }
    });
    
    // Puedes mantener el registro en localStorage si deseas
    localStorage.setItem('lastChatParams', JSON.stringify(options));
  }

  closeChatWidget() {
    this.showChatWidget = false;
    localStorage.removeItem('globalChatOpen');
  }
}
