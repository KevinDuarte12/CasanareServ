import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule, Router } from '@angular/router';
import { CategoryService } from '../services/category.service';
import { Category } from '../interfaces/category';
import { ProductService } from '../services/productos.services';
import { forkJoin, map, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  displayedCategories: any[] = []; // Categorías con conteo de productos
  loading: boolean = true;
  maxCategoriesToShow: number = 12;

  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private toastr: ToastrService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    this.verifyStaticImages();
  }

  loadCategories(): void {
    this.loading = true;

    // Obtener todas las categorías y todos los productos en paralelo
    forkJoin({
      categories: this.categoryService.getCategories(),
      products: this.productService.getRecentProducts()
    }).subscribe({
      next: (result) => {
        console.log('Datos cargados (resultado completo):', result);
        this.categories = result.categories;
        
        // Depuración detallada de la primera categoría
        if (this.categories.length > 0) {
          console.log('ANÁLISIS DETALLADO DE LA PRIMERA CATEGORÍA:');
          console.log('Objeto completo:', this.categories[0]);
          console.log('Keys/propiedades:', Object.keys(this.categories[0]));
          console.log('Tiene images?', this.categories[0].hasOwnProperty('images'));
          console.log('Tiene categoryImages?', this.categories[0].hasOwnProperty('categoryImages'));
          console.log('Tiene image?', this.categories[0].hasOwnProperty('image'));
          
          // Si tiene imágenes, analizar su estructura
          if (this.categories[0].images) {
            console.log('Estructura de la primera imagen:',
                this.categories[0].images[0]);
          }
        }
        
        // Limitar a 12 categorías
        const limitedCategories = this.categories.slice(0, this.maxCategoriesToShow);
        
        // Para depuración, verificar si las categorías tienen imágenes
        limitedCategories.forEach(category => {
          console.log(`Categoría ${category.name} - imágenes:`, 
            category.images || 'Sin imágenes');
        });
        
        // Calcular conteo de productos para cada categoría
        this.loadProductCounts(limitedCategories);
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.toastr.error('Error al cargar datos');
        this.loading = false;
      }
    });
  }

  loadProductCounts(categories: Category[]): void {
    console.log('Iniciando conteo de productos para categorías:', categories);
    
    // Filtrar categorías que tienen un id_category definido
    const validCategories = categories.filter(category => 
      category.id_category !== undefined && 
      category.id_category !== null
    );
    
    console.log('Categorías válidas para obtener conteo:', validCategories);
    
    if (validCategories.length === 0) {
      console.warn('No se encontraron categorías válidas con id_category');
      this.displayedCategories = [];
      this.loading = false;
      return;
    }
    
    // Crear un array de observables para cada categoría válida
    const requests = validCategories.map(category => {
      const categoryId = category.id_category as number;
      console.log(`Solicitando productos para categoría ID ${categoryId} (${category.name})`);
      
      return this.productService.getProductsByCategory(categoryId).pipe(
        tap(products => {
          console.log(`Categoría ${category.name}: ${products.length} productos encontrados`);
        }),
        map(products => ({
          ...category,
          productCount: products.length,
          // Obtener la URL de la imagen (si existe)
          imageUrl: this.getCategoryImageUrl(category, validCategories.indexOf(category))
        }))
      );
    });

    // Esperar que se completen todas las solicitudes
    console.log(`Esperando resultados para ${requests.length} categorías`);
    forkJoin(requests).subscribe({
      next: (categoriesWithCount) => {
        console.log('Categorías con conteo completado:', categoriesWithCount);
        this.displayedCategories = categoriesWithCount;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar conteo de productos:', error);
        
        // En caso de error, mostrar las categorías sin conteo
        this.displayedCategories = validCategories.map((cat, index) => ({
          ...cat,
          productCount: 0,
          imageUrl: this.getCategoryImageUrl(cat, index)
        }));
        
        this.loading = false;
      }
    });
  }

  // Método para obtener la URL de la imagen de categoría
  getCategoryImageUrl(category: Category, index: number): string {
    // 1. Primero revisar si hay imágenes en categoryImages (Cloudinary)
    if (category.categoryImages && category.categoryImages.length > 0) {
      // Buscar primero la imagen principal
      const mainImage = category.categoryImages.find(img => img.is_main);
      if (mainImage) {
        console.log(`Usando imagen principal de Cloudinary para ${category.name}:`, mainImage.url);
        return mainImage.url;
      }
      // Si no hay imagen principal, usar la primera
      console.log(`Usando primera imagen de Cloudinary para ${category.name}:`, category.categoryImages[0].url);
      return category.categoryImages[0].url;
    }
    
    // 2. Si la categoría tiene un campo image directo, usarlo
    if (category.image && category.image.trim() !== '') {
      console.log(`Usando imagen directa para ${category.name}:`, category.image);
      return category.image;
    }
    
    // 3. Si la categoría tiene imágenes en el arreglo images, usar la primera
    if (category.images && category.images.length > 0) {
      // Buscar primero la imagen principal
      const mainImage = category.images.find(img => img.is_main);
      if (mainImage) {
        console.log(`Usando imagen principal para ${category.name}:`, mainImage.url);
        return mainImage.url;
      }
      // Si no hay imagen principal, usar la primera
      console.log(`Usando primera imagen para ${category.name}:`, category.images[0].url);
      return category.images[0].url;
    }
    
    // 4. Usar imágenes estáticas en rotación (1-4)
    // Usar rutas absolutas con / al principio
    const staticImage = `/img/cat-${(index % 4) + 1}.jpg`;
    console.log(`Usando imagen estática para ${category.name}:`, staticImage);
    return staticImage;
  }

  // Método para determinar si se debe usar la clase img-contain
  shouldUseContainClass(imageUrl: string): boolean {
    // Si no hay URL o es una imagen estática predeterminada, usar 'cover'
    if (!imageUrl || imageUrl.includes('/img/cat-') || imageUrl.includes('img/cat-')) {
      return false;
    }
    
    // Para imágenes de Cloudinary, verificar si es una transformación específica
    if (imageUrl.includes('cloudinary.com')) {
      // Si la URL contiene 'upload/c_', significa que ya tiene transformaciones específicas
      if (imageUrl.includes('/upload/c_')) {
        return false; // Respetar las transformaciones existentes
      }
      
      // Para imágenes de productos, normalmente 'contain' es mejor
      if (imageUrl.includes('/products/') || imageUrl.includes('/product/')) {
        return true;
      }
      
      // Para imágenes de categoría, normalmente 'cover' es mejor para llenar el espacio
      if (imageUrl.includes('/categorys/') || 
          imageUrl.includes('/category/') || 
          imageUrl.includes('/categories/')) {
        return false;
      }
    }
    
    // Para imágenes cargadas por el usuario, generalmente 'contain' es mejor
    return true;
  }

  // Añadir este método para manejar la navegación a la tienda
  navigateToCategory(categoryId: number, event: Event): void {
    // Prevenir el comportamiento por defecto del enlace
    event.preventDefault();
    
    // Navegar a la tienda con el parámetro de categoría
    this.router.navigate(['/tienda'], { 
      queryParams: { category: categoryId } 
    }).then(() => {
      // Hacer scroll al inicio de la página después de la navegación
      window.scrollTo(0, 0);
    });
  }

  // Función para manejar errores de carga de imagen
  handleImageError(event: Event, index: number): void {
    const imgElement = event.target as HTMLImageElement;
    console.error(`Error cargando imagen: ${imgElement.src}`);
    
    // Usar ruta absoluta con / al principio
    const fallbackImage = `/img/cat-${(index % 4) + 1}.jpg`;
    
    console.log(`Cambiando a imagen de respaldo: ${fallbackImage}`);
    imgElement.src = fallbackImage;
    
    // Cambiar clase para usar 'cover' en vez de 'contain'
    imgElement.classList.remove('img-contain');
  }

  // Método para verificar si las imágenes estáticas existen
  verifyStaticImages(): void {
    console.log('Verificando imágenes estáticas...');
    
    const basePaths = [
      '/img/',
      '/assets/img/',
      'img/',
      'assets/img/',
      '../img/',
      '../assets/img/'
    ];
    
    for (const basePath of basePaths) {
      for (let i = 1; i <= 4; i++) {
        const img = new Image();
        const src = `${basePath}cat-${i}.jpg`;
        img.onload = () => console.log(`✅ Imagen encontrada: ${src}`);
        img.onerror = () => console.log(`❌ Imagen NO encontrada: ${src}`);
        img.src = src;
      }
    }
  }
}
