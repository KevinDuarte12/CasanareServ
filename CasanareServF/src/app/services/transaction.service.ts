import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Transaction } from '../interfaces/transaction';
import { environment } from '../../environment/environment';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = environment.endpoint;

  constructor(private http: HttpClient) { }

  getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Normaliza la construcción de URL para evitar problemas con barras
   * @private
   */
  private normalizeUrl(path: string): string {
    // Quita la barra inicial de path si existe
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    // Asegura que apiUrl termine con barra
    const baseUrl = this.apiUrl.endsWith('/') ? this.apiUrl : `${this.apiUrl}/`;

    return `${baseUrl}${normalizedPath}`;
  }

  /**
   * Crea una nueva transacción e inicia el proceso de pago
   * @param transactionData Datos para procesar la transacción
   * @returns Observable con la respuesta de la API
   */
  createPayment(transactionData: any): Observable<any> {
    const url = this.normalizeUrl('api/transaction/create');
    console.log('URL de pago:', url);
    return this.http.post<any>(url, transactionData);
  }

  /**
   * Verifica el estado de una transacción
   * @param reference Referencia de PayU para la transacción
   * @returns Observable con el estado de la transacción
   */
  checkPaymentStatus(reference: string): Observable<any> {
    return this.http.get<any>(this.normalizeUrl(`api/payment/status/${reference}`));
  }

  /**
   * Obtiene el historial de transacciones del usuario
   * @param userId ID del usuario
   * @returns Observable con el listado de transacciones
   */
  getUserTransactions(userId: number): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(this.normalizeUrl(`api/payment/history/${userId}`));
  }

  /**
   * Obtiene los productos comprados por el usuario
   * @param userId ID del usuario
   * @returns Observable con los productos comprados
   */
  getPurchasedProducts(userId: number): Observable<any[]> {
    return this.http.get<any>(this.normalizeUrl(`api/payment/purchased/${userId}`)).pipe(
      map(response => {
        // ✅ CORRECCIÓN: El backend ahora devuelve directamente el array
        // Si response es un array, devolverlo directamente
        if (Array.isArray(response)) {
          return response;
        }
        // Si response tiene la estructura { data: [...] }, extraer data
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // Si no es ninguno de los casos anteriores, devolver array vacío
        return [];
      })
    );
  }

  /**
   * Completa una transacción de pago (para sandbox)
   * @param paymentData Datos de la transacción completada
   */
  completePayment(paymentData: any): Observable<any> {
    return this.http.post<any>(this.normalizeUrl('api/transaction/complete'), paymentData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Crea una transacción utilizando WebCheckout de PayU
   * @param paymentData Datos para la transacción
   */
  createWebCheckoutPayment(paymentData: any): Observable<any> {
    return this.http.post<any>(this.normalizeUrl('api/transaction/web-checkout'), paymentData, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Crea una transacción utilizando Barter-WebCheckout de PayU
   * @param paymentData Datos para la transacción
   */
  createBarterWebCheckoutPayment(paymentData: any): Observable<any> {
    return this.http.post<any>(
      this.normalizeUrl('api/transaction/barter-web-checkout'),
      paymentData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Verifica el estado de un pago por referencia
   * @param reference Referencia de la transacción
   * @param manual Flag para verificación manual
   * @returns Observable con el resultado de la verificación
   */
  verifyPayment(reference: string, manual: boolean = false): Observable<any> {
    // Crear un objeto HttpParams (inmutable)
    let params = new HttpParams();

    // Añadir el parámetro solo si manual es true
    if (manual) {
      params = params.set('manual', 'true');
    }

    const url = this.normalizeUrl(`api/transaction/verify/${reference}`);
    console.log('Verificando pago en URL:', url);

    // Pasar el objeto HttpParams
    return this.http.get(url, {
      headers: this.getHeaders(),
      params
    });
  }

  /**
   * Actualiza manualmente el estado de una transacción (para desarrollo)
   */
  updatePaymentStatusManually(data: { reference: string, status: string }): Observable<any> {
    const url = this.normalizeUrl('api/transaction/update-status-manual');
    return this.http.post(url, data, {
      headers: this.getHeaders()
    });
  }

  /**
   * Obtiene los headers de autenticación
   * @returns Headers de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Verifica el estado de un pago Barter por referencia
   * @param reference Referencia de la transacción Barter
   * @returns Observable con el estado de la transacción Barter
   */
  verifyBarterPayment(reference: string): Observable<any> {
    const url = this.normalizeUrl(`api/transaction/barter-verify/${reference}`);
    console.log('🔍 Verificando pago de trueque en URL:', url);

    return this.http.get(url, {
      headers: this.getHeaders()
    });
  }

  /**
   * Actualiza el estado de un pago Barter
   * @param data Datos para actualizar el estado del pago Barter
   * @returns Observable con la respuesta de la API
   */
  updateBarterPaymentStatus(data: { reference: string, status: string }): Observable<any> {
    const url = this.normalizeUrl('api/transaction/update-barter-status');
    console.log('🔄 Actualizando estado de pago de trueque en URL:', url);
    console.log('📤 Datos a enviar:', data);

    return this.http.post(url, data, {
      headers: this.getHeaders()
    });
  }
  /**
 * Obtiene el estado de pagos de un barter desde el módulo de transacciones
 * @param barterId ID del barter
 * @returns Observable con el estado de pagos
 */
  getBarterPaymentStatusFromTransactions(barterId: number): Observable<any> {
    const url = this.normalizeUrl(`api/transaction/barter-payment-status/${barterId}`);
    console.log('🔍 Consultando estado de pagos de barter en:', url);

    return this.http.get(url, {
      headers: this.getHeaders()
    });
  }

  /**
   * Verifica manualmente la completitud de un barter
   * @param barterId ID del barter
   * @returns Observable con el resultado
   */
  checkBarterCompletionFromTransactions(barterId: number): Observable<any> {
    const url = this.normalizeUrl('api/transaction/check-barter-completion');
    console.log('🔄 Verificando completitud de barter en:', url);

    return this.http.post(url, { barterId }, {
      headers: this.getHeaders()
    });
  }
}