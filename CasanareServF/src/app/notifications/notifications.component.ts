import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  notifications: any[] = [];
  unreadCount = 0;
  showNotifications = false;
  userId: number = 0;
  
  constructor(
    private notificationService: NotificationService,
    private router: Router
  ) { }
  
  ngOnInit() {
    // Obtener el ID del usuario del localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.userId = user.id;
      
      // Cargar notificaciones iniciales
      this.refreshNotifications();
      
      // Suscribirse a cambios en las notificaciones
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
      });
      
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      });
    }
  }
  
  refreshNotifications() {
    if (this.userId) {
      this.notificationService.refreshNotifications(this.userId);
    }
  }
  
  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.refreshNotifications();
    }
  }
  
  markAsRead(event: Event, notificationId: number) {
    event.stopPropagation();
    this.notificationService.markAsRead(notificationId).subscribe(() => {
      this.refreshNotifications();
    });
  }
  
  markAllAsRead() {
    this.notificationService.markAllAsRead(this.userId).subscribe(() => {
      this.refreshNotifications();
    });
  }
  
  deleteNotification(event: Event, notificationId: number) {
    event.stopPropagation();
    this.notificationService.deleteNotification(notificationId).subscribe(() => {
      this.refreshNotifications();
    });
  }
  
  navigateTo(notification: any) {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id_notification).subscribe();
    }
    
    // Navegar a la URL de la notificación si tiene una
    if (notification.action_url) {
      this.router.navigate([notification.action_url]);
      this.showNotifications = false;
    }
  }
  
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Justo ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minutos`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} horas`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `Hace ${diffInDays} días`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `Hace ${diffInMonths} meses`;
  }
}
