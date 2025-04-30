import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ProductService } from '../services/productos.services'; 
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environment/environment';
import { Product } from '../interfaces/product';

@Component({
  selector: 'app-recent-products',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './recent-products.component.html',
  styleUrls: ['./recent-products.component.css']
})
export class RecentProductsComponent implements OnInit {
  recentProducts: Product[] = [];
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
  getProductImage(product: Product, index: number): string {
    if (!product) {
      return this.fallbackImages[index % this.fallbackImages.length];
    }
    
    try {
      // 1. Verificar si el producto tiene la propiedad 'images' como array
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        // Buscar la imagen principal con manejo correcto de tipos
        const mainImage = product.images.find(img => {
          // Verificar el tipo de is_main y comparar apropiadamente
          if (typeof img.is_main === 'boolean') {
            return img.is_main === true;
          } else if (typeof img.is_main === 'number') {
            return img.is_main === 1;
          } else if (typeof img.is_main === 'string') {
            // Corregir aquí - verificar primero que is_main existe y es string
            const isMainStr = img.is_main as string;
            return isMainStr === '1' || isMainStr.toLowerCase() === 'true';
          }
          return false;
        });
        
        if (mainImage && mainImage.url) {
          return mainImage.url;
        }
        
        // Si no hay imagen principal, usar la primera disponible
        const firstImage = product.images[0];
        return firstImage && firstImage.url ? firstImage.url : this.fallbackImages[index % this.fallbackImages.length];
      }
      
      // 2. Buscar en img_url si existe
      if (product.img_url) {
        return product.img_url;
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

  // Método actualizado para cargar productos recientes
  loadRecentProducts(): void {
    this.loading = true;
    
    // Solicitar más productos (12) para compensar los que serán filtrados
    this.productService.getRecentProducts(12).subscribe({
      next: (response: any) => {
        console.log('Productos recientes recibidos:', response);
        
        // Procesamiento inicial de la respuesta
        let products: Product[] = [];
        
        if (response && Array.isArray(response)) {
          products = response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          const responseData = response as { data: Product[] };
          products = Array.isArray(responseData.data) ? responseData.data : [];
        }
        
        console.log('Todos los productos sin filtrar:', products.length);
        
        // Filtrar productos de tipo regular primero
        const regularProducts = products.filter(product => {
          if (!product.type) return true;
          if (product.type === 'regular') return true;
          return product.type !== 'barter';
        });
        
        console.log(`Productos regulares encontrados: ${regularProducts.length}`);
        
        // Si hay suficientes productos regulares, usar solo esos (hasta 8)
        if (regularProducts.length >= 8) {
          this.recentProducts = regularProducts.slice(0, 8);
        } else {
          // Si no hay suficientes productos regulares, añadir algunos de tipo barter
          // para completar los 8 productos
          const barterProducts = products.filter(p => p.type === 'barter');
          const neededBarterCount = Math.min(8 - regularProducts.length, barterProducts.length);
          
          this.recentProducts = [
            ...regularProducts,
            ...barterProducts.slice(0, neededBarterCount)
          ];
          
          console.log(`Añadidos ${neededBarterCount} productos de trueque para completar 8`);
        }
        
        // Limitar a exactamente 8 productos
        this.recentProducts = this.recentProducts.slice(0, 8);
        
        console.log(`Mostrando ${this.recentProducts.length} productos recientes en total`);
        
        // Resto del código sin cambios...
        this.inspectProductsData(this.recentProducts);
        this.loading = false;
      },
      error: (error) => {
        // El código original de manejo de errores
        console.error('Error cargando productos recientes:', error);
        this.toastr.error('Error al cargar productos recientes');
        this.loading = false;
        
        // Datos de muestra para la UI
        this.recentProducts = [
          { 
            id_product: 1, 
            name: 'Producto de ejemplo 1', 
            price: 100000, 
            stock: 10, 
            type: 'regular',
            id_user: 1,
            id_category: 1
          },
          // ...más productos de ejemplo
        ];
      }
    });
  }

  // Método para verificar si un producto es de tipo regular (venta)
  isRegularProduct(product: Product): boolean {
    return product.type === 'regular';
  }

  // Método para inspeccionar la estructura de datos de imágenes de productos
  private inspectImageStructure(products: Product[]): void {
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
      let cloudinaryImages: any[] = [];
      
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
  private inspectProductsData(products: Product[]): void {
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
      console.log(`   Tipo: ${product.type || 'no especificado'}`);
      
      // Verificar existencia de propiedades clave
      console.log('Propiedades principales:');
      ['id_product', 'name', 'price', 'stock', 'description', 'images', 'type'].forEach(prop => {
        const exists = product.hasOwnProperty(prop);
        const value = product[prop as keyof Product];
        const type = typeof value;
        const summary = Array.isArray(value) ? `Array[${value.length}]` : 
                        type === 'object' && value ? 'Object' : 
                        value === null ? 'null' : 
                        type === 'string' ? `"${(value as string).substring(0, 30)}${(value as string).length > 30 ? '...' : ''}"` : 
                        value;
        
        console.log(`  ${exists ? '✅' : '❌'} ${prop}: ${summary}`);
      });
      
      // Análisis específico de imágenes
      if (product.images) {
        console.log('\nDetalle de imágenes:');
        
        if (Array.isArray(product.images)) {
          console.log(`📸 ${product.images.length} imágenes encontradas`);
          
          product.images.forEach((img, imgIndex) => {
            console.log(`  Imagen #${imgIndex + 1}:`);
            if (typeof img === 'object' && img !== null) {
              ['id', 'url', 'is_main', 'public_id'].forEach(imgProp => {
                console.log(`    - ${imgProp}: ${(img as any)[imgProp] || 'N/A'}`);
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

  addToCart(product: Product): void {
    // Verificar que el producto tenga un ID
    if (product.id_product === undefined) {
      this.toastr.warning('No se puede agregar este producto al carrito');
      return;
    }
    
    // Verificar stock primero
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

  showProductDetail(productId: number | undefined): void {
    // Validar que el ID exista y sea válido
    if (productId === undefined || productId === null) {
      this.toastr.warning('No se puede mostrar el detalle de este producto');
      return;
    }
    
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

  // Método para determinar qué clase CSS aplicar a la imagen según su proporción
  getImageClass(product: Product, index: number): string {
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
  }
}
