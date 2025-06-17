import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { authInterceptor } from './utils/add-token.interceptor';
import { urlNormalizerInterceptor } from './utils/url-normalizer.interceptor';

/**
 * ⚙️ CONFIGURACIÓN PRINCIPAL DE LA APLICACIÓN ANGULAR
 * Configuración centralizada de proveedores, interceptores y servicios globales
 * Incluye optimizaciones de rendimiento y configuración de bibliotecas externas
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // 🚀 OPTIMIZACIÓN DE RENDIMIENTO
    // Configura la detección de cambios en Angular para mejorar el rendimiento
    provideZoneChangeDetection({ eventCoalescing: true }), 

    // 🛣️ CONFIGURACIÓN DE ENRUTAMIENTO
    // Proporciona el sistema de rutas de la aplicación
    provideRouter(routes),

    // 🌐 CONFIGURACIÓN HTTP CON INTERCEPTORES
    // Cliente HTTP con interceptores en orden específico
    provideHttpClient(
      withInterceptors([
        urlNormalizerInterceptor, // Primero normalizar las URLs
        authInterceptor // Luego aplicar la autenticación
      ])
    ),

    // 🎨 SOPORTE PARA ANIMACIONES
    // Habilita las animaciones de Angular Material y componentes personalizados
    provideAnimations(),

    // 🔔 CONFIGURACIÓN DE NOTIFICACIONES TOAST
    // Sistema de notificaciones con configuración personalizada
    provideToastr({
      timeOut: 3000,                    // Duración: 3 segundos
      positionClass: 'toast-top-center', // Posición: parte superior central
      preventDuplicates: true,          // Evitar notificaciones duplicadas
      progressBar: true                 // Mostrar barra de progreso
    }),

    // 🖼️ CONFIGURACIÓN DE IMÁGENES
    // Deshabilita advertencias de tamaño de imagen para optimización
    {
      provide: 'DISABLE_IMAGE_SIZE_WARNING',
      useValue: true
    }
  ]
};