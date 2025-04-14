import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import {  Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/productos.services';
import { CategoryService } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription, Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, tap, map } from 'rxjs/operators';
import { Category } from '../interfaces/category';
import { BreadcrumbService } from '../services/breadcrumb.service';

// Importar componentes de layout
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { CategoryBadgeComponent } from '../shared/category-badge/category-badge.component';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [
    CommonModule,  
    FormsModule,
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent, // Asegúrate de que esté aquí
    FooterComponent,
    CategoryBadgeComponent
  ],
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.css']
})
export class TiendaComponent implements OnInit, OnDestroy {
  // Añade esta propiedad para el breadcrumb
  breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', link: '/' },
    { label: 'Tienda', link: null }
  ];

  // Variables para productos
  products: any[] = [];
  loading: boolean = true;
  
  // Variables para categorías
  categories: any[] = [];
  loadingCategories: boolean = true;
  selectedCategory: number | null = null;
  selectedCategoryData: Category | null = null;
  
  // Variables para filtro de precios
  priceRanges = [
    { min: 0, max: 100000 },
    { min: 100000, max: 300000 },
    { min: 300000, max: 500000 },
    { min: 500000, max: 1000000 },
    { min: 1000000, max: 10000000 }
  ];
  selectedPriceRange: number | null = null;
  
  // Variables para paginación
  currentPage: number = 1;
  pageSize: number = 12;
  totalPages: number = 0;
  totalProducts: number = 0;
  
  // Variables para móviles
  isMobile: boolean = false;
  showFilters: boolean = true;
  
  // Variable para búsqueda
  searchTerm: string = '';
  searchTerms = new Subject<string>();
  
  // Variable para ordenamiento
  currentSort: string = 'newest';
  sortMap: any = {
    'newest': { field: 'createdAt', order: 'desc' },
    'price-low': { field: 'price', order: 'asc' },
    'price-high': { field: 'price', order: 'desc' }
  };

  // Suscripciones
  private subscriptions: Subscription[] = [];

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
    private categoryService: CategoryService,
    private cartService: CartService,
    private authService: AuthService,
    private breadcrumbService: BreadcrumbService, // Añadir esto
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Configurar el flujo de búsqueda
    this.subscriptions.push(
      this.searchTerms.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe(term => {
        this.searchTerm = term;
        this.currentPage = 1;
        this.loadProducts();
      })
    );
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadCategoriesWithCounts();
    
    // Suscribirse a los cambios de breadcrumb
    this.subscriptions.push(
      this.breadcrumbService.breadcrumbs$.subscribe(breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      })
    );
    
    // Verificar si hay un parámetro 'category' en la URL al cargar la página
    const categoryParam = this.route.snapshot.queryParamMap.get('category');
    if (categoryParam) {
      const categoryId = Number(categoryParam);
      if (!isNaN(categoryId) && categoryId > 0) {
        this.selectedCategory = categoryId;
        // El resto de la configuración se hará en la suscripción a queryParams
      }
    }
    
    // Cargar categorías con conteo de productos
    this.loadCategoriesWithCounts();
    
    // Suscribirse a los cambios en los parámetros de consulta
    this.subscriptions.push(
      this.route.queryParams.subscribe(params => {
        // Recuperar parámetros
        this.currentPage = params['page'] ? Number(params['page']) : 1;
        this.pageSize = params['limit'] ? Number(params['limit']) : 12;
        this.selectedCategory = params['category'] ? Number(params['category']) : null;
        this.currentSort = params['sort'] || 'newest';
        this.searchTerm = params['search'] || '';
        
        if (params['priceRange'] !== undefined) {
          this.selectedPriceRange = Number(params['priceRange']);
        }
        
        // Si hay una categoría seleccionada, buscar su información
        if (this.selectedCategory !== null) {
          this.updateSelectedCategoryData();
        } else {
          this.selectedCategoryData = null;
        }
        
        // Cargar productos con los filtros actuales
        this.loadProducts();

        // Actualizar breadcrumb si hay una categoría seleccionada
        if (this.selectedCategory !== null && this.selectedCategoryData) {
          const customBreadcrumbs = [
            { label: 'Home', link: '/' },
            { label: 'Tienda', link: '/shop' },
            { label: this.selectedCategoryData.name, link: null }
          ];
          this.breadcrumbService.setBreadcrumbs(customBreadcrumbs);
        }
      })
    );
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 992; // Bootstrap lg breakpoint
    this.showFilters = !this.isMobile;
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Método para obtener la imagen según el índice del producto
  getProductImage(index: number): string {
    return this.productImages[index % this.productImages.length];
  }

  // Cargar categorías con conteo de productos
  loadCategoriesWithCounts(): void {
    this.loadingCategories = true;
    
    // Primero cargar las categorías básicas para mostrar algo rápidamente
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        // Asignar categorías sin conteo primero para mostrarlas mientras se cargan los conteos
        this.categories = categories.map(cat => ({
          ...cat,
          productCount: 0 // Inicialmente a 0
        }));
        
        // Luego solicitar los conteos
        this.loadCategoryCounts(categories);
      },
      error: (error) => {
        console.error('Error cargando categorías:', error);
        this.toastr.error('Error al cargar categorías');
        this.loadingCategories = false;
      }
    });
  }

  // Cargar los conteos de productos por categoría (en segundo plano)
  loadCategoryCounts(categories: any[]): void {
    const validCategories = categories.filter(category => 
      category.id_category !== undefined && 
      category.id_category !== null
    );
    
    // Crear un array de observables para cada categoría
    const requests = validCategories.map(category => {
      const categoryId = category.id_category as number;
      
      return this.productService.getProductsByCategory(categoryId).pipe(
        map(products => ({
          categoryId,
          count: products.length
        }))
      );
    });
    
    // Procesar en paralelo
    forkJoin(requests).subscribe({
      next: (results) => {
        // Actualizar los conteos en las categorías existentes
        this.categories = this.categories.map(category => {
          const result = results.find(r => r.categoryId === category.id_category);
          return {
            ...category,
            productCount: result ? result.count : 0
          };
        });
        
        // Actualizar información de la categoría seleccionada si hay alguna
        if (this.selectedCategory !== null) {
          this.updateSelectedCategoryData();
        }
        
        this.loadingCategories = false;
      },
      error: (error) => {
        console.error('Error al cargar conteo de productos:', error);
        this.loadingCategories = false;
      }
    });
  }

  // Actualizar información de la categoría seleccionada
  updateSelectedCategoryData(): void {
    if (this.selectedCategory === null) {
      this.selectedCategoryData = null;
      return;
    }
    
    const categoryData = this.categories.find(cat => cat.id_category === this.selectedCategory);
    if (categoryData) {
      this.selectedCategoryData = categoryData;
    } else {
      // Si no encontramos la información en la lista actual, la buscamos con una llamada API
      this.categoryService.getCategory(this.selectedCategory).subscribe({
        next: (category) => {
          this.selectedCategoryData = category;
        },
        error: () => {
          this.selectedCategoryData = null;
        }
      });
    }
  }

  // Cargar productos con paginación y filtros
  loadProducts(): void {
    this.loading = true;
    
    // Preparar opciones de filtrado
    const options: any = {};
    
    // Añadir categoría si está seleccionada
    if (this.selectedCategory !== null) {
      options.categoryId = this.selectedCategory;
    }
    
    // Añadir rango de precios si está seleccionado
    if (this.selectedPriceRange !== null) {
      options.minPrice = this.priceRanges[this.selectedPriceRange].min;
      options.maxPrice = this.priceRanges[this.selectedPriceRange].max;
    }
    
    // Añadir término de búsqueda si existe
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      options.search = this.searchTerm.trim();
    }
    
    // Añadir opciones de ordenamiento
    if (this.currentSort) {
      const sortDetails = this.sortMap[this.currentSort];
      options.sortBy = sortDetails.field;
      options.sortOrder = sortDetails.order;
    }
    
    // Llamar al servicio con paginación
    this.productService.getAllProductsPaginated(
      this.currentPage,
      this.pageSize,
      options
    ).subscribe({
      next: (response) => {
        console.log('Respuesta de productos paginados:', response);
        
        // Verificar estructura de respuesta del backend
        this.products = response.data || [];
        this.totalProducts = response.meta?.total || 0;
        this.totalPages = response.meta?.totalPages || 1;
        
        // Actualizar la URL con los filtros actuales (sin recargar la página)
        this.updateUrlWithFilters();
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando productos:', error);
        this.toastr.error('Error al cargar productos');
        this.loading = false;
        
        // Datos de muestra para evitar vista vacía en caso de error
        this.products = [
          { id_product: 1, name: 'Producto de ejemplo 1', price: 100000, stock: 10 },
          { id_product: 2, name: 'Producto de ejemplo 2', price: 200000, stock: 5 },
          { id_product: 3, name: 'Producto de ejemplo 3', price: 300000, stock: 0 }
        ];
        
        this.totalProducts = this.products.length;
        this.totalPages = 1;
      }
    });
  }

  // Actualizar URL con los filtros actuales
  updateUrlWithFilters(): void {
    const queryParams: any = {
      page: this.currentPage,
      limit: this.pageSize
    };
    
    if (this.selectedCategory !== null) {
      queryParams.category = this.selectedCategory;
    }
    
    if (this.selectedPriceRange !== null) {
      queryParams.priceRange = this.selectedPriceRange;
    }
    
    if (this.currentSort !== 'newest') {
      queryParams.sort = this.currentSort;
    }
    
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      queryParams.search = this.searchTerm;
    }
    
    // Actualizar URL sin navegar (solo cambiar historia)
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: queryParams,
      replaceUrl: true
    });
  }

  // Filtrar por categoría
  filterByCategory(categoryId: number | null): void {
    // Guardar el estado anterior para comparación
    const previousCategory = this.selectedCategory;
    
    this.selectedCategory = categoryId;
    
    // Actualizar información de la categoría seleccionada
    if (categoryId !== null) {
      this.updateSelectedCategoryData();
      
      // Si es una nueva selección (no estamos deseleccionando), hacer scroll
      if (previousCategory !== categoryId) {
        // Dar tiempo para que la UI se actualice
        setTimeout(() => {
          // Hacer scroll a los productos si estamos en móvil
          if (this.isMobile) {
            const productsSection = document.querySelector('.shop-product');
            if (productsSection) {
              productsSection.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 100);
      }
    } else {
      this.selectedCategoryData = null;
    }
    
    this.currentPage = 1; // Volver a la primera página
    this.loadProducts();
  }

  // Filtrar por precio
  filterByPrice(rangeIndex: number | null): void {
    this.selectedPriceRange = rangeIndex;
    this.currentPage = 1; // Volver a la primera página
    this.loadProducts();
  }

  // Ordenar productos
  sortProducts(sortBy: string): void {
    this.currentSort = sortBy;
    this.currentPage = 1; // Volver a la primera página
    this.loadProducts();
  }

  // Manejar entrada en campo de búsqueda
  onSearchInput(event: any): void {
    this.searchTerms.next(event.target.value);
  }

  // Cambiar página
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadProducts();
    
    // Scroll al inicio de los resultados para móviles
    if (this.isMobile) {
      const productsSection = document.querySelector('.row.pb-3');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Obtener array con números de página para la paginación
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = this.isMobile ? 3 : 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Mostrar todas las páginas si son menos del máximo
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar un rango de páginas alrededor de la página actual
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
      
      // Ajustar si estamos cerca del final
      if (endPage === this.totalPages) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // Cambiar tamaño de página
  changePageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadProducts();
  }

  // Resetear todos los filtros
  resetFilters(): void {
    this.selectedCategory = null;
    this.selectedCategoryData = null;
    this.selectedPriceRange = null;
    this.currentSort = 'newest';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadProducts();
  }

  // Agregar producto al carrito
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

  // Mostrar detalle de producto
  showProductDetail(productId: number): void {
    this.router.navigate(['/shop-detail'], { 
      queryParams: { id: productId }
    }).then(() => {
      // Hacer scroll al inicio
      window.scrollTo(0, 0);
    });
  }

  // Método para animar la entrada de categorías
  getCategoryAnimationDelay(index: number): string {
    // Retraso escalonado para cada categoría (0.05s entre cada una)
    return `${0.1 + (index * 0.05)}s`;
  }
}