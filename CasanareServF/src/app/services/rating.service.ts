import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  
  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) { }

  /**
   * Corrige el método buildUrl para depurar mejor las URLs
   */
  private buildUrl(path: string): string {
    const baseApiUrl = environment.apiUrl.endsWith('/')
      ? environment.apiUrl.slice(0, -1)
      : environment.apiUrl;
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const fullUrl = `${baseApiUrl}/api/${cleanPath}`;
    
    console.log('URL construida para API:', fullUrl);
    return fullUrl;
  }

  /**
   * Obtiene opciones con headers de autenticación
   */
  private getAuthOptions(): any {
    const token = this.tokenService.getToken();
    if (!token) {
      return {};
    }
    return {
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
  }

  /**
   * Crear una nueva calificación para un producto
   */
  createRating(ratingData: {
    id_product: number;
    score: number;
    comment?: string;
  }): Observable<any> {
    console.log('Enviando calificación a:', this.buildUrl('ratings'));
    console.log('Datos:', ratingData);
    console.log('Token presente:', !!this.tokenService.getToken());
    
    return this.http.post(
      this.buildUrl('ratings'), 
      ratingData,
      this.getAuthOptions()
    ).pipe(
      tap(response => console.log('Respuesta del servidor:', response)),
      catchError(error => {
        console.error('Error detallado:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener las calificaciones de un producto
   */
  getProductRatings(productId: number): Observable<any> {
    return this.http.get(this.buildUrl(`ratings/product/${productId}`));
  }

  /**
   * Obtener calificaciones recibidas por un usuario
   */
  getUserRatings(userId: number): Observable<any> {
    return this.http.get(this.buildUrl(`ratings/user/${userId}`));
  }

  /**
   * Eliminar una calificación
   */
  deleteRating(ratingId: number): Observable<any> {
    return this.http.delete(
      this.buildUrl(`ratings/${ratingId}`),
      this.getAuthOptions()
    );
  }
}