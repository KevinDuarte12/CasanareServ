import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable,of, forkJoin } from 'rxjs';
import { environment } from '../../environment/environment';
import { tap, switchMap,catchError,map } from 'rxjs/operators';
import { Cart, CartItem } from '../interfaces/cart';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private myAppUrl: string;
  private myApiUrl: string;
  
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
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
  getCart(): Observable<Cart> {
    return this.http.get<Cart>(
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
    
    // Primero verificar si el producto ya existe en el carrito
    return this.getCart().pipe(
      switchMap(cart => {
        const existingItem = cart.items?.find(item => item.product?.id_product === id_product);
        
        if (existingItem) {
          console.log('Producto ya existe en carrito, actualizando cantidad');
          // Si existe, actualizar la cantidad
          return this.updateCartItem(existingItem.id_item!, existingItem.quantity + quantity);
        }

        // Si no existe, obtener el producto y agregarlo
        return this.http.get<any>(`${this.myAppUrl}api/products/${id_product}`).pipe(
          switchMap(product => {
            return this.http.post<any>(
              `${this.myAppUrl}${this.myApiUrl}add`,
              { 
                id_product, 
                quantity,
                price: product.price
              },
              { headers: this.getAuthHeaders() }
            );
          })
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

  private updateCartCount(items: CartItem[]): void {
    const count = items.reduce((acc, item) => acc + item.quantity, 0);
    this.cartCountSubject.next(count);
  }
  savePendingItem(id_product: number, quantity: number): void {
    const pendingItems = this.getPendingItems();
    
    // Verificar si el producto ya está en pendientes
    const existingItemIndex = pendingItems.findIndex(item => item.id_product === id_product);
    
    if (existingItemIndex !== -1) {
      // Actualizar cantidad
      pendingItems[existingItemIndex].quantity += quantity;
    } else {
      // Agregar nuevo item
      pendingItems.push({ id_product, quantity });
    }
    
    localStorage.setItem('pendingCartItems', JSON.stringify(pendingItems));
    console.log('Item guardado para procesar después del login');
  }
  // Obtener items pendientes del localStorage
  getPendingItems(): Array<{id_product: number, quantity: number}> {
    const items = localStorage.getItem('pendingCartItems');
    return items ? JSON.parse(items) : [];
  }
  
  // Limpiar items pendientes
  clearPendingItems(): void {
    localStorage.removeItem('pendingCartItems');
  }
  processPendingCart(): Observable<any> {
    const pendingItems = this.getPendingItems();
    
    if (!pendingItems || pendingItems.length === 0) {
      return of({ success: true });
    }

    return this.processItemsSequentially(pendingItems).pipe(
      tap(() => {
        // Clear pending items immediately after successful processing
        this.clearPendingItems();
      }),
      map(() => ({ success: true })),
      catchError(error => {
        console.error('Error processing pending cart:', error);
        // Clear pending items even on error to avoid reprocessing
        this.clearPendingItems();
        return of({ success: false, error });
      })
    );
  }

  private processItemsSequentially(items: Array<{id_product: number, quantity: number}>): Observable<any> {
    // If no more items to process, return
    if (items.length === 0) {
      return of(null);
    }

    // Get first item and remaining items
    const [currentItem, ...remainingItems] = items;

    // First check if item already exists in cart
    return this.getCart().pipe(
      switchMap(cart => {
        const existingItem = cart.items?.find(item => 
          item.product?.id_product === currentItem.id_product
        );

        if (existingItem) {
          // If exists, just update quantity
          return this.updateCartItem(
            existingItem.id_item!, 
            currentItem.quantity // Use new quantity instead of adding
          );
        } else {
          // If doesn't exist, add as new item
          return this.http.get<any>(`${this.myAppUrl}api/products/${currentItem.id_product}`).pipe(
            switchMap(product => {
              return this.http.post<any>(
                `${this.myAppUrl}${this.myApiUrl}add`,
                {
                  id_product: currentItem.id_product,
                  quantity: currentItem.quantity,
                  price: product.price
                },
                { headers: this.getAuthHeaders() }
              );
            })
          );
        }
      }),
      // Process next item only after current one is complete
      switchMap(() => this.processItemsSequentially(remainingItems))
    );
  }
  getPendingItemsCount(): number {
    const pendingItems = this.getPendingItems();
    return pendingItems.reduce((acc, item) => acc + item.quantity, 0);
  }
}