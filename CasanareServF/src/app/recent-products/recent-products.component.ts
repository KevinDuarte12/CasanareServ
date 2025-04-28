import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ProductService } from '../services/productos.services'; 
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environment/environment';

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
  apiBaseUrl: string;
  
  // Imágenes de respaldo si no hay URL disponible
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
  ) {
    // Base URL para imágenes
    this.apiBaseUrl = environment.endpoint;
  }

  ngOnInit(): void {
    this.loadRecentProducts();
  }

  // Método específico para obtener imágenes desde la estructura de Cloudinary
  getProductImage(product: any, index: number): string {
    if (!product) {
      return this.fallbackImages[index % this.fallbackImages.length];
    }
    
    try {
      // 1. Verificar si el producto tiene la propiedad 'images' como array
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // Buscar la imagen principal (is_main = 1)
        const mainImage = product.images.find((img: any) => img.is_main === 1 || img.is_main === true);
        
        if (mainImage && mainImage.url) {
          return mainImage.url;
        }
        
        // Si no hay imagen principal, usar la primera disponible
        return product.images[0].url || this.fallbackImages[index % this.fallbackImages.length];
      }
      
      // 2. Buscar en otros campos comunes de imágenes
      const imageFields = ['image_url', 'url', 'imagen', 'photo'];
      for (const field of imageFields) {
        if (product[field] && typeof product[field] === 'string') {
          return product[field];
        }
      }
      
      // 3. No se encontró ninguna imagen, usar imagen de respaldo
      return this.fallbackImages[index % this.fallbackImages.length];
    } catch (error) {
      return this.fallbackImages[index % this.fallbackImages.length];
    }
  }

  // Método auxiliar para formatear URLs de imágenes
  private formatImageUrl(url: string): string {
    if (!url) return '';
    
    // Si la URL es absoluta (comienza con http o https), usarla directamente
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Eliminar barras iniciales duplicadas
    const cleanUrl = url.replace(/^\/+/, '');
    
    // Combinar con la URL base
    return `${this.apiBaseUrl}/${cleanUrl}`;
  }

  // Modificar la función loadRecentProducts

  loadRecentProducts(): void {
    this.loading = true;
    
    this.productService.getRecentProducts().subscribe({
      next: (response: any) => {
        console.log('Productos recientes recibidos:', response);
        
        if (response && Array.isArray(response)) {
          this.recentProducts = response;
        } else {
          this.recentProducts = response.data || [];
        }
        
        // Usar el método de diagnóstico mejorado
        this.inspectProductsData(this.recentProducts);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando productos recientes:', error);
        this.toastr.error('Error al cargar productos recientes');
        this.loading = false;
        
        // Datos de muestra para la UI
        this.recentProducts = [
          { id_product: 1, name: 'Producto de ejemplo 1', price: 100000, stock: 10 },
          { id_product: 2, name: 'Producto de ejemplo 2', price: 200000, stock: 5 }
        ];
      }
    });
  }

  // Método para inspeccionar la estructura de datos de imágenes de productos
  private inspectImageStructure(products: any[]): void {
    if (!products || products.length === 0) {
      console.warn('No hay productos para inspeccionar');
      return;
    }
    
    console.log('===== DIAGNÓSTICO DE ESTRUCTURA DE IMÁGENES =====');
    
    // Obtener una muestra de los productos
    const sampleSize = Math.min(2, products.length);
    const sampleProducts = products.slice(0, sampleSize);
    
    sampleProducts.forEach((product, index) => {
      console.log(`\nProducto #${index + 1}: ${product.name || 'Sin nombre'} (ID: ${product.id_product || 'desconocido'})`);
      console.log('-------------------------------------');
      
      // Buscar campos relacionados con imágenes o con Cloudinary
      let cloudinaryImages = [];
      
      // Buscar si hay una propiedad de imágenes
      if (product.images) {
        console.log('✅ Propiedad "images" encontrada:');
        if (Array.isArray(product.images)) {
          console.log(`  - Array con ${product.images.length} elementos`);
          if (product.images.length > 0) {
            console.log('  - Primer elemento:');
            console.log(product.images[0]);
            cloudinaryImages = product.images;
          }
        } else {
          console.log(`  - Tipo: ${typeof product.images}`);
          console.log(product.images);
        }
      } else {
        console.log('❌ No se encontró propiedad "images"');
      }
      
      // Mostrar todas las propiedades del producto
      console.log('\nTodas las propiedades del producto:');
      console.log(Object.keys(product));
      
      // Si hay imágenes de Cloudinary, mostrarlas en formato de tabla
      if (cloudinaryImages.length > 0) {
        console.log('\nImágenes de Cloudinary:');
        const simplifiedImages = cloudinaryImages.map((img: any) => ({
          id: img.id,
          url: img.url ? (img.url.substring(0, 50) + '...') : 'N/A',
          public_id: img.public_id,
          is_main: img.is_main
        }));
        console.table(simplifiedImages);
      }
    });
    
    console.log('===== FIN DEL DIAGNÓSTICO =====');
  }

  // Método para inspeccionar y diagnosticar la estructura de productos e imágenes
  private inspectProductsData(products: any[]): void {
    if (!products || products.length === 0) {
      console.warn('❌ No hay productos para inspeccionar');
      return;
    }
    
    console.log('🔍 DIAGNÓSTICO DE RESPUESTA DE PRODUCTOS');
    console.log(`📊 Total de productos recibidos: ${products.length}`);
    
    // Tomar una muestra para no sobrecargar la consola
    const sample = products.slice(0, Math.min(2, products.length));
    
    sample.forEach((product, index) => {
      console.log(`\n📦 Producto #${index + 1}: ${product.name} (ID: ${product.id_product})`);
      
      // Verificar existencia de propiedades clave
      console.log('Propiedades principales:');
      ['id_product', 'name', 'price', 'stock', 'description', 'images'].forEach(prop => {
        const exists = product.hasOwnProperty(prop);
        const value = product[prop];
        const type = typeof value;
        const summary = Array.isArray(value) ? `Array[${value.length}]` : 
                        type === 'object' && value ? 'Object' : 
                        value === null ? 'null' : 
                        type === 'string' ? `"${value.substring(0, 30)}${value.length > 30 ? '...' : ''}"` : 
                        value;
        
        console.log(`  ${exists ? '✅' : '❌'} ${prop}: ${summary}`);
      });
      
      // Análisis específico de imágenes
      if (product.images) {
        console.log('\nDetalle de imágenes:');
        
        if (Array.isArray(product.images)) {
          console.log(`📸 ${product.images.length} imágenes encontradas`);
          
          product.images.forEach((img: any, imgIndex: number) => {
            console.log(`  Imagen #${imgIndex + 1}:`);
            if (typeof img === 'object') {
              ['id', 'url', 'is_main', 'public_id'].forEach(imgProp => {
                console.log(`    - ${imgProp}: ${img[imgProp] || 'N/A'}`);
              });
            } else {
              console.log(`    ${img}`);
            }
          });
        } else {
          console.log(`⚠️ 'images' no es un array: ${typeof product.images}`);
        }
      } else {
        console.log('❌ No se encontró la propiedad "images"');
        console.log('Todas las propiedades del producto:');
        console.log(Object.keys(product));
      }
    });
    
    console.log('\n🔍 FIN DEL DIAGNÓSTICO');
  }

  addToCart(product: any): void {
    // Verificar stock
    if (product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      // Obtener items pendientes actuales
      const pendingItems = this.cartService.getPendingItems();
      const existingItem = pendingItems.find(item => item.id_product === product.id_product);

      if (existingItem) {
        // Actualizar cantidad si ya existe
        existingItem.quantity += 1;
        localStorage.setItem('pendingCartItems', JSON.stringify(pendingItems));
        this.toastr.info('Cantidad actualizada en productos pendientes');
      } else {
        // Agregar nuevo item pendiente
        this.cartService.savePendingItem(product.id_product, 1);
      }

      this.toastr.info(
        `El producto ${product.name} se agregará a tu carrito después de iniciar sesión`,
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      this.router.navigate(['/login']);
      return;
    }

    // Si está autenticado, proceder con la adición al carrito
    this.cartService.addToCart(product.id_product, 1).subscribe({
      next: (response) => {
        if (response && !response.error) {
          this.toastr.success(`${product.name} agregado al carrito`);
        } else {
          this.toastr.error(response?.message || 'Error al agregar al carrito');
        }
      },
      error: (error) => {
        console.error('Error agregando al carrito:', error);
        this.toastr.error(error?.error?.msg || 'Error al agregar al carrito');
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

  // Método para manejar errores de carga de imágenes
  handleImageError(event: any, index: number): void {
    console.warn('Error al cargar imagen, usando fallback');
    event.target.src = this.fallbackImages[index % this.fallbackImages.length];
  }

  // Añadir este método al componente

  // Método para determinar qué clase CSS aplicar a la imagen según su proporción
  getImageClass(product: any, index: number): string {
    // Si no hay producto o está cargando, devolver clase por defecto
    if (!product) return 'img-contain';
    
    // Buscar la URL de la imagen
    const imageUrl = this.getProductImage(product, index);
    
    // Si usamos fallback, aplicar contain para evitar distorsión
    if (this.fallbackImages.includes(imageUrl)) {
      return 'img-contain';
    }
    
    // Las imágenes de productos pueden ser de formas muy variadas
    // Por ahora, aplicamos 'contain' a todas para evitar recortes
    return 'img-contain';
    
    // Nota: Si luego quieres ser más específico, puedes usar este código
    // para cargar la imagen y determinar su proporción:
    //
    // Podríamos intentar cargar la imagen y verificar su relación de aspecto
    // pero esto podría afectar el rendimiento. Otra opción es usar metadatos
    // si están disponibles en tu modelo de datos.
  }
}
