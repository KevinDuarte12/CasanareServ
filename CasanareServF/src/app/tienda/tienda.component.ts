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
  // ACTUALIZAR esta línea para incluir las nuevas pestañas
  activeTab: 'products' | 'barters' | 'auctions' | 'services' = 'products';

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

  // AGREGAR VALORES FIJOS para evitar ExpressionChangedAfterItHasBeenCheckedError
  private readonly interestedUsersCount = 2850;
  private readonly serviceSubscribersCount = 1460;
  private readonly professionalsRegisteredCount = 75;
  private readonly remainingDaysCount = 45;
  private readonly vendedoresCount = 156;
  private readonly productosListosCount = 89;

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

    // ACTUALIZAR - Verificar si hay un parámetro 'tab' en la URL
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'barters') {
      this.activeTab = 'barters';
      this.loadBarters();
    } else if (tabParam === 'auctions') {
      this.activeTab = 'auctions';
    } else if (tabParam === 'services') {
      this.activeTab = 'services';
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

    // ✅ AGREGAR al final: Verificar acciones pendientes después del login
    if (this.authService.isAuthenticated()) {
      this.handlePendingActions();
    }
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
  setActiveTab(tab: 'products' | 'barters' | 'auctions' | 'services'): void {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    console.log(`${tab === 'auctions' ? 'Pestaña de subastas' : tab === 'services' ? 'Pestaña de servicios' : 'Pestaña de ' + tab} seleccionada`);

    // Actualizar URL con la pestaña activa
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab },
      queryParamsHandling: 'merge'
    });

    // Cargar datos según la pestaña seleccionada
    if (tab === 'products') {
      this.loadProducts();
    } else if (tab === 'barters') {
      this.loadBarters();
    } else if (tab === 'auctions') {
      console.log('Cargando subastas...');
      // Las subastas están en desarrollo, no hay datos que cargar
    } else if (tab === 'services') {
      console.log('Cargando servicios...');
      // Los servicios están en desarrollo, no hay datos que cargar
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

    // Aplicar filtro de estado si está seleccionado
    if (this.selectedBarterStatus !== null) {
      options.status = this.selectedBarterStatus;
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
    this.selectedBarterStatus = null; // Añadir esta línea
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
    // ✅ VERIFICAR SI ES EL PROPIETARIO ANTES DE AGREGAR
    const currentUserId = this.authService.getCurrentUserId();
    if (currentUserId && (product.id_user === currentUserId || product.user_id === currentUserId)) {
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
          this.toastr.error('Error al agregar producto al carrito', 'Error');
        }
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

  // MÉTODOS PARA NAVEGACIÓN A PERFILES
  navigateToSell(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para comenzar a vender tus productos',
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      localStorage.setItem('pendingAction', 'sell');
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/user-profile'], {
      queryParams: { tab: 'en-venta' }
    }).then(() => {
      this.toastr.success(
        '¡Perfecto! Desde aquí puedes agregar nuevos productos para vender',
        'Sección de Ventas',
        { timeOut: 4000 }
      );
    });
  }

  navigateToBarterProfile(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para comenzar a intercambiar productos',
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      localStorage.setItem('pendingAction', 'barter');
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/user-profile'], {
      queryParams: { tab: 'trueques-pendientes' }
    }).then(() => {
      this.toastr.success(
        '¡Excelente! Aquí puedes gestionar tus productos para intercambio',
        'Sección de Trueques',
        { timeOut: 4000 }
      );
    });
  }

  // MÉTODOS PARA SUSCRIPCIONES
  subscribeToAuctions(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para que te avisemos cuando esté listo el sistema de subastas',
        'Iniciar sesión',
        { timeOut: 6000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      localStorage.setItem('pendingAuctionNotification', 'true');
      this.router.navigate(['/login']);
      return;
    }

    this.toastr.success(
      '🎉 ¡Perfecto! Te avisaremos tan pronto como tengamos listas las subastas. ¡Será emocionante!',
      'Te mantendremos informado',
      { timeOut: 8000 }
    );

    localStorage.setItem('auction_notifications', 'true');
    localStorage.setItem('auction_subscription_date', new Date().toISOString());
  }

  subscribeToServices(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para recibir noticias sobre el marketplace de servicios',
        'Iniciar sesión',
        { timeOut: 6000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      localStorage.setItem('pendingServiceNotification', 'true');
      this.router.navigate(['/login']);
      return;
    }

    this.toastr.success(
      '📱 ¡Excelente! Te avisaremos cuando el marketplace de servicios esté listo. Será revolucionario.',
      'Te avisaremos pronto',
      { timeOut: 7000 }
    );

    localStorage.setItem('service_notifications', 'true');
    localStorage.setItem('service_subscription_date', new Date().toISOString());
  }

  registerAsProfessional(): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para registrar tu interés como profesional',
        'Registro profesional',
        { timeOut: 6000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      localStorage.setItem('pendingProfessionalInterest', 'true');
      this.router.navigate(['/login']);
      return;
    }

    this.toastr.success(
      '🔧 ¡Genial! Hemos registrado tu interés. Te contactaremos cuando esté listo para que seas de los primeros profesionales en la plataforma.',
      'Interés registrado',
      { timeOut: 9000 }
    );

    localStorage.setItem('professional_interest', 'true');
    localStorage.setItem('professional_interest_date', new Date().toISOString());
  }

  // MÉTODOS PARA OBTENER VALORES FIJOS
  getRemainingDays(): number {
    return this.remainingDaysCount;
  }

  getInterestedUsers(): number {
    return this.interestedUsersCount;
  }

  getServiceSubscribers(): number {
    return this.serviceSubscribersCount;
  }

  getProfessionalsRegistered(): number {
    return this.professionalsRegisteredCount;
  }

  getVendedoresCount(): number {
    return this.vendedoresCount;
  }

  getProductosListosCount(): number {
    return this.productosListosCount;
  }

  getLaunchDate(): string {
    const launchDate = new Date('2025-07-15');
    return launchDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getBetaLaunchDate(): string {
    const betaDate = new Date('2025-06-25');
    return betaDate.toLocaleDateString('es-ES', {
      month: 'long',
      day: 'numeric'
    });
  }

  getServicesLaunchDate(): string {
    const servicesDate = new Date('2025-08-20');
    return servicesDate.toLocaleDateString('es-ES', {
      month: 'long',
      day: 'numeric'
    });
  }

  // MÉTODO para manejar acciones pendientes después del login
  handlePendingActions(): void {
    const pendingAction = localStorage.getItem('pendingAction');

    if (pendingAction === 'sell') {
      localStorage.removeItem('pendingAction');
      setTimeout(() => {
        this.navigateToSell();
      }, 1000);
    } else if (pendingAction === 'barter') {
      localStorage.removeItem('pendingAction');
      setTimeout(() => {
        this.navigateToBarterProfile();
      }, 1000);
    }

    // Manejar notificaciones pendientes
    if (localStorage.getItem('pendingAuctionNotification') === 'true') {
      localStorage.removeItem('pendingAuctionNotification');
      setTimeout(() => {
        this.subscribeToAuctions();
      }, 1000);
    }

    if (localStorage.getItem('pendingServiceNotification') === 'true') {
      localStorage.removeItem('pendingServiceNotification');
      setTimeout(() => {
        this.subscribeToServices();
      }, 1000);
    }

    if (localStorage.getItem('pendingProfessionalInterest') === 'true') {
      localStorage.removeItem('pendingProfessionalInterest');
      setTimeout(() => {
        this.registerAsProfessional();
      }, 1000);
    }
  }
  proposeBarter(barter: any): void {
    console.log('🔄 Iniciando propuesta de trueque para:', barter);

    // ✅ VERIFICAR AUTENTICACIÓN
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

    // ✅ VERIFICAR QUE NO SEA EL MISMO USUARIO
    const currentUser = this.authService.getUserData();
    if (currentUser && currentUser.id === barter.user.id) {
      this.toastr.info('Este es tu trueque, no puedes proponerte a ti mismo', 'Información', {
        timeOut: 4000,
        closeButton: true
      });
      return;
    }

    // ✅ VERIFICAR QUE EL BARTER TENGA LA INFORMACIÓN NECESARIA
    if (!barter || !barter.product || !barter.product.id) {
      this.toastr.error('Error: No se pudo obtener la información del producto');
      console.error('Barter inválido:', barter);
      return;
    }

    // ✅ GUARDAR INFORMACIÓN EN LOCALSTORAGE (igual que recent-barter)
    try {
      // Información del producto para el trueque
      localStorage.setItem('truequeProductId', barter.product.id.toString());
      localStorage.setItem('truequeProductName', barter.product.name);
      localStorage.setItem('truequeProductOwnerId', barter.user.id.toString());

      // ✅ INFORMACIÓN ADICIONAL DEL BARTER
      localStorage.setItem('truequeBarterId', barter.id.toString());
      localStorage.setItem('truequeBarterType', barter.exchange_type || 'product_for_product');
      localStorage.setItem('truequeBarterValue', barter.value?.toString() || '0');

      // Flag específico para abrir el modal automáticamente
      localStorage.setItem('openBarterProposalModal', 'true');

      console.log('✅ Información guardada en localStorage:', {
        productId: barter.product.id,
        productName: barter.product.name,
        ownerId: barter.user.id,
        barterId: barter.id,
        exchangeType: barter.exchange_type
      });

      // ✅ REDIRECCIONAR AL PERFIL CON PARÁMETROS (igual que recent-barter)
      this.router.navigate(['/user-profile'], {
        queryParams: {
          tab: 'trueques',
          action: 'proponer-trueque',
          openModal: 'true',
          // Parámetros adicionales para el contexto del barter
          fromBarter: 'true',
          barterId: barter.id
        }
      });

      // ✅ MOSTRAR MENSAJE DE CONFIRMACIÓN
      this.toastr.info(
        `Redirigiendo para proponer trueque por: ${barter.product.name}`,
        'Propuesta de Trueque',
        { timeOut: 3000 }
      );

    } catch (error) {
      console.error('❌ Error al guardar información del trueque:', error);
      this.toastr.error('Error al procesar la propuesta de trueque');
    }
  }

  /**
   * 🔄 VERIFICAR SI EL USUARIO PUEDE PROPONER TRUEQUE
   */
  public canProposeBarter(barter: any): boolean {
    // Verificar autenticación
    if (!this.authService.isAuthenticated()) {
      return false;
    }

    // Verificar que no sea el mismo usuario
    const currentUser = this.authService.getUserData();
    if (currentUser && currentUser.id === barter.user.id) {
      return false;
    }

    // Verificar que el barter esté disponible
    if (barter.status !== 'disponible') {
      return false;
    }

    return true;
  }

  /**
   * 🔄 OBTENER MENSAJE DE ERROR PARA PROPUESTA
   */
  public getBarterProposalError(barter: any): string {
    if (!this.authService.isAuthenticated()) {
      return 'Debes iniciar sesión para proponer un trueque';
    }

    const currentUser = this.authService.getUserData();
    if (currentUser && currentUser.id === barter.user.id) {
      return 'No puedes proponer un trueque a tu propio producto';
    }

    if (barter.status !== 'disponible') {
      return 'Este trueque ya no está disponible';
    }

    return 'No se puede proponer este trueque';
  }

  /**
   * 🔄 CONVERTIR PRODUCT A FORMATO BARTER
   * Convierte un product de tienda al formato que espera proposeBarter()
   */
  public convertProductToBarter(product: any): any {
    return {
      id: product.id_product,
      status: product.status || 'disponible',
      exchange_type: product.exchange_type || 'product_for_product',
      value: product.price || 0,
      notes: product.description || '',
      request_date: product.created_at || new Date().toISOString(),
      product: {
        id: product.id_product,
        name: product.name,
        price: product.price,
        description: product.description,
        image: this.getProductImage(product)
      },
      user: {
        id: product.id_user || product.user_id,
        name: product.user?.name || 'Usuario',
        avatar: product.user?.avatar || null
      }
    };
  }

  /**
   * 🔄 WRAPPER PARA PROPONER TRUEQUE EN TIENDA
   * Convierte product a barter y llama al método original
   */
  proposeBarterForProduct(product: any): void {
    console.log('🔄 Iniciando propuesta de trueque para product:', product);

    // ✅ VERIFICAR AUTENTICACIÓN
    if (!this.authService.isAuthenticated()) {
      this.toastr.info(
        'Inicia sesión para proponer un trueque',
        'Iniciar sesión requerido',
        { timeOut: 5000 }
      );

      const currentUrl = this.router.url;
      localStorage.setItem('redirectAfterLogin', currentUrl);
      this.router.navigate(['/login']);
      return;
    }

    // ✅ VERIFICAR QUE NO SEA EL MISMO USUARIO
    const currentUser = this.authService.getUserData();
    const productOwnerId = product.id_user || product.user_id;

    if (currentUser && currentUser.id === productOwnerId) {
      this.toastr.info('Este es tu producto, no puedes proponerte un trueque a ti mismo', 'Información', {
        timeOut: 4000,
        closeButton: true
      });
      return;
    }

    // ✅ VERIFICAR QUE EL PRODUCTO TENGA ID
    if (!product || !product.id_product) {
      this.toastr.error('Error: No se pudo obtener la información del producto');
      console.error('Producto inválido:', product);
      return;
    }

    // ✅ GUARDAR INFORMACIÓN DIRECTAMENTE (SIN CONVERSIÓN)
    try {
      localStorage.setItem('truequeProductId', product.id_product.toString());
      localStorage.setItem('truequeProductName', product.name || 'Producto');
      localStorage.setItem('truequeProductOwnerId', (productOwnerId || 0).toString());
      localStorage.setItem('truequeBarterId', product.id_product.toString());
      localStorage.setItem('truequeBarterType', product.exchange_type || 'product_for_product');
      localStorage.setItem('truequeBarterValue', (product.price || 0).toString());
      localStorage.setItem('openBarterProposalModal', 'true');

      console.log('✅ Información guardada en localStorage (tienda):', {
        productId: product.id_product,
        productName: product.name,
        ownerId: productOwnerId,
        exchangeType: product.exchange_type
      });

      // ✅ REDIRECCIONAR AL PERFIL
      this.router.navigate(['/user-profile'], {
        queryParams: {
          tab: 'trueques',
          action: 'proponer-trueque',
          openModal: 'true',
          fromBarter: 'true',
          barterId: product.id_product
        }
      });

      // ✅ MOSTRAR MENSAJE
      this.toastr.info(
        `Redirigiendo para proponer trueque por: ${product.name}`,
        'Propuesta de Trueque',
        { timeOut: 3000 }
      );

    } catch (error) {
      console.error('❌ Error al guardar información del trueque:', error);
      this.toastr.error('Error al procesar la propuesta de trueque');
    }
  }
  public openChatWithProductUser(product: any): void {
    if (!this.authService.isAuthenticated()) {
      this.toastr.warning('Debes iniciar sesión para chatear');
      return;
    }

    // Scroll suave hacia arriba
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });

    // Preparar datos del usuario
    const userId = product.id_user || product.user_id;
    const userName = product.user?.name || 'Usuario';
    let userAvatar = product.user?.avatar || '/img/perfil3.png';

    if (userAvatar && !userAvatar.startsWith('/')) {
      userAvatar = '/' + userAvatar;
    }

    console.log('💬 Abriendo chat con usuario del producto:', {
      userId: userId,
      userName: userName,
      userAvatar: userAvatar,
      product: product
    });

    // Navegar al chat con parámetros específicos para trueque
    this.router.navigate(['/chat/barter', product.id_product], {
      queryParams: {
        otherUserName: userName,
        otherUserAvatar: userAvatar,
        barterId: userId,
        context: 'barter-proposal'
      }
    });
  }

  /**
   * 🔄 VERIFICAR SI PUEDE CHATEAR CON EL USUARIO DEL PRODUCTO
   */
  public canChatWithProductUser(product: any): boolean {
    if (!this.authService.isAuthenticated()) {
      return false;
    }

    const currentUser = this.authService.getUserData();
    const productOwnerId = product.id_user || product.user_id;

    // No puede chatear consigo mismo
    if (currentUser && currentUser.id === productOwnerId) {
      return false;
    }

    return true;
  }
}