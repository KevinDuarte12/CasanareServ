import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ProductService } from '../services/productos.services'; 
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-recent-products',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './recent-products.component.html',
  styleUrls: ['./recent-products.component.css']
})
export class RecentProductsComponent implements OnInit {
  recentProducts: any[] = [];
  loading: boolean = true;
  
  // Array de rutas de imágenes estáticas de la plantilla
  productImages: string[] = [
    'img/product-1.jpg', 
    'img/product-2.jpg', 
    'img/product-3.jpg', 
    'img/product-4.jpg',
    'img/product-5.jpg', 
    'img/product-6.jpg', 
    'img/product-7.jpg', 
    'img/product-8.jpg'
  ];

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadRecentProducts();
  }

  // Método para obtener la imagen según el índice del producto
  getProductImage(index: number): string {
    // Si el índice es mayor que las imágenes disponibles, volver al principio
    return this.productImages[index % this.productImages.length];
  }

  loadRecentProducts(): void {
    this.loading = true;
    
    // Llamar al servicio para obtener productos recientes
    this.productService.getRecentProducts().subscribe({
      next: (response: any) => {
        console.log('Productos recientes recibidos:', response);
        if (response && Array.isArray(response)) {
          this.recentProducts = response;
        } else {
          this.recentProducts = response.data || [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando productos recientes:', error);
        this.toastr.error('Error al cargar productos recientes');
        this.loading = false;
        
        // Mostrar algunos datos de muestra para que la UI no esté vacía
        this.recentProducts = [
          { id_product: 1, name: 'Producto de ejemplo 1', price: 100000, stock: 10 },
          { id_product: 2, name: 'Producto de ejemplo 2', price: 200000, stock: 5 }
        ];
      }
    });
  }

  addToCart(product: any): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Debes iniciar sesión para agregar productos al carrito');
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/shop' } });
      return;
    }

    // Verificar stock
    if (product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Agregar al carrito - Parámetros separados
    this.cartService.addToCart(product.id_product, 1).subscribe({
      next: () => {
        this.toastr.success(`${product.name} agregado al carrito`);
      },
      error: (error) => {
        console.error('Error agregando al carrito:', error);
        this.toastr.error('Error al agregar al carrito');
      }
    });
  }

  showProductDetail(productId: number): void {
    // Navegamos a la página de detalle
    this.router.navigate(['/shop-detail'], { 
      queryParams: { id: productId },
    }).then(() => {
      // Una vez completada la navegación, hacemos scroll al inicio
      window.scrollTo(0, 0);
    });
  }
}
