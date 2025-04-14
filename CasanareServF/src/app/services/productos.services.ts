import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
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
    console.log('URL de productos recientes:', `${this.myAppUrl}${this.myApiUrl}recent?limit=${limit}`);
    
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}recent?limit=${limit}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching recent products:', error);
          return throwError(() => new Error('Error al cargar productos recientes'));
        })
      );
  }

  /**
   * Obtiene productos con paginación y filtros
   * @param page Número de página
   * @param limit Elementos por página
   * @param options Opciones de filtrado y ordenamiento
   */
  getAllProductsPaginated(page: number = 1, limit: number = 12, options: any = {}): Observable<any> {
    // Construir parámetros de consulta
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Añadir filtros opcionales
    if (options.categoryId) {
      params = params.set('category', options.categoryId.toString());
    }
    
    if (options.search) {
      params = params.set('search', options.search);
    }
    
    if (options.minPrice !== undefined) {
      params = params.set('minPrice', options.minPrice.toString());
    }
    
    if (options.maxPrice !== undefined) {
      params = params.set('maxPrice', options.maxPrice.toString());
    }
    
    if (options.sortBy && options.sortOrder) {
      params = params.set('sort', options.sortBy);
      params = params.set('order', options.sortOrder);
    }
    
    // Realizar la solicitud al nuevo endpoint
    return this.http.get(`${this.myAppUrl}${this.myApiUrl}paginated`, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching paginated products:', error);
        return throwError(() => new Error('Error al cargar productos paginados'));
      })
    );
  }

  /**
   * Obtiene todos los productos (sin paginación)
   */
  getAllProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}`).pipe(
      tap(products => console.log(`Recibidos ${products.length} productos en total`)),
      catchError(error => {
        console.error('Error fetching all products:', error);
        return throwError(() => new Error('Error al cargar todos los productos'));
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

  // Método para buscar productos por término de búsqueda
  searchProducts(searchTerm: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}search?term=${encodeURIComponent(searchTerm)}`).pipe(
      tap(products => console.log(`Recibidos ${products.length} productos para búsqueda "${searchTerm}"`)),
      catchError(error => {
        console.error(`Error al buscar productos con término "${searchTerm}":`, error);
        return of([]);
      })
    );
  }
}