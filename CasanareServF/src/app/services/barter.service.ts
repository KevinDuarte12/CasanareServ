import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Barter, BarterRequest } from '../interfaces/barter';
import { Product } from '../interfaces/product';
import { environment } from '../../environment/environment';

interface TruequeableProductRequest {
  name: string;
  description: string;
  price: number;
  type: string;
  id_user: number;
  status: string;
  stock: number;
  id_category: number;
  images?: string[];
}

// Definir la interfaz para la publicación de trueque
interface BarterPublication {
  id_prod_offer: number;
  id_user_offer: number;
  notes?: string;
}

// Agregar esta interfaz al principio del archivo junto con las otras interfaces
interface BarterStatusResponse {
  barter?: {
    id_barter?: number;
    status?: string;
    // ...otras propiedades si es necesario
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BarterService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/barters/';
  }

  getBarters(): Observable<Barter[]> {
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}`).pipe(
      tap(barters => console.log('Barters loaded:', barters)),
      catchError(error => {
        console.error('Error loading barters:', error);
        return throwError(() => error);
      })
    );
  }

  getBarter(id: number): Observable<Barter> {
    return this.http.get<Barter>(`${this.myAppUrl}${this.myApiUrl}${id}`).pipe(
      tap(barter => console.log('Barter loaded:', barter)),
      catchError(error => {
        console.error('Error loading barter:', error);
        return throwError(() => error);
      })
    );
  }

  createBarter(barterRequest: BarterRequest): Observable<any> {
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}`,
      barterRequest,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Barter created:', response)),
      catchError(error => {
        console.error('Error creating barter:', error);
        return throwError(() => error);
      })
    );
  }

  // Modificar el método updateBarterStatus para manejar rechazos:

  updateBarterStatus(id: number, status: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'disponible' | 'aprobado_admin'): Observable<BarterStatusResponse> {
    console.log(`🔄 Actualizando estado de trueque ${id} a '${status}'`);
    
    // Caso especial para rechazado - informar al usuario sobre el comportamiento esperado
    if (status === 'rechazado') {
      console.log('ℹ️ Solicitando rechazo: El backend cambiará el estado a "disponible" automáticamente');
    }

    // Validar explícitamente que el estado sea uno de los permitidos
    const validStatuses = ['pendiente', 'aceptado', 'rechazado', 'completado', 'disponible', 'aprobado_admin'];
    if (!validStatuses.includes(status)) {
      console.error(`❌ Estado inválido: ${status}`);
      return throwError(() => new Error(`Estado inválido: ${status}`));
    }

    // Asegurarse que el body está bien estructurado
    const body = { status: status };
    console.log('📦 Body a enviar:', body);

    return this.http.patch<BarterStatusResponse>(
      `${this.myAppUrl}${this.myApiUrl}${id}/status`,
      body,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log(`✅ Respuesta del servidor para actualización de estado:`, response);
        
        if (status === 'rechazado') {
          // Verificar si el estado fue cambiado correctamente a 'disponible'
          const actualStatus = response?.barter?.status || 'desconocido';
          console.log(`ℹ️ Estado después de rechazar: ${actualStatus}`);
          
          if (actualStatus !== 'disponible') {
            console.warn('⚠️ El estado del trueque no se actualizó a "disponible" como se esperaba');
          }
        }
      }),
      catchError(error => {
        console.error(`❌ Error updating barter ${id} status to ${status}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteBarter(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  // Helper method to get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return this.headers.set('Authorization', `Bearer ${token}`);
  }

  // Método temporal con datos mock
  getUserBarters(userId: number): Observable<Barter[]> {
    console.log(`Obteniendo trueques del usuario ${userId}`);

    // Intentar con la API real
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}user/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => console.log(`Trueques del usuario ${userId} cargados:`, barters)),
      catchError(error => {
        console.error(`Error al cargar trueques del usuario ${userId}:`, error);

        // Datos mock para desarrollo
        const mockBarters: Barter[] = [
          {
            id_barter: 101,
            id_prod_offer: 1001,
            id_prod_request: 2001,
            id_user_offer: userId as number,
            id_user_receiving: 2,
            status: 'pendiente',
            request_date: new Date().toISOString(),
            notes: 'Propuesta de trueque para iPad',
            offered_product: {
              id_product: 1001,
              name: 'Smartphone Samsung A52',
              price: 850000,
              description: 'Smartphone en excelente estado, con cargador original',
              id_category: 1
            },
            requested_product: {
              id_product: 2001,
              name: 'iPad Pro 2022',
              price: 3500000,
              description: 'iPad Pro con Apple Pencil incluido',
              id_category: 1
            }
          }
        ];

        return of(mockBarters);
      })
    );
  }

  // Agregar este método para crear productos para trueque
  createProductForBarter(productData: TruequeableProductRequest): Observable<any> {
    return this.http.post(
      `${this.myAppUrl}api/products/`,
      productData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Producto para trueque creado:', response)),
      catchError(error => {
        console.error('Error al crear producto para trueque:', error);
        return throwError(() => error);
      })
    );
  }

  // Agregar este método para la publicación de trueque
  createBarterPublication(data: BarterPublication): Observable<any> {
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}publication`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Publicación de trueque creada:', response)),
      catchError(error => {
        console.error('Error al crear publicación de trueque:', error);
        return throwError(() => error);
      })
    );
  }

  // Si es necesario, ajustar el método updateBarter para que sea más claro
  updateBarter(id: number, barterData: any): Observable<any> {
    const url = `${this.myAppUrl}${this.myApiUrl}${id}`;
    const headers = this.getAuthHeaders();

    return this.http.put(url, barterData, { headers }).pipe(
      tap(response => console.log('Barter updated:', response)),
      catchError(error => {
        console.error('Error updating barter:', error);
        return throwError(() => error);
      })
    );
  }

  getBartersByUser(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.myAppUrl}${this.myApiUrl}user/${userId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => console.log(`Trueques del usuario ${userId} cargados:`, barters)),
      catchError(error => {
        console.error(`Error al cargar trueques del usuario ${userId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // Añadir este método al servicio
  checkExistingProposal(userId: number, productId: number): Observable<any> {
    return this.http.get<any>(
      `${environment.endpoint}api/barters/check-proposal?userId=${userId}&productId=${productId}`
    ).pipe(
      catchError(error => {
        console.error('Error al verificar propuesta existente:', error);
        return of({ exists: false, proposal: null });
      })
    );
  }

  // Añadir este método si no existe
  getBartersByStatus(status: 'pendiente' | 'disponible' | 'aceptado' | 'rechazado' | 'completado' | 'aprobado_admin'): Observable<Barter[]> {
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}status/${status}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => console.log(`Trueques con estado ${status} cargados:`, barters)),
      catchError(error => {
        console.error(`Error al cargar trueques con estado ${status}:`, error);
        return throwError(() => error);
      })
    );
  }

  cancelBarter(barterId: number): Observable<any> {
    return this.http.patch<any>(`${this.myAppUrl}${this.myApiUrl}${barterId}/cancel`, {});
  }
  // En barter.service.ts
  proposeForExistingBarter(barterId: number | undefined, proposalData: {
    id_prod_request?: number | null; // Cambio importante: aceptar explícitamente null
    id_user_receiving: number;
    notes?: string;
    exchange_type?: string;
    value?: number;
  }): Observable<any> {
    if (barterId === undefined) {
      return throwError(() => new Error('ID de trueque indefinido'));
    }
    
    console.log(`🔄 Enviando propuesta para actualizar trueque existente ID: ${barterId}`, proposalData);
    
    // Verificar explícitamente si es una propuesta de solo dinero
    if (proposalData.exchange_type === 'money_only') {
      console.log('💰 Detectada propuesta de solo dinero - asegurando id_prod_request: null');
      // Asegurar que el campo es explícitamente null, no undefined
      proposalData.id_prod_request = null;
    }
    
    return this.http.patch(
      `${this.myAppUrl}${this.myApiUrl}${barterId}/propose`, 
      proposalData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Propuesta enviada correctamente:', response);
      }),
      catchError(error => {
        console.error('❌ Error al enviar propuesta:', error);
        console.error('Datos enviados:', proposalData);
        return throwError(() => error);
      })
    );
  }

  // Añadir método para buscar barters por el producto que se ofrece
  getBartersByProductOffered(productId: number): Observable<any> {
    return this.http.get<any>(`${this.myAppUrl}${this.myApiUrl}product-offered/${productId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => {
        console.log(`Encontrados ${Array.isArray(barters) ? barters.length : 0} barters donde se ofrece el producto ${productId}:`, barters);
      }),
      catchError(error => {
        console.error(`Error buscando barters donde se ofrece el producto ${productId}:`, error);
        return throwError(() => error);
      })
    );
  }

  // Añadir este método que falta en el BarterService
  getBartersByProductRelated(productId: number): Observable<any> {
    return this.http.get<any>(`${this.myAppUrl}${this.myApiUrl}product-related/${productId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(barters => {
        console.log(`Encontrados ${Array.isArray(barters) ? barters.length : 0} barters relacionados con producto ${productId}:`, barters);
      }),
      catchError(error => {
        console.error(`Error buscando barters relacionados con producto ${productId}:`, error);
        return throwError(() => error);
      })
    );
  }

  createMoneyOnlyBarterProposal(
    targetProductId: number,
    targetOwnerId: number,
    currentUserId: number,
    value: number,
    notes?: string
  ): Observable<any> {
    // Datos para la oferta monetaria
    const barterData = {
      id_prod_request: targetProductId, // ID del producto que se quiere comprar
      id_user_offer: targetOwnerId, // Usuario A (dueño del producto)
      id_user_receiving: currentUserId, // Usuario B (quien hace la oferta monetaria)
      status: 'pendiente',
      value: value,
      notes: notes || 'Oferta monetaria sin intercambio de productos',
      exchange_type: 'money_only'
    };
  
    console.log('Creando propuesta de solo dinero:', barterData);
    
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}`,
      barterData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('✅ Propuesta monetaria creada:', response)),
      catchError(error => {
        console.error('❌ Error al crear propuesta monetaria:', error);
        return throwError(() => error);
      })
    );
  }

  // Agregar este método al servicio BarterService
  completeBarterCheckout(barterId: number | null, checkoutData: any): Observable<any> {
    if (!barterId) {
      return throwError(() => new Error('ID de trueque no válido'));
    }
    
    // Añadir el ID del usuario actual al objeto de datos
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id) {
      checkoutData.user_id = currentUser.id;
    }
    
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}${barterId}/checkout`,
      checkoutData,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log('✅ Checkout completado exitosamente:', response);
      }),
      catchError(error => {
        console.error('❌ Error al completar checkout:', error);
        return throwError(() => new Error('Error al procesar el checkout del trueque'));
      })
    );
  }

  // Método auxiliar para obtener el usuario actual
  private getCurrentUser(): any {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  }

  // AGREGAR estos métodos al final de la clase BarterService:

  /**
   * Verifica el estado de pagos de un barter específico
   * @param barterId ID del barter
   * @returns Observable con el estado detallado de pagos
   */
  getBarterPaymentStatus(barterId: number): Observable<any> {
    return this.http.get<any>(`${this.myAppUrl}${this.myApiUrl}payment-status/${barterId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(response => {
        console.log(`📊 Estado de pagos del barter ${barterId}:`, response);
      }),
      catchError(error => {
        console.error(`❌ Error obteniendo estado de pagos del barter ${barterId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fuerza la verificación de completitud de un barter (para testing/admin)
   * @param barterId ID del barter
   * @returns Observable con el resultado
   */
  checkBarterCompletion(barterId: number): Observable<any> {
    return this.http.post<any>(`${this.myAppUrl}${this.myApiUrl}check-completion`, 
      { barterId }, 
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log(`✅ Verificación de completitud para barter ${barterId}:`, response);
      }),
      catchError(error => {
        console.error(`❌ Error verificando completitud del barter ${barterId}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Fuerza la completación manual de un barter (para testing)
   * @param barterId ID del barter
   * @returns Observable con el resultado
   */
  forceCompleteBarter(barterId: number): Observable<any> {
    return this.http.put<any>(`${this.myAppUrl}${this.myApiUrl}force-complete/${barterId}`, 
      {}, 
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        console.log(`🔧 Barter ${barterId} marcado como completado manualmente:`, response);
      }),
      catchError(error => {
        console.error(`❌ Error forzando completación del barter ${barterId}:`, error);
        return throwError(() => error);
      })
    );
  }
}
