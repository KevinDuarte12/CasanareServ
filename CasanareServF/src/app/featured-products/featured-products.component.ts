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
      // Este tipo de filtro se tendría que hacer en el frontend porque
      // getProductsByCategory no soporta parámetro de tipo todavía
      this.productService.getProductsByCategory(this.categoryId).subscribe({
        next: (products) => {
          console.log('Productos cargados por categoría:', products);
          
          // Debug info...
          
          // Filtrar: productos con stock > 0 Y de tipo regular
          this.products = products
            .filter(p => {
              // Primero verificar stock
              if (p.stock <= 0) return false;
              
              // Luego verificar tipo
              if (!p.type) return true; // Si no tiene tipo, asumimos que es regular
              if (p.type === 'regular') return true;
              return p.type !== 'barter'; // Excluir productos de trueque
            })
            .slice(0, this.limit);
          
          // Si no hay suficientes productos, cargar más productos regulares desde la API
          if (this.products.length < this.limit) {
            console.log(`Solo se encontraron ${this.products.length} productos regulares por categoría, cargando productos adicionales...`);
            this.loadAdditionalRegularProducts(this.limit - this.products.length);
          } else {
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error cargando productos relacionados:', error);
          this.loadFallbackProducts(); // Cargar productos genéricos en caso de error
        }
      });
    } else {
      // Si no hay categoría, cargar productos recientes de tipo regular
      this.loadFallbackProducts();
    }
  }

  // Método adicional para cargar más productos regulares si se necesitan
  private loadAdditionalRegularProducts(count: number): void {
    if (count <= 0) {
      this.loading = false;
      return;
    }
    
    this.productService.getRecentProducts(count, 'regular').subscribe({
      next: (additionalProducts) => {
        // Añadir productos regulares adicionales, evitando duplicados
        const existingIds = new Set(this.products.map(p => p.id_product));
        const newProducts = additionalProducts.filter(p => !existingIds.has(p.id_product));
        
        this.products = [...this.products, ...newProducts.slice(0, count)];
        console.log(`Añadidos ${newProducts.length} productos regulares adicionales`);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando productos adicionales:', error);
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
    // Verificar que el producto tenga un ID
    if (!product.id_product) {
      this.toastr.warning('No se puede agregar este producto al carrito');
      return;
    }

    // ✅ NUEVA VALIDACIÓN: Verificar si el usuario es propietario del producto
    if (this.isProductOwner(product)) {
      this.toastr.info('Este es tu producto, no puedes agregarlo al carrito', 'Información', {
        timeOut: 4000,
        closeButton: true
      });
      return;
    }

    // Verificar stock primero
    if (product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      // Guardar el producto en el carrito pendiente
      this.cartService.savePendingItem(product.id_product, 1);
      
      // Mostrar mensaje al usuario
      this.toastr.info(
        `${product.name} se agregará a tu carrito al iniciar sesión`,
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      // Guardar la URL actual para volver después del login
      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);

      // Navegar a la página de login
      this.router.navigate(['/login']);
      return;
    }

    // Si está autenticado, proceder normalmente
    this.cartService.addToCart(product.id_product, 1).subscribe({
      next: (response) => {
        if (response.success !== false) {
          this.toastr.success(`${product.name} agregado al carrito`);
        } else {
          this.toastr.error(response.message || 'Error al agregar al carrito');
        }
      },
      error: (error) => {
        console.error('Error agregando al carrito:', error);
        
        // ✅ MANEJAR EL ERROR HTTP 403 ESPECÍFICO CON MENSAJE INFORMATIVO
        if (error.status === 403 && error.error?.code === 'CANNOT_BUY_OWN_PRODUCT') {
          this.toastr.info('Este es tu producto, no puedes agregarlo al carrito', 'Información', {
            timeOut: 4000,
            closeButton: true
          });
        } else if (error.status === 400 && error.error?.code === 'INSUFFICIENT_STOCK') {
          this.toastr.warning('No hay suficiente stock disponible', 'Stock insuficiente');
        } else if (error.status === 404) {
          this.toastr.error('Producto no encontrado', 'Error');
        } else {
          this.toastr.error('Error al agregar al carrito');
        }
      }
    });
  }

  // ✅ AGREGAR: Método helper para verificar si el usuario es propietario del producto
  isProductOwner(product: any): boolean {
    const currentUserId = this.authService.getCurrentUserId();
    if (!currentUserId || !product) {
      return false;
    }
    
    // Usar solo 'id_user' según tu interfaz Product
    return product.id_user === currentUserId;
  }

  // Añadir este método después de loadAdditionalRegularProducts
  private loadFallbackProducts(): void {
    // Solicitar productos recientes, específicamente de tipo 'regular'
    this.productService.getRecentProducts(this.limit * 2, 'regular').subscribe({
      next: (products) => {
        console.log('Cargando productos recientes de tipo regular:', products);
        
        // Verificar estructura (diagnóstico)
        if (products.length > 0) {
          console.log('Estructura del primer producto:', Object.keys(products[0]));
        }
        
        // Limitar al número especificado
        this.products = products.slice(0, this.limit);
        
        console.log(`Mostrando ${this.products.length} productos recientes regulares`);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando productos recientes:', error);
        
        // Si hay un error, usar productos de ejemplo en su lugar
        this.products = this.exampleProducts.slice(0, this.limit);
        this.loading = false;
      }
    });
  }
}
