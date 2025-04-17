import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../services/productos.services';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-featured-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './featured-products.component.html',
  styleUrls: ['./featured-products.component.css']
})
export class FeaturedProductsComponent implements OnInit, OnChanges {
  @Input() title: string = 'Productos Destacados';
  @Input() categoryId?: number; // Categoría para filtrar productos relacionados
  @Input() limit: number = 4; // Número de productos a mostrar

  products: any[] = [];
  loading: boolean = true;

  // Productos de ejemplo para usar cuando no hay productos reales
  exampleProducts: any[] = [
    { id_product: 1001, name: 'Producto de ejemplo 1', price: 123000, stock: 10, original_price: 150000 },
    { id_product: 1002, name: 'Producto de ejemplo 2', price: 123000, stock: 5, original_price: 140000 },
    { id_product: 1003, name: 'Producto de ejemplo 3', price: 123000, stock: 7, original_price: 130000 },
    { id_product: 1004, name: 'Producto de ejemplo 4', price: 123000, stock: 0, original_price: 145000 },
    { id_product: 1005, name: 'Producto de ejemplo 5', price: 123000, stock: 15, original_price: 160000 },
    { id_product: 1006, name: 'Producto de ejemplo 6', price: 123000, stock: 8, original_price: 135000 },
    { id_product: 1007, name: 'Producto de ejemplo 7', price: 123000, stock: 3, original_price: 128000 },
    { id_product: 1008, name: 'Producto de ejemplo 8', price: 123000, stock: 9, original_price: 155000 }
  ];

  // Array de rutas de imágenes estáticas para fallback
  fallbackImages: string[] = [
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
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia la categoría, recargar los productos
    if (changes['categoryId']) {
      this.loadProducts();
    }
  }

  loadProducts(): void {
    this.loading = true;

    // Si hay una categoría específica, cargar productos de esa categoría
    if (this.categoryId) {
      this.productService.getProductsByCategory(this.categoryId).subscribe({
        next: (products) => {
          console.log('Productos cargados por categoría:', products);
          
          // Debug: Verificar la estructura de las imágenes
          if (products.length > 0) {
            console.log('Primer producto ejemplo:', products[0]);
            console.log('Propiedades del primer producto:', Object.keys(products[0]));
            console.log('¿Tiene productImages?', products[0].hasOwnProperty('productImages'));
            console.log('¿Tiene images?', products[0].hasOwnProperty('images'));
          }
          
          // Limitar la cantidad de productos y excluir productos con stock 0
          this.products = products
            .filter(p => p.stock > 0)
            .slice(0, this.limit);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando productos relacionados:', error);
          this.loadFallbackProducts(); // Cargar productos genéricos en caso de error
        }
      });
    } else {
      // Si no hay categoría, cargar productos recientes
      this.loadFallbackProducts();
    }
  }

  loadFallbackProducts(): void {
    this.productService.getRecentProducts(this.limit).subscribe({
      next: (products) => {
        console.log('Productos recientes cargados:', products);
        
        // Debug: Verificar la estructura de las imágenes
        if (products.length > 0) {
          console.log('Primer producto reciente ejemplo:', products[0]);
          console.log('Propiedades del primer producto reciente:', Object.keys(products[0]));
          console.log('¿Tiene productImages?', products[0].hasOwnProperty('productImages'));
          console.log('¿Tiene images?', products[0].hasOwnProperty('images'));
          
          // Verificar la primera imagen si existe
          if (products[0].productImages && products[0].productImages.length > 0) {
            console.log('Primera imagen de productImages:', products[0].productImages[0]);
          } else if (products[0].images && products[0].images.length > 0) {
            console.log('Primera imagen de images:', products[0].images[0]);
          }
        }
        
        this.products = products.slice(0, this.limit);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando productos destacados:', error);
        this.products = [];
        this.loading = false;
      }
    });
  }

  // Método mejorado para obtener la imagen del producto
  getProductImage(product: any, index: number): string {
    // 1. Verificar si el producto tiene una imagen específica
    if (product) {
      // 1.1 Verificar productImages (imágenes de Cloudinary)
      if (product.productImages && Array.isArray(product.productImages) && product.productImages.length > 0) {
        // Buscar imagen principal
        const mainImage = product.productImages.find((img: any) => img.is_main);
        if (mainImage) {
          return mainImage.url;
        }
        // Si no hay imagen principal, usar la primera
        return product.productImages[0].url;
      }
      
      // 1.2 Verificar si hay array de imágenes clásico
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // Buscar imagen principal
        const mainImage = product.images.find((img: any) => img.is_main);
        if (mainImage && mainImage.url) {
          return mainImage.url;
        }
        // Si no hay imagen principal o no tiene url, usar la primera
        if (product.images[0].url) {
          return product.images[0].url;
        }
        // En caso de que el objeto sea la URL directamente
        return product.images[0]; 
      }
      
      // 1.3 Verificar si hay una imagen principal directa
      if (product.image_url) {
        return product.image_url;
      }
      
      // 1.4 Verificar campos alternativos
      if (product.image) {
        return product.image;
      }
      
      // 1.5 Verificar thumbnail (usado a veces)
      if (product.thumbnail) {
        return product.thumbnail;
      }
    }
    
    // 2. Si no hay imagen específica, usar imagen de fallback según el índice
    return this.fallbackImages[index % this.fallbackImages.length];
  }

  // Método para manejar errores de carga de imágenes
  handleImageError(event: any, index: number): void {
    console.error(`Error cargando imagen en índice ${index}`);
    
    // Reemplazar con imagen de respaldo si falla la carga
    const fallbackSrc = this.fallbackImages[index % this.fallbackImages.length];
    console.log(`Usando imagen de respaldo: ${fallbackSrc}`);
    event.target.src = fallbackSrc;
    
    // Eliminar clases que puedan interferir con la visualización
    event.target.classList.remove('img-contain');
    // Asegurarse de que no se redimensione mal
    event.target.style.objectFit = 'cover';
  }

  // MÉTODO PARA NAVEGAR AL DETALLE DEL PRODUCTO
  showProductDetail(productId: number): void {
    // Depuración para verificar que el método se está llamando
    console.log('Navegando al detalle del producto:', productId);
    
    // Usar el Router para navegar a la página de detalle
    this.router.navigate(['/shop-detail'], { 
      queryParams: { id: productId }
    }).then(() => {
      // Hacer scroll al inicio después de navegar
      window.scrollTo(0, 0);
    });
  }

  // Método para obtener el ID de un producto de ejemplo
  getExampleProductId(index: number): number {
    return this.exampleProducts[index] ? this.exampleProducts[index].id_product : 1000 + index;
  }

  // Método para obtener un producto de ejemplo completo
  getExampleProduct(index: number): any {
    return this.exampleProducts[index];
  }

  // NUEVO MÉTODO: Para agregar productos al carrito
  addToCart(product: any): void {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      this.toastr.info('Debes iniciar sesión para agregar productos al carrito');
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    // Verificar stock
    if (product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Agregar al carrito
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
}
