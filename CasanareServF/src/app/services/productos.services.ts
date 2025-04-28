import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Product } from '../interfaces/product';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/products/';
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.myAppUrl}${this.myApiUrl}`).pipe(
      tap(products => console.log('Products loaded:', products)),
      catchError(error => {
        console.error('Error loading products:', error);
        return throwError(() => error);
      })
    );
  }

  // Modificar el método getProduct para añadir más logs y mejor manejo de errores
  getProduct(id: number): Observable<any> {
    console.log(`Solicitando producto con ID: ${id}`);
    
    if (!id || isNaN(id)) {
      console.error('ID de producto inválido:', id);
      return throwError(() => new Error('ID de producto inválido'));
    }
    
    return this.http.get<any>(`${this.myAppUrl}api/products/${id}`).pipe(
      tap(response => {
        console.log('Respuesta del servidor para getProduct:', response);
        
        // Verificar si la respuesta tiene la estructura esperada
        if (!response || !response.id_product) {
          console.warn('La respuesta no contiene un producto válido:', response);
        }
      }),
      catchError(error => {
        console.error('Error en getProduct:', error);
        // Propagar un error más detallado
        return throwError(() => new Error(`Error al obtener el producto: ${error.message || 'Error de servidor'}`));
      })
    );
  }

  createProduct(product: Product): Observable<any> {
    // Asegurar que el tipo sea 'regular' por defecto
    const productToCreate = {
      ...product,
      type: product.type || 'regular'
    };

    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}`,
      productToCreate,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Product created:', response)),
      catchError(error => {
        console.error('Error creating product:', error);
        return throwError(() => error);
      })
    );
  }

  updateProduct(id: number, product: Product): Observable<any> {
    // Crear una copia del objeto para no modificar el original
    const productToUpdate = { 
      ...product,
      // Asegurar que type tenga un valor por defecto
      type: product.type || 'regular'
    };

    // No más conversiones de permite_trueque a type

    return this.http.put(
      `${this.myAppUrl}${this.myApiUrl}${id}`, 
      productToUpdate, 
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Product updated:', response)),
      catchError(error => {
        console.error('Error updating product:', error);
        return throwError(() => error);
      })
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  changeProductStatus(
    id: number,
    newStatus: 'disponible' | 'vendido' | 'inactivo' | 'en_trueque'
  ): Observable<any> {
    return this.http.patch(
      `${this.myAppUrl}${this.myApiUrl}${id}/status`,
      { newStatus },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log(`Product ${id} status updated:`, response)),
      catchError(error => {
        console.error('Error updating product status:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener productos recientes con sus imágenes
   * @param limit Número máximo de productos a devolver
   */
  getRecentProducts(limit: number = 8): Observable<any[]> {
    // Crear parámetros que incluyan la solicitud de imágenes
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('includeImages', 'true'); // Solicitar explícitamente las imágenes
    
    console.log('URL de productos recientes:', `${this.myAppUrl}${this.myApiUrl}recent`);
    
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}recent`, { params })
      .pipe(
        tap(response => {
          console.log('Respuesta productos recientes:', response);
          
          // Verificar si la respuesta contiene productos con imágenes
          if (Array.isArray(response) && response.length > 0) {
            const sampleProduct = response[0];
            console.log('Primer producto:', sampleProduct);
            
            if (sampleProduct.images) {
              console.log('Imágenes del primer producto:', sampleProduct.images);
            } else {
              console.warn('El producto no tiene imágenes asociadas');
            }
          }
        }),
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
  getAllProductsPaginated(page: number = 1, limit: number = 12, options: any = {}): Observable<PaginatedResponse> {
    // Construir parámetros de consulta
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Añadir filtros opcionales
    if (options.categoryId) {
      params = params.set('category', options.categoryId.toString());
    }
    
    // AÑADIR ESTA SECCIÓN - IMPORTANTE!
    if (options.type) {
      params = params.set('type', options.type);
      console.log(`Enviando parámetro type=${options.type}`);
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
    
    console.log(`URL completa: ${this.myAppUrl}${this.myApiUrl}paginated?${params.toString()}`);
    
    // Realizar la solicitud al nuevo endpoint con el tipo adecuado
    return this.http.get<PaginatedResponse>(`${this.myAppUrl}${this.myApiUrl}paginated`, { params }).pipe(
      tap(response => {
        console.log("Respuesta completa del API de productos:", response);
        if (response.data && response.data.length > 0) {
          console.log("Ejemplo de producto con imágenes:", 
            response.data[0].id_product, response.data[0].images);
        }
      }),
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

  // Método temporal con datos mock
  getProductsByUser(userId: number): Observable<any[]> {
    console.log(`Obteniendo productos del usuario ${userId}`);
    
    // Intentar con la API real
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}user/${userId}`).pipe(
      tap(products => console.log(`Productos del usuario ${userId} cargados:`, products)),
      catchError(error => {
        console.error(`Error al cargar productos del usuario ${userId}:`, error);
        
        // Datos mock para desarrollo
        const mockProducts = [
          {
            id_product: 1001,
            name: 'Smartphone Samsung A52',
            description: 'Smartphone en excelente estado, con cargador original',
            price: 850000,
            status: 'disponible',
            id_user: userId,
            id_category: 1,
            images: []
          },
          {
            id_product: 1002,
            name: 'Bicicleta montaña GW',
            description: 'Bicicleta todoterreno, poco uso',
            price: 1200000,
            status: 'disponible',
            id_user: userId,
            id_category: 2,
            images: []
          }
        ];
        
        return of(mockProducts);
      })
    );
  }

  getAvailableProducts(): Observable<any[]> {
    console.log('Obteniendo productos disponibles');
    
    // Intentar con la API real
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}available`).pipe(
      tap(products => console.log('Productos disponibles cargados:', products)),
      catchError(error => {
        console.error('Error al cargar productos disponibles:', error);
        
        // Datos mock para desarrollo
        const mockProducts = [
          {
            id_product: 2001,
            name: 'iPad Pro 2022',
            description: 'iPad Pro con Apple Pencil incluido',
            price: 3500000,
            status: 'disponible',
            id_user: 2, // Usuario distinto
            id_category: 1,
            images: []
          },
          {
            id_product: 2002,
            name: 'Mesa de comedor',
            description: 'Mesa de comedor para 6 personas, madera maciza',
            price: 950000,
            status: 'disponible',
            id_user: 3, // Usuario distinto
            id_category: 4,
            images: []
          },
          {
            id_product: 2003,
            name: 'Guitarra acústica',
            description: 'Guitarra acústica Yamaha, con estuche incluido',
            price: 650000,
            status: 'disponible',
            id_user: 4, // Usuario distinto
            id_category: 3,
            images: []
          }
        ];
        
        return of(mockProducts);
      })
    );
  }
}

// Definir una interfaz para la respuesta paginada
interface PaginatedResponse {
  data: Product[];
  meta: {
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    totalPages: number;
  };
}