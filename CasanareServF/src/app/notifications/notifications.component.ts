import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { SocketService } from '../services/socket.service'; // Importar nuevo servicio

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: any[] = [];
  unreadCount: number = 0;
  showNotifications: boolean = false;
  private subscriptions: Subscription[] = [];
  
  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private socketService: SocketService, // Inyectar el servicio de sockets
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Suscribirse a las notificaciones
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(data => {
        this.notifications = data;
        console.log('🔔 Notificaciones cargadas:', this.notifications);
      })
    );
    
    // Suscribirse al contador de no leídas
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
        console.log('🔢 Contador actualizado:', this.unreadCount);
      })
    );
    
    // Suscribirse a nuevas notificaciones por socket
    this.subscriptions.push(
      this.socketService.onNewNotification().subscribe(notification => {
        console.log('🔔 Nueva notificación recibida por socket:', notification);
        // Actualizar datos después de recibir una nueva notificación
        const userData = this.authService.getUserData();
        if (userData && userData.id) {
          this.notificationService.refreshNotifications(userData.id);
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  // Mostrar/ocultar dropdown de notificaciones
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    
    // Si abrimos el dropdown, cargar notificaciones recientes
    if (this.showNotifications) {
      const userData = this.authService.getUserData();
      if (userData && userData.id) {
        this.notificationService.refreshNotifications(userData.id);
      }
    }
  }
  
  // Navegar según el tipo de notificación
  navigateTo(notification: any): void {
    // Marcar como leída si no está leída
    if (!notification.is_read) {
      this.markAsRead(null, notification.id_notification);
    }
    
    // Cerrar el dropdown
    this.showNotifications = false;
    
    // Navegar según el tipo de entidad
    if (notification.entity_type === 'barter' && notification.entity_id) {
      console.log('🧭 Navegando a detalle de trueque:', notification.entity_id);
      // Si es un trueque, redirigir al perfil en la sección de notificaciones
      this.router.navigate(['/user-profile'], { 
        queryParams: { 
          tab: 'notificaciones',
          highlight: notification.entity_id 
        }
      });
    } else if (notification.action_url) {
      // Si tiene una URL específica, usarla
      this.router.navigateByUrl(notification.action_url);
    } else if (notification.entity_type === 'product' && notification.entity_id) {
      // Si es un producto, ir a su detalle
      this.router.navigate(['/shop-detail'], { 
        queryParams: { id: notification.entity_id } 
      });
    }
  }
  
  // Marcar notificación como leída
  markAsRead(event: Event | null, id: number): void {
    if (event) {
      event.stopPropagation();
    }
    
    this.notificationService.markAsRead(id).subscribe();
  }
  
  // Marcar todas como leídas
  markAllAsRead(): void {
    const userData = this.authService.getUserData();
    if (userData && userData.id) {
      this.notificationService.markAllAsRead(userData.id).subscribe();
    }
  }
  
  // Eliminar notificación
  deleteNotification(event: Event, id: number): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(id).subscribe();
  }
  
  // Formatear tiempo relativo
  formatTime(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Hace ${diffDays}d`;
    
    return date.toLocaleDateString();
  }
}
