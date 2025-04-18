import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, NavigationEnd } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { BreadcrumbItem } from '../breadcrumb/breadcrumb.component';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSource = new BehaviorSubject<BreadcrumbItem[]>([]);
  breadcrumbs$ = this.breadcrumbsSource.asObservable();

  // Mapeo de rutas a nombres amigables
  private routeLabels: { [key: string]: string } = {
    '': 'Home',
    'shop': 'Tienda',
    'shop-detail': 'Detalle de Producto',
    'cart': 'Carrito',
    'checkout': 'Finalizar Compra',
    'contact': 'Contacto',
    'about': 'Nosotros',
    'formulario-vender': 'Vender Producto',
    'faq': 'Preguntas Frecuentes',
    'shipment-tracking': 'Seguimiento de Envío',
    'login': 'Iniciar Sesión',
    'registro': 'Registro',
    'dashboard': 'Panel de Control',
    'verify-email': 'Verificar Email',
    'forgotpassword': 'Recuperar Contraseña',
    'resetpassword': 'Restablecer Contraseña'
  };

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const root = this.router.routerState.snapshot.root;
      const breadcrumbs = this.buildBreadcrumbs(root);
      this.breadcrumbsSource.next(breadcrumbs);
    });
  }

  private buildBreadcrumbs(route: ActivatedRouteSnapshot, url: string = '', breadcrumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
    // Si no hay ruta, devolver un arreglo vacío
    if (!route) {
      return breadcrumbs;
    }

    // Obtener la URL del segmento de ruta
    const path = route.url.map(segment => segment.path).join('/');
    
    // Si hay un path, construir la URL completa
    if (path) {
      url += `/${path}`;
      
      // Obtener la etiqueta para esta ruta o usar el path como respaldo
      const label = this.getRouteLabel(path);
      
      // Añadir este segmento a los breadcrumbs
      breadcrumbs.push({
        label: label,
        link: url
      });
    }

    // Continuar con los hijos si existen
    if (route.firstChild) {
      return this.buildBreadcrumbs(route.firstChild, url, breadcrumbs);
    }

    // Si es el último elemento, quitar el link
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].link = null;
    }

    // Siempre comenzar con Home
    if (breadcrumbs.length === 0 || breadcrumbs[0].label !== 'Home') {
      breadcrumbs.unshift({ label: 'Home', link: '/' });
    }

    return breadcrumbs;
  }

  // Obtener la etiqueta amigable para una ruta
  private getRouteLabel(path: string): string {
    return this.routeLabels[path] || this.formatPath(path);
  }

  // Formatear el path a un formato más amigable
  private formatPath(path: string): string {
    if (!path) return '';
    // Dividir por guiones y guiones bajos, capitalizar cada palabra
    return path
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Método para manualmente establecer breadcrumbs (útil para páginas dinámicas como detalles)
  setBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
    this.breadcrumbsSource.next(breadcrumbs);
  }
}