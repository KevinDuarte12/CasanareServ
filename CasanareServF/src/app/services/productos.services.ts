import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Product } from '../interfaces/product';
import { environment } from '../../environment/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient, private authService: AuthService) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/products/';
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.myAppUrl}${this.myApiUrl}`);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }

  createProduct(product: Product): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}`, product, { headers: this.getAuthHeaders() });
  }

  updateProduct(id: number, product: Product): Observable<any> {
    return this.http.put(`${this.myAppUrl}${this.myApiUrl}${id}`, product, { headers: this.getAuthHeaders() });
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  changeProductStatus(id: number, newStatus: 'disponible' | 'vendido' | 'en_trueque'): Observable<any> {
    return this.http.patch(`${this.myAppUrl}${this.myApiUrl}${id}/status`, { newStatus }, { headers: this.getAuthHeaders() });
  }

  /**
   * Obtener productos recientes
   * @param limit Número máximo de productos a devolver
   */
  getRecentProducts(limit: number = 8): Observable<any[]> {
    // Asegúrate de que la URL esté correctamente formada
    console.log('URL de productos recientes:', `${this.myAppUrl}${this.myApiUrl}recent?limit=${limit}`);
    
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}recent?limit=${limit}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching recent products:', error);
          return throwError(() => new Error('Error al cargar productos recientes'));
        })
      );
  }

  // Helper method to get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return this.headers.set('Authorization', `Bearer ${token}`);
  }

  // Método para obtener productos por categoría
  getProductsByCategory(categoryId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}category/${categoryId}`).pipe(
      tap(products => console.log(`Recibidos ${products.length} productos para categoría ${categoryId}`)),
      catchError(error => {
        console.error(`Error al obtener productos para categoría ${categoryId}:`, error);
        return of([]); // Devolver array vacío en caso de error
      })
    );
  }
}