import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BarterService } from '../services/barter.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

/**
 * 🔄 COMPONENTE DE TRUEQUES RECIENTES
 * Muestra los trueques más recientes disponibles en formato de cards
 * Permite proponer intercambios y ver detalles
 */
@Component({
  selector: 'app-recent-barter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recent-barter.component.html',
  styleUrl: './recent-barter.component.css'
})
export class RecentBartersComponent implements OnInit {
  // 📝 PROPIEDADES DEL COMPONENTE
  recentBarters: any[] = [];                    // Lista de trueques recientes
  loading = false;                              // Estado de carga
  imageErrors: Set<number> = new Set();         // Control de errores de imagen
  avatarErrors: Set<number> = new Set();        // Control de errores de avatar

  /**
   * 🏗️ CONSTRUCTOR CON INYECCIÓN DE DEPENDENCIAS
   */
  constructor(
    private barterService: BarterService,        // Servicio de trueques
    private authService: AuthService,            // Servicio de autenticación  
    private router: Router,                      // Router de Angular
    private toastr: ToastrService               // Servicio de notificaciones
  ) {}

  /**
   * 🔄 INICIALIZACIÓN DEL COMPONENTE
   */
  ngOnInit(): void {
    this.loadRecentBarters();
  }

  /**
   * 📊 CARGAR TRUEQUES RECIENTES DESDE EL BACKEND
   */
  loadRecentBarters(): void {
    this.loading = true;
    
    this.barterService.getRecentBarters(8).subscribe({
      next: (response: any) => {
        console.log('📦 Respuesta del servidor:', response);
        
        if (response && response.success) {
          this.recentBarters = response.data || [];
          
          // Si no hay trueques reales, usar datos mock
          if (this.recentBarters.length === 0) {
            console.log('📦 No hay trueques reales, cargando datos de demostración...');
            this.recentBarters = this.getMockBarters();
            this.toastr.info('Mostrando trueques de demostración', 'Modo Demo', {
              timeOut: 3000
            });
          } else {
            console.log('✅ Trueques reales cargados:', this.recentBarters);
          }
        } else {
          console.error('❌ Error en respuesta, usando datos mock');
          this.recentBarters = this.getMockBarters();
          this.toastr.warning('Usando datos de demostración', 'Sin conexión');
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando trueques, usando fallback:', error);
        
        // Cargar datos mock cuando falla la API
        this.recentBarters = this.getMockBarters();
        this.loading = false;
        
        // Mostrar mensaje específico según el tipo de error
        if (error.status === 0) {
          this.toastr.info('Sin conexión al servidor, mostrando datos de demostración', 'Modo Offline');
        } else if (error.status >= 500) {
          this.toastr.info('Error del servidor, mostrando datos de demostración', 'Modo Demo');
        } else {
          this.toastr.info('Mostrando trueques de demostración', 'Modo Demo');
        }
      }
    });
  }

  /**
   * 📦 OBTENER TRUEQUES MOCK PARA DEMOSTRACIÓN
   * Solo 3 trueques de productos - sin servicios
   */
  private getMockBarters(): any[] {
    return [
      {
        id: 1,
        status: 'disponible',
        exchange_type: 'product_for_product',
        value: 250000,
        notes: 'iPhone en excelente estado, cambio por laptop gaming',
        request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Hace 2 días
        product: {
          id: 101,
          name: 'iPhone 12 Pro',
          price: 2500000,
          description: 'Smartphone Apple en perfecto estado, con caja y accesorios',
          image: '/img/iphone12pro.jpeg' // ✅ Nueva ruta de imagen
        },
        user: {
          id: 201,
          name: 'Carlos Rodríguez',
          avatar: null
        }
      },
      {
        id: 2,
        status: 'disponible',
        exchange_type: 'product_for_money',
        value: 150000,
        notes: 'Laptop gamer, acepto dinero o intercambio por consola',
        request_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Hace 1 día
        product: {
          id: 102,
          name: 'Laptop Gaming ASUS ROG',
          price: 3200000,
          description: 'Laptop para gaming de alta gama, RTX 3060',
          image: '/img/laptoprog.jpeg' // ✅ Nueva ruta de imagen
        },
        user: {
          id: 202,
          name: 'María González',
          avatar: null
        }
      },
      {
        id: 3,
        status: 'disponible',
        exchange_type: 'money_for_product',
        value: 800000,
        notes: 'Busco TV Smart 55", ofrezco dinero en efectivo',
        request_date: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // Hace 3 horas
        product: {
          id: 103,
          name: 'PlayStation 5',
          price: 2800000,
          description: 'Consola de videojuegos nueva generación, incluye 2 controles',
          image: '/img/ps5.jpeg' // ✅ Nueva ruta de imagen
        },
        user: {
          id: 203,
          name: 'Diego Martínez',
          avatar: null
        }
      }
    ];
  }

  /**
   * 🔄 REFRESCAR TRUEQUES MANUALMENTE
   */
  refreshBarters(): void {
    this.loadRecentBarters();
  }

  /**
   * 🖼️ OBTENER IMAGEN DEL PRODUCTO DEL TRUEQUE
   */
  getBarterImage(barter: any, index: number): string {
    if (this.imageErrors.has(index)) {
      return 'assets/img/no-image.png'; // Imagen por defecto
    }
    
    return barter.product?.image || 'assets/img/no-image.png';
  }

  /**
   * 👤 OBTENER AVATAR DEL USUARIO
   */
  getUserAvatar(user: any): string {
    return user?.avatar || 'assets/img/default-avatar.png';
  }

  /**
   * ❌ MANEJAR ERROR DE IMAGEN DEL PRODUCTO
   */
  handleImageError(event: any, index: number): void {
    this.imageErrors.add(index);
    event.target.src = 'assets/img/no-image.png';
  }

  /**
   * ❌ MANEJAR ERROR DE AVATAR DE USUARIO
   */
  handleAvatarError(event: any): void {
    event.target.src = 'assets/img/default-avatar.png';
  }

  /**
   * 🔄 PROPONER TRUEQUE
   */
  proposeBarter(barter: any): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.toastr.warning('Debes iniciar sesión para proponer un trueque');
      this.router.navigate(['/login']);
      return;
    }

    // Verificar que no sea el mismo usuario
    const currentUser = this.authService.getUserData();
    if (currentUser && currentUser.id === barter.user.id) {
      this.toastr.warning('No puedes proponer un trueque a tu propio producto');
      return;
    }

    // Redirigir a la página de propuesta de trueque
    this.router.navigate(['/barter-proposal'], {
      queryParams: {
        barterId: barter.id,
        productId: barter.product.id
      }
    });
  }

  /**
   * 👁️ VER DETALLES DEL TRUEQUE
   */
  showBarterDetail(barterId: number): void {
    this.router.navigate(['/barter-detail', barterId]);
  }

  /**
   * 🏷️ OBTENER ETIQUETA CORTA DEL TIPO DE INTERCAMBIO
   * Versión abreviada para mostrar junto a las estrellas
   */
  getExchangeTypeShort(exchangeType: string): string {
    const shortLabels: { [key: string]: string } = {
      'product_for_product': 'P x P',
      'product_for_money': 'P x $',
      'money_for_product': '$ x P'
    };
    
    return shortLabels[exchangeType] || 'Trueque';
  }

  /**
   * 🏷️ OBTENER ETIQUETA DEL TIPO DE INTERCAMBIO
   * Solo tipos de intercambio de productos (sin servicios)
   */
  getExchangeTypeLabel(exchangeType: string): string {
    const labels: { [key: string]: string } = {
      'product_for_product': 'Producto x Producto',
      'product_for_money': 'Producto x Dinero',
      'money_for_product': 'Dinero x Producto'
    };
    
    return labels[exchangeType] || 'Intercambio';
  }

  /**
   * ⏰ CALCULAR TIEMPO TRANSCURRIDO
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Hace unos segundos';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return date.toLocaleDateString();
  }
}
