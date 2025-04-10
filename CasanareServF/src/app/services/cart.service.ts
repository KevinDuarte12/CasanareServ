import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private myAppUrl: string;
  private myApiUrl: string;
  
  private cartItemsSubject = new BehaviorSubject<any[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();
  
  private cartCountSubject = new BehaviorSubject<number>(0);
  cartCount$ = this.cartCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/carts/';
    this.loadCart(); // Cargar carrito al inicializar
  }

  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // Obtener carrito actual
  getCart(): Observable<any> {
    return this.http.get<any>(
      `${this.myAppUrl}${this.myApiUrl}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(cart => {
        if (cart && cart.items) {
          this.cartItemsSubject.next(cart.items);
          this.updateCartCount(cart.items);
        }
      })
    );
  }

  // Añadir producto al carrito
  addToCart(id_product: number, quantity: number): Observable<any> {
    console.log(`CartService - Enviando producto ID:${id_product}, cantidad:${quantity}`);
    
    // Primero obtener el producto para tener su precio actual
    return this.http.get<any>(
      `${this.myAppUrl}api/products/${id_product}`
    ).pipe(
      switchMap(product => {
        console.log('Producto obtenido para agregar al carrito:', product);
        
        // Enviar la solicitud con precio y cantidad
        return this.http.post<any>(
          `${this.myAppUrl}${this.myApiUrl}add`,
          { 
            id_product, 
            quantity,
            price: product.price // Incluir el precio actual del producto
          },
          { headers: this.getAuthHeaders() }
        );
      }),
      tap(() => this.loadCart())
    );
  }

  // Actualizar cantidad de un producto
  updateCartItem(itemId: number, quantity: number): Observable<any> {
    return this.http.patch<any>(
      `${this.myAppUrl}${this.myApiUrl}items/${itemId}`,
      { quantity },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.loadCart())
    );
  }

  // Eliminar producto del carrito
  removeFromCart(itemId: number): Observable<any> {
    return this.http.delete<any>(
      `${this.myAppUrl}${this.myApiUrl}items/${itemId}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.loadCart())
    );
  }

  // Vaciar carrito
  clearCart(): Observable<any> {
    return this.http.delete<any>(
      `${this.myAppUrl}${this.myApiUrl}clear`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => {
        this.cartItemsSubject.next([]);
        this.cartCountSubject.next(0);
      })
    );
  }

  // Cargar carrito desde el servidor
  private loadCart(): void {
    const isLoggedIn = !!localStorage.getItem('token');
    
    if (isLoggedIn) {
      this.getCart().subscribe({
        error: err => console.error('Error cargando carrito:', err)
      });
    }
  }

  // Actualizar contador de items
  private updateCartCount(items: any[]): void {
    const count = items.reduce((acc, item) => acc + item.quantity, 0);
    this.cartCountSubject.next(count);
  }
}