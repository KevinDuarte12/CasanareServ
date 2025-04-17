import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { authInterceptor } from './utils/add-token.interceptor';
import { urlNormalizerInterceptor } from './utils/url-normalizer.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Configura la detección de cambios en Angular para mejorar el rendimiento
    provideZoneChangeDetection({ eventCoalescing: true }), 

    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        urlNormalizerInterceptor, // Primero normalizar las URLs
        authInterceptor // Luego aplicar la autenticación
      ])
    ),
    provideAnimations(),
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-center',
      preventDuplicates: true,
      progressBar: true
    })
  ]
};