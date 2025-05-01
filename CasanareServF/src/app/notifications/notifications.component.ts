import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';

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
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Suscribirse a las notificaciones
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(data => {
        this.notifications = data;
      })
    );
    
    // Suscribirse al contador de no leídas
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
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
    
    // Navegar según el tipo de entidad
    if (notification.action_url) {
      this.router.navigateByUrl(notification.action_url);
    } else if (notification.entity_type === 'barter' && notification.entity_id) {
      this.router.navigate(['/trueque', notification.entity_id]);
    } else if (notification.entity_type === 'product' && notification.entity_id) {
      this.router.navigate(['/producto', notification.entity_id]);
    }
    
    this.showNotifications = false;
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
