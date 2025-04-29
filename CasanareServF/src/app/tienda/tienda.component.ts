import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/productos.services';
import { CategoryService } from '../services/category.service';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { BarterService } from '../services/barter.service';
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

// Importar las interfaces
import { Product } from '../interfaces/product';
import { Image } from '../interfaces/image';
import { Barter } from '../interfaces/barter';
import { environment } from '../../environment/environment';

@Component({
  selector: 'app-tienda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    NavbarComponent,
    BreadcrumbComponent,
    FooterComponent,
    CategoryBadgeComponent,
    RouterModule
  ],
  templateUrl: './tienda.component.html',
  styleUrls: ['./tienda.component.css']
})
export class TiendaComponent implements OnInit, OnDestroy {
  // Propiedades para el manejo de pestañas
  activeTab: 'products' | 'barters' = 'products';

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

  // Propiedades para trueques
  barters: any[] = []; // Cambiar de Barter[] a any[]
  loadingBarters: boolean = false;
  barterSearchTerm: string = '';
  barterSearchTerms = new Subject<string>();
  selectedBarterStatus: string | null = null;
  // Agregar propiedad para almacenar la categoría seleccionada
  selectedBarterCategory: number | null = null;
  barterCurrentPage: number = 1;
  barterPageSize: number = 10;
  barterTotalPages: number = 0;
  barterTotalItems: number = 0;

  // Añade esta propiedad al componente
  barterCurrentSort: string = 'newest';

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
    public authService: AuthService,  // Hecho público para acceder desde el template
    private barterService: BarterService,
    private breadcrumbService: BreadcrumbService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private viewportScroller: ViewportScroller
  ) {
    // Configurar el flujo de búsqueda para productos
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

    // Configurar flujo de búsqueda para trueques
    this.subscriptions.push(
      this.barterSearchTerms.pipe(
        debounceTime(500),
        distinctUntilChanged()
      ).subscribe(term => {
        this.barterSearchTerm = term;
        this.barterCurrentPage = 1;
        this.loadBarters();
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

    // Verificar si hay un parámetro 'tab' en la URL
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'barters') {
      this.activeTab = 'barters';
      this.loadBarters(); // Cargar trueques si la pestaña es 'barters'
    }

    // Verificar si hay un parámetro 'category' en la URL al cargar la página
    const categoryParam = this.route.snapshot.queryParamMap.get('category');
    if (categoryParam) {
      const categoryId = Number(categoryParam);
      if (!isNaN(categoryId) && categoryId > 0) {
        this.selectedCategory = categoryId;
        // El resto de la configuración se hará en la suscripción a queryParams
      }
    }

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

    // Suscribirse a cambios en autenticación
    this.subscriptions.push(
      this.authService.authStatusChanged.subscribe(() => {
        // No necesitamos guardar el estado en una propiedad, 
        // usaremos el método isAuthenticated() directamente en la plantilla
      })
    );

    this.viewportScroller.scrollToPosition([0, 0]);
  }

  ngOnDestroy(): void {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Método helper para usar en el template
  isUserAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  // Métodos para pestañas
  setActiveTab(tab: 'products' | 'barters'): void {
    if (this.activeTab === tab) return;

    this.activeTab = tab;

    // Actualizar URL con la pestaña activa
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });

    // Cargar datos según la pestaña seleccionada
    if (tab === 'products') {
      this.loadProducts(); // Cargar productos regulares
    } else if (tab === 'barters') {
      this.loadBarters(); // Usar el método original pero modificado
    }
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 992; // Bootstrap lg breakpoint
    this.showFilters = !this.isMobile;
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Método mejorado para obtener la imagen del producto
  getProductImage(product: Product): string {
    // Verificar si hay imágenes disponibles
    if (product.images && product.images.length > 0) {
      // Buscar imagen principal
      const mainImage = product.images.find(img => img.is_main);

      // Usar imagen principal si existe
      if (mainImage) {
        // Verificar si la URL es relativa o absoluta
        if (!mainImage.url.startsWith('http') && !mainImage.url.startsWith('/')) {
          const completeUrl = `${environment.apiUrl}/${mainImage.url}`;
          return completeUrl;
        }

        return mainImage.url;
      }

      // Si no hay imagen principal, usar la primera
      const firstImage = product.images[0];

      // Verificar si la URL es relativa o absoluta
      if (!firstImage.url.startsWith('http') && !firstImage.url.startsWith('/')) {
        const completeUrl = `${environment.apiUrl}/${firstImage.url}`;
        return completeUrl;
      }

      return firstImage.url;
    }

    // Si no hay imágenes, usar una imagen por defecto
    const index = (product.id_product || 0) % this.productImages.length;
    return this.productImages[index];
  }

  // Método para obtener todas las imágenes de un producto (para carrusel o galería)
  getProductImages(product: any): string[] {
    // Si el producto tiene imágenes, devolverlas ordenando la principal primero
    if (product.images && product.images.length > 0) {
      // Ordenar para que la imagen principal sea la primera
      return [...product.images].sort((a, b) => {
        if (a.is_main) return -1;
        if (b.is_main) return 1;
        return 0;
      }).map(img => img.url);
    }

    // Si no tiene imágenes, devolver un array con una imagen placeholder
    const index = (product.id_product || 0) % this.productImages.length;
    return [this.productImages[index]];
  }

  // Método para verificar si un producto tiene imágenes
  hasCustomImages(product: any): boolean {
    return product.images && product.images.length > 0;
  }

  // Añadir este método para manejar errores de carga de imágenes
  handleImageError(event: any, product: any): void {
    // Si una imagen falla al cargar, reemplazarla con una imagen estática
    const index = (product.id_product || 0) % this.productImages.length;
    event.target.src = this.productImages[index];
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
    // Preparar opciones de filtrado
    const options: any = {
      // Añadir filtro de tipo = regular
      type: 'regular'  // ✅ Esto está bien
    };

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
        // Verificar estructura de respuesta del backend
        this.products = response.data || [];
        this.totalProducts = response.meta?.totalItems || 0;
        this.totalPages = response.meta?.totalPages || 1;

        // Actualizar la URL con los filtros actuales (sin recargar la página)
        this.updateUrlWithFilters();

        this.loading = false;
        console.log(`Recibidos ${this.products.length} productos regulares de ${this.totalProducts}`);
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

  // Métodos para trueques
  loadBarters(): void {
    // Opciones para filtrar solo productos de tipo "barter"
    const options: any = {
      type: 'barter'
    };

    // Aplicar filtros de categoría si es necesario
    if (this.selectedBarterCategory !== null) {
      options.categoryId = this.selectedBarterCategory;
    }

    // Aplicar filtro de búsqueda si existe
    if (this.barterSearchTerm && this.barterSearchTerm.trim() !== '') {
      options.search = this.barterSearchTerm.trim();
    }

    // Añadir opciones de ordenamiento
    if (this.barterCurrentSort) {
      const sortDetails = this.sortMap[this.barterCurrentSort];
      options.sortBy = sortDetails.field;
      options.sortOrder = sortDetails.order;
      console.log(`Enviando ordenamiento: campo=${options.sortBy}, orden=${options.sortOrder}`);
    }

    console.log('Opciones completas enviadas al servicio:', options);

    // Llamar al servicio para obtener productos tipo "barter"
    this.productService.getAllProductsPaginated(
      this.barterCurrentPage,
      this.barterPageSize,
      options
    ).subscribe({
      next: (response) => {
        // Verificar estructura de respuesta del backend
        this.barters = response.data || [];
        this.barterTotalItems = response.meta?.totalItems || 0;
        this.barterTotalPages = response.meta?.totalPages || 1;

        this.loadingBarters = false;
        console.log(`Recibidos ${this.barters.length} productos para trueque ordenados por ${options.sortBy}`);
      },
      error: (error) => {
        console.error('Error cargando productos para trueque:', error);
        this.toastr.error('Error al cargar productos para trueque');
        this.loadingBarters = false;
        this.barters = [];
      }
    });
  }

  onBarterSearchInput(event: any): void {
    this.barterSearchTerms.next(event.target.value);
  }

  filterBartersByStatus(status: string | null): void {
    this.selectedBarterStatus = status;
    this.barterCurrentPage = 1;
    this.loadBarters();
  }

  changeBarterPage(page: number): void {
    if (page < 1 || page > this.barterTotalPages) return;
    this.barterCurrentPage = page;
    this.loadBarters();

    // Scroll al inicio de los resultados para móviles
    if (this.isMobile) {
      const bartersSection = document.querySelector('.barter-card');
      if (bartersSection) {
        bartersSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  getBarterPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = this.isMobile ? 3 : 5;

    if (this.barterTotalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.barterTotalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.barterCurrentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.barterTotalPages, startPage + maxPagesToShow - 1);

      if (endPage === this.barterTotalPages) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  viewBarterDetails(barterId: number | undefined): void {
    if (barterId === undefined || barterId === 0) {
      this.toastr.error('ID de trueque no válido');
      return;
    }

    this.router.navigate(['/shop-detail'], {
      queryParams: { id: barterId, type: 'barter' }
    });
  }

  resetBarterFilters(): void {
    this.selectedBarterCategory = null;
    this.barterSearchTerm = '';
    this.barterCurrentPage = 1;
    this.barterCurrentSort = 'newest';
    this.barterPageSize = 12;
    this.loadBarters();
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

    // Si estamos en la pestaña de trueques, mantener ese parámetro
    if (this.activeTab === 'barters') {
      queryParams.tab = 'barters';
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

  // Ordenar productos localmente cuando el backend no lo haga correctamente
  sortProductsLocally(): void {
    console.log(`Ordenando localmente productos por: ${this.currentSort}`);
    
    if (this.currentSort === 'price-low') {
      this.products.sort((a, b) => a.price - b.price);
    } 
    else if (this.currentSort === 'price-high') {
      this.products.sort((a, b) => b.price - a.price);
    }
  }

  // Método similar para trueques
  sortBartersLocally(): void {
    console.log(`Ordenando localmente trueques por: ${this.barterCurrentSort}`);
    
    if (this.barterCurrentSort === 'price-low') {
      this.barters.sort((a, b) => a.price - b.price);
    } 
    else if (this.barterCurrentSort === 'price-high') {
      this.barters.sort((a, b) => b.price - a.price);
    }
  }

  // Ordenar productos - versión mejorada
  sortProducts(sortBy: string): void {
    console.log(`Ordenando productos por: ${sortBy}`);
    
    // Guardar estado anterior para comparación
    const previousSort = this.currentSort;
    this.currentSort = sortBy;
    
    // Si cambió el ordenamiento
    if (previousSort !== sortBy) {
      if (sortBy === 'newest') {
        // Para ordenamiento por fecha, usar el backend
        this.currentPage = 1;
        this.loadProducts();
      } else {
        // Para ordenamiento por precio, aplicar localmente
        this.sortProductsLocally();
        // Mostrar notificación
        this.toastr.info(`Productos ordenados por ${this.getSortLabel(sortBy)}`);
      }
    }
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
    // Verificar stock primero
    if (product.stock <= 0) {
      this.toastr.warning('Lo sentimos, este producto está agotado');
      return;
    }

    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      // Guardar el producto en el carrito pendiente
      this.cartService.savePendingItem(product.id_product, 1);

      // Mostrar mensaje informativo
      this.toastr.info(
        `${product.name} se agregará a tu carrito al iniciar sesión`,
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      // Guardar la URL actual para redirigir después del login
      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);

      // Redireccionar al login
      this.router.navigate(['/login']);
      return;
    }

    // Si está autenticado, proceder con la adición al carrito
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
        this.toastr.error('Error al agregar al carrito');
      }
    });
  }

  // Mostrar detalle de producto
  showProductDetail(productId: number, productType: 'regular' | 'barter' = 'regular'): void {
    // Si no se especifica el tipo, intentar determinarlo
    if (productType === 'regular') {
      const product = this.products.find(p => p.id_product === productId);
      if (product && (product.type === 'barter' || product.permite_trueque)) {
        productType = 'barter';
      }
    }

    this.router.navigate(['/shop-detail'], {
      queryParams: { 
        id: productId,
        type: productType
      }
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
  // Ordenar trueques
  sortBarters(sortBy: string): void {
    console.log(`Ordenando trueques por: ${sortBy}`);
    
    // Guardar estado anterior para comparación
    const previousSort = this.barterCurrentSort;
    this.barterCurrentSort = sortBy;
    
    // Si cambió el ordenamiento
    if (previousSort !== sortBy) {
      if (sortBy === 'newest') {
        // Para ordenamiento por fecha, usar el backend
        this.barterCurrentPage = 1;
        this.loadBarters();
      } else {
        // Para ordenamiento por precio, aplicar localmente
        this.sortBartersLocally();
        // Mostrar notificación
        this.toastr.info(`Trueques ordenados por ${this.getSortLabel(sortBy)}`);
      }
    }
  }

  // Cambiar tamaño de página para trueques
  changeBarterPageSize(size: number): void {
    this.barterPageSize = size;
    this.barterCurrentPage = 1;
    this.loadBarters();
  }
  // Obtener la categoría de un trueque (basada en los productos)
  getBarterCategory(barter: Barter): number | null {
    // Intentar obtener categoría del producto ofrecido
    if (barter.offered_product?.id_category) {
      return barter.offered_product.id_category;
    }
    // Si no está disponible, intentar con el producto solicitado
    if (barter.requested_product?.id_category) {
      return barter.requested_product.id_category;
    }
    return null;
  }

  // Obtener el nombre de la categoría
  getBarterCategoryName(barter: Barter): string | null {
    const categoryId = this.getBarterCategory(barter);
    if (!categoryId) return null;

    const category = this.categories.find(cat => cat.id_category === categoryId);
    return category ? category.name : null;
  }

  // Obtener todos los trueques de una categoría específica
  filterBartersByCategory(categoryId: number | null): void {
    // Almacenar la categoría seleccionada
    this.selectedBarterCategory = categoryId;

    // Reiniciar paginación
    this.barterCurrentPage = 1;

    // Recargar los trueques con el nuevo filtro
    this.loadBarters();
  }

  // Añadir este método al componente
  proposeBarterFor(product: any): void {
    // Verificar si el usuario está autenticado
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para proponer un trueque',
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      // Guardar la URL actual para redirigir después del login
      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);

      // Redireccionar al login
      this.router.navigate(['/login']);
      return;
    }

    // Si está autenticado, navegar a la página para proponer trueque
    this.router.navigate(['/trueque/proponer'], {
      queryParams: { productId: product.id_product }
    });
  }

  // Añade este método a tienda.component.ts
  getCategoryName(categoryId: number | null): string {
    if (!categoryId) return 'Todas las categorías';
    const category = this.categories.find(c => c.id_category === categoryId);
    return category ? category.name : 'Categoría no encontrada';
  }

  // Método auxiliar para mostrar la etiqueta de ordenamiento
  getSortLabel(sortKey: string): string {
    switch (sortKey) {
      case 'newest': return 'Más recientes';
      case 'price-low': return 'Precio: Menor a Mayor';
      case 'price-high': return 'Precio: Mayor a Menor';
      default: return 'Predeterminado';
    }
  }
}