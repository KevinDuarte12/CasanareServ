import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UserService } from '../services/user.services';
import { CategoryService } from '../services/category.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../shared/spinner/spinner.component';
import { EditUserComponent } from '../edit-user/edit-user.component';
import { EditCategoryComponent } from '../edit-categories/edit-categories.component';
import { Category } from '../interfaces/category';
import { EditProductComponent } from '../edit-product/edit-product.component';
import { Product } from '../interfaces/product';
import { ProductService } from '../services/productos.services';
import { BarterService } from '../services/barter.service'; // Importar el servicio de trueques
import { Barter } from '../interfaces/barter'; // Importar la interfaz de trueques
import { EditBarterComponent } from '../edit-barter/edit-barter.component';
import { BarterDetailsComponent } from '../barter-details/barter-details.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, RouterLink, EditUserComponent, 
    EditCategoryComponent, EditProductComponent, EditBarterComponent, BarterDetailsComponent]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  // Usuarios
  users: any[] = [];
  loading = false;
  isAdmin = false;

  // Variables para el modal de usuarios
  showEditModal = false;
  selectedUserId = 0;

  // Categorías
  categories: Category[] = [];
  categoriesLoading = false;
  showCategoryModal = false;
  selectedCategoryId: number | undefined;

  // Productos
  products: Product[] = [];
  productsLoading = false;
  showProductModal = false;
  selectedProductId: number | undefined;

  // Trueques
  barters: Barter[] = []; // Cambiado a Barter[] para reflejar la interfaz correcta
  bartersLoading = false;
  showBarterModal = false;
  selectedBarterId: number | undefined;
  bartersPendingApproval: Barter[] = [];

  // Contador para las estadísticas
  userCount = 0;
  productCount = 0;
  truequeCount = 0;

  // Añade estas propiedades para controlar el modal de detalles
  showBarterDetailsModal: boolean = false;
  selectedBarterDetailsId: number | null = null;
  selectedBarterStatus: string | undefined; // Añade esta propiedad
  // Sidebar
  isSidebarCollapsed = false;
  isSidebarActive = false;

  // Propiedad para controlar qué sección está activa
  activeSection: string = 'dashboard'; // Por defecto muestra el Dashboard

  constructor(
    private router: Router,
    private userService: UserService, // Inyección del servicio de usuarios
    private categoryService: CategoryService, // Inyección del servicio de categorías
    private productService: ProductService, // Inyección del servicio de productos
    private toastr: ToastrService,
    private barterService: BarterService // Inyección del servicio de trueques
  ) { }

  ngOnInit() {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.isAdmin = user.rol === 'admin';
    }
    this.loadUsers();
    this.loadCategories();
    this.loadProducts();
    this.loadTrueques(); // Implementar cuando tengas el servicio para trueques
    this.loadTruequesPendingApproval();
  }

  ngAfterViewInit() {
    // Este método se ejecuta después de que Angular haya inicializado completamente la vista
    // Es útil para capturar y manejar errores de renderizado
    console.log('Vista inicializada correctamente');
  }

  // Método para cambiar entre secciones
  showSection(section: string, event: Event): void {
    // Evitar la navegación por anclas predeterminada
    event.preventDefault();
    
    // Actualizar la sección activa
    this.activeSection = section;
    
    // Cerrar el sidebar en móviles después de seleccionar
    if (window.innerWidth < 768) {
      this.isSidebarActive = false;
    }
  }

  // MÉTODOS PARA USUARIOS
  loadUsers() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (response) => {
        this.users = response;
        this.userCount = this.users.length;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error.msg || 'Error al cargar los usuarios');
      }
    });
  }

  deleteUser(id: number) {
    // Obtener el nombre del usuario para mostrar en la confirmación
    const user = this.users.find(u => u.id === id);
    const userName = user ? user.name : 'este usuario';
    
    // Confirmación con mensaje detallado
    const confirmDeleteMsg = 
      `⚠️ ADVERTENCIA: ELIMINACIÓN PERMANENTE ⚠️\n\n` +
      `Estás a punto de eliminar permanentemente a "${userName}" y todos sus datos relacionados:\n\n` +
      `- Información personal\n` +
      `- Productos publicados\n` +
      `- Imágenes subidas\n` +
      `- Solicitudes de trueque\n` +
      `- Carrito de compras\n\n` +
      `Esta acción es IRREVERSIBLE y no se puede deshacer.\n\n` +
      `¿Estás completamente seguro?`;
    
    if (confirm(confirmDeleteMsg)) {
      this.loading = true;
      
      // Usar true como segundo parámetro para indicar eliminación física
      this.userService.deleteUser(id, true).subscribe({
        next: () => {
          this.toastr.success(`Usuario "${userName}" eliminado permanentemente`);
          this.loadUsers();
        },
        error: (error) => {
          this.loading = false;
          this.toastr.error(error.error?.msg || 'Error al eliminar el usuario');
          console.error('Error detallado:', error);
        }
      });
    }
  }

  openEditModal(userId: number) {
    this.selectedUserId = userId;
    this.showEditModal = true;
  }

  handleModalClose(refresh: boolean) {
    this.showEditModal = false;
    this.selectedUserId = 0;

    if (refresh) {
      this.loadUsers();
    }
  }

  // MÉTODOS PARA CATEGORÍAS
  loadCategories() {
    this.categoriesLoading = true;
    this.categoryService.getCategories().subscribe({
      next: (response) => {
        this.categories = response;
        this.categoriesLoading = false;
      },
      error: (error) => {
        this.categoriesLoading = false;
        this.toastr.error(error.error?.msg || 'Error al cargar las categorías');
      }
    });
  }

  openCategoryModal(categoryId?: number) {
    this.selectedCategoryId = categoryId;
    this.showCategoryModal = true;
  }

  handleCategoryModalClose(refresh: boolean) {
    this.showCategoryModal = false;
    this.selectedCategoryId = undefined;

    if (refresh) {
      this.loadCategories();
    }
  }

  deleteCategory(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      this.categoriesLoading = true;
      this.categoryService.deleteCategory(id).subscribe({
        next: () => {
          this.toastr.success('Categoría eliminada correctamente');
          this.loadCategories();
        },
        error: (error) => {
          this.categoriesLoading = false;
          this.toastr.error(error.error?.msg || 'Error al eliminar la categoría');
        }
      });
    }
  }

  toggleCategoryStatus(id: number) {
    this.categoriesLoading = true;
    this.categoryService.toggleCategoryStatus(id).subscribe({
      next: (response) => {
        this.toastr.success(response.msg || 'Estado de categoría cambiado correctamente');
        this.loadCategories();
      },
      error: (error) => {
        this.categoriesLoading = false;
        this.toastr.error(error.error?.msg || 'Error al cambiar el estado de la categoría');
      }
    });
  }

  // MÉTODOS PARA PRODUCTOS
  // MÉTODO PARA CARGAR SOLO PRODUCTOS REGULARES
  loadProducts() {
    this.productsLoading = true;
    this.productService.getProducts().subscribe({
      next: (response) => {
        // Filtrar solo los productos de tipo regular
        this.products = response.filter(product => product.type === 'regular' || !product.type);
        
        console.log(`Cargados ${this.products.length} productos regulares de ${response.length} totales`);
        this.productCount = this.products.length;
        this.productsLoading = false;
      },
      error: (error) => {
        this.productsLoading = false;
        this.toastr.error(error.error?.msg || 'Error al cargar los productos');
      }
    });
  }

  openProductModal(productId?: number) {
    this.selectedProductId = productId;
    this.showProductModal = true;
  }

  handleProductModalClose(refresh: boolean) {
    this.showProductModal = false;
    this.selectedProductId = undefined;

    if (refresh) {
      this.loadProducts();
    }
  }

  deleteProduct(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      this.productsLoading = true;
      this.productService.deleteProduct(id).subscribe({
        next: () => {
          this.toastr.success('Producto eliminado correctamente');
          this.loadProducts();
        },
        error: (error) => {
          this.productsLoading = false;
          this.toastr.error(error.error?.msg || 'Error al eliminar el producto');
        }
      });
    }
  }

  changeProductStatus(id: number, status: 'disponible' | 'vendido' | 'en_trueque') {
    this.productsLoading = true;
    this.productService.changeProductStatus(id, status).subscribe({
      next: () => {
        this.toastr.success(`Estado del producto cambiado a ${status}`);
        this.loadProducts();
      },
      error: (error) => {
        this.productsLoading = false;
        this.toastr.error(error.error?.msg || 'Error al cambiar el estado del producto');
      }
    });
  }

  // MÉTODOS PARA TRUEQUES
  // MÉTODO PARA CARGAR SOLO PRODUCTOS DE TRUEQUE
  loadTrueques() {
    this.bartersLoading = true;
    
    // Primero cargar productos de tipo "barter" 
    this.productService.getProducts().subscribe({
      next: (products) => {
        // Filtrar solo productos de tipo "barter"
        const barterProducts = products.filter(product => 
          product.type === 'barter');
        
        console.log(`Cargados ${barterProducts.length} productos tipo trueque`);
        
        // Luego cargar las solicitudes de trueque
        this.barterService.getBarters().subscribe({
          next: (barters) => {
            this.barters = barters;
            
            // Enriquecer cada trueque con información del producto asociado si es necesario
            this.barters.forEach(barter => {
              // Si hay productos de trueque que corresponden a este barter, añadir info
              const matchingProduct = barterProducts.find(p => p.id_product === barter.id_prod_offer);
              if (matchingProduct && !barter.offered_product) {
                // Validar que id_product exista y sea un número antes de asignar
                if (matchingProduct.id_product !== undefined) {
                  // Crear un objeto compatible con la interfaz esperada por Barter.offered_product
                  barter.offered_product = {
                    id_product: matchingProduct.id_product,
                    name: matchingProduct.name || 'Sin nombre',
                    price: matchingProduct.price || 0,
                    description: matchingProduct.description || 'Sin descripción',
                    id_category: matchingProduct.id_category
                  };
                }
              }
            });
            
            console.log(`Cargados ${this.barters.length} trueques`);
            this.truequeCount = this.barters.length + barterProducts.length;
            this.bartersLoading = false;
          },
          error: (error) => {
            this.bartersLoading = false;
            console.error('Error cargando solicitudes de trueque:', error);
            this.toastr.error('Error al cargar solicitudes de trueque');
          }
        });
      },
      error: (error) => {
        this.bartersLoading = false;
        console.error('Error cargando productos de trueque:', error);
        this.toastr.error('Error al cargar productos de trueque');
      }
    });
  }

  loadTruequesPendingApproval() {
    this.barterService.getBartersByStatus('aceptado').subscribe({
      next: (response) => {
        this.bartersPendingApproval = response;
        console.log('Trueques pendientes de aprobación:', this.bartersPendingApproval.length);
      },
      error: (error) => {
        console.error('Error al cargar trueques pendientes de aprobación:', error);
        this.toastr.error('Error al cargar trueques pendientes de aprobación');
      }
    });
  }

  openBarterModal(barterId?: number) {
    this.selectedBarterId = barterId;
    this.showBarterModal = true;
  }

  handleBarterModalClose(refresh: boolean) {
    this.showBarterModal = false;
    this.selectedBarterId = undefined;

    if (refresh) {
      this.loadTrueques();
      this.loadTruequesPendingApproval(); // Añadir esta línea
    }
  }

  // Actualiza la firma del método para incluir 'aprobado_admin' como un estado válido
  updateBarterStatus(id: number, estado: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'aprobado_admin' | 'disponible') {
    this.bartersLoading = true;
    this.barterService.updateBarterStatus(id, estado).subscribe({
      next: () => {
        this.toastr.success(`Estado del trueque cambiado a ${estado}`);
        this.loadTrueques();
        this.loadTruequesPendingApproval(); // Asegurarse de recargar los pendientes
      },
      error: (error) => {
        this.bartersLoading = false;
        this.toastr.error(error.error?.msg || 'Error al cambiar el estado del trueque');
      }
    });
  }

  deleteBarter(id: number) {
    if (confirm('¿Estás seguro de que deseas eliminar esta solicitud de trueque?')) {
      this.bartersLoading = true;
      this.barterService.deleteBarter(id).subscribe({
        next: () => {
          this.toastr.success('Solicitud de trueque eliminada correctamente');
          this.loadTrueques();
        },
        error: (error) => {
          this.bartersLoading = false;
          this.toastr.error(error.error?.msg || 'Error al eliminar la solicitud de trueque');
        }
      });
    }
  }

  // Método para abrir modal de edición de trueque con acceso al detalle completo
  editBarter(barter: Barter): void {
    console.log('Abriendo trueque para edición:', barter);
    
    // Asegurarse de que el trueque tiene un estado definido
    if (!barter.status) {
      barter.status = 'pendiente';
    }
    
    // Obtener los detalles completos del trueque antes de abrir el modal
    if (barter.id_barter) {
      this.bartersLoading = true;
      this.barterService.getBarter(barter.id_barter).subscribe({
        next: (detailedBarter) => {
          console.log('Detalles completos del trueque:', detailedBarter);
          this.selectedBarterId = detailedBarter.id_barter;
          this.showBarterModal = true;
          this.bartersLoading = false;
        },
        error: (error) => {
          console.error('Error al obtener detalles del trueque:', error);
          this.toastr.error('Error al cargar los detalles del trueque');
          this.bartersLoading = false;
          
          // Aunque ocurra un error, intentamos abrir el modal con la información disponible
          this.selectedBarterId = barter.id_barter;
          this.showBarterModal = true;
        }
      });
    } else {
      // Si por alguna razón no hay ID, mostrar error
      this.toastr.error('ID de trueque no válido');
    }
  }

  // Función para obtener etiqueta de estado para UI
  getBarterStatusLabel(status: string): string {
    switch(status) {
      case 'pendiente': return 'Pendiente';
      case 'aceptado': return 'Aceptado (Esperando Admin)';
      case 'aprobado_admin': return 'Aprobado por Admin';
      case 'rechazado': return 'Rechazado';
      case 'completado': return 'Completado';
      case 'disponible': return 'Disponible';
      default: return 'Desconocido';
    }
  }

  // Función para obtener clase CSS según estado
  getBarterStatusClass(status: string): string {
    switch(status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'aceptado': return 'bg-orange-100 text-orange-800';
      case 'aprobado_admin': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      case 'completado': return 'bg-blue-100 text-blue-800';
      case 'disponible': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Obtener nombre del producto de trueque para mostrar en la tabla
  getBarterProductName(barter: Barter): string {
    if (barter.offered_product?.name) {
      return barter.offered_product.name;
    }
    return 'Producto no especificado';
  }

  // Modifica esta función en el componente para manejar correctamente valores nulos o undefined
  getRequestedProductName(barter: Barter): string {
    return barter?.requested_product?.name ?? 'Producto no especificado';
  }

  // Obtener nombres de usuarios para mostrar en la tabla
  getOfferingUserName(barter: Barter): string {
    return barter?.offering_user?.name || 'Usuario desconocido';
  }

  getReceivingUserName(barter: Barter): string {
    return barter?.receiving_user?.name || 'Usuario desconocido';
  }

  // Confirmar cambio de estado con modal personalizado
  confirmStatusChange(barter: Barter, newStatus: 'pendiente' | 'aceptado' | 'rechazado' | 'completado' | 'aprobado_admin'): void {
    // Mensaje de confirmación personalizado según el nuevo estado
    let confirmMessage = '';
    
    switch(newStatus) {
      case 'aceptado':
        confirmMessage = `¿Estás seguro de ACEPTAR este trueque?\n\n` +
                         `Los productos involucrados se marcarán como "en_trueque" y no estarán disponibles para otras transacciones.`;
        break;
      case 'rechazado':
        confirmMessage = `¿Estás seguro de RECHAZAR este trueque?\n\n` +
                         `Los productos involucrados volverán a estar disponibles.`;
        break;
      case 'completado':
        confirmMessage = `¿Estás seguro de marcar este trueque como COMPLETADO?\n\n` +
                         `Los productos involucrados se marcarán como "vendido" y ya no estarán disponibles.`;
        break;
      case 'pendiente':
        confirmMessage = `¿Estás seguro de cambiar el estado a PENDIENTE?\n\n` +
                         `Los productos seguirán en estado de espera.`;
        break;
      case 'aprobado_admin':
        confirmMessage = `¿Estás seguro de APROBAR ADMINISTRATIVAMENTE este trueque?\n\n` +
                         `Los usuarios involucrados serán notificados y podrán proceder con el intercambio.`;
        break;
    }
    
    if (confirm(confirmMessage)) {
      this.updateBarterStatus(barter.id_barter!, newStatus);
    }
  }

  // Método específico para aprobar un trueque administrativamente
  approveBarterByAdmin(barterId: number): void {
    if (confirm('¿Estás seguro de aprobar este trueque? Los productos permanecerán en estado "en_trueque" hasta que se complete la transacción.')) {
      this.bartersLoading = true;
      
      // Agregar logs para diagnóstico
      console.log(`🔄 Aprobando trueque ${barterId} como administrador`);
      console.log(`🔄 Valor del status enviado: 'aprobado_admin'`);
      
      // Mejorar la construcción de la solicitud
      const statusValue = 'aprobado_admin';
      
      this.barterService.updateBarterStatus(barterId, statusValue).subscribe({
        next: (response) => {
          console.log('✅ Respuesta exitosa al aprobar trueque:', response);
          
          // Actualizar lista de trueques pendientes inmediatamente
          const pendingIndex = this.bartersPendingApproval.findIndex(b => b.id_barter === barterId);
          if (pendingIndex !== -1) {
            this.bartersPendingApproval.splice(pendingIndex, 1);
          }
          
          // Verificar que el status se haya actualizado correctamente
          if (response && response.barter && response.barter.status === 'aprobado_admin') {
            console.log('✅ Status correctamente actualizado en la respuesta del servidor');
          } else {
            console.warn('⚠️ El status en la respuesta no es el esperado:', 
                        response?.barter?.status || 'no disponible');
          }
          
          this.toastr.success('Trueque aprobado correctamente');
          
          // Recargar ambas listas de trueques
          this.loadTrueques();
          this.loadTruequesPendingApproval();
        },
        error: (error) => {
          this.bartersLoading = false;
          console.error('❌ Error al aprobar el trueque:', error);
          this.toastr.error('Error al aprobar el trueque');
        }
      });
    }
  }

  // Método para cerrar sesión
  logOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.toastr.success('Sesión cerrada correctamente');
    this.router.navigate(['/login']);
  }

  // Agregar este método (línea ~340, justo después de getBarterStatusClass)
  getOfferedProductName(barter: Barter): string {
    return barter?.offered_product?.name || 'Producto desconocido';
  }

  // Añadir este método después de getOfferedProductName
  getProductImageUrl(product: any): string {
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      // Si es un array de objetos con URL
      if (product.images[0]?.url) {
        return product.images[0].url;
      }
      // Si es un array de strings
      if (typeof product.images[0] === 'string') {
        return product.images[0];
      }
    }

    // 2. Verificar si hay una propiedad image directa
    if (product?.image) {
      return product.image;
    }

    // 3. Imagen fallback según categoría del producto
    if (product?.id_category) {
      switch (product.id_category) {
        case 1: return 'img/categories/electronics.jpg';
        case 2: return 'img/categories/clothing.jpg';
        case 3: return 'img/categories/furniture.jpg';
        default: return 'img/product-default.jpg';
      }
    }

    // 4. Imagen fallback general usando la ruta por defecto
    return 'img/product-default.jpg';
  }

  // Manejar errores de carga de imágenes
  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'img/product-default.jpg';
    img.onerror = null; // Prevenir bucle infinito
  }

  // Método para ver detalles del trueque
  viewBarterDetails(barterId: number | undefined, status?: string): void {
    // Solo continúa si el ID está definido
    if (barterId !== undefined) {
      this.selectedBarterDetailsId = barterId;
      this.selectedBarterStatus = status; // Nueva propiedad para pasar el estado
      this.showBarterDetailsModal = true;
    } else {
      // Muestra un mensaje de error si el ID no está definido
      this.toastr.error('No se pudo encontrar el ID del trueque');
    }
  }

  // Método para cerrar el modal de detalles
  handleBarterDetailsClose(event: {refresh: boolean, status?: string}): void {
    this.showBarterDetailsModal = false;
    this.selectedBarterDetailsId = null;
    this.selectedBarterStatus = undefined;

    if (event.refresh) {
      // Si se pide actualización, recargar los datos
      console.log('Actualizando datos después de cambio de estado a:', event.status);
      
      if (event.status === 'aprobado_admin') {
        this.toastr.success('Has aprobado este trueque como administrador');
      }
      
      // Recargar todos los trueques
      this.loadTrueques();
      this.loadTruequesPendingApproval();
    }
  }

  // Añades un método para actualizar un trueque específico en la tabla
  updateBarterInList(
    barterId: number, 
    newStatus: "pendiente" | "aceptado" | "rechazado" | "completado" | "disponible" | "aprobado_admin"
  ): void {
    // El resto del código se mantiene igual
    const barterIndex = this.barters.findIndex(b => b.id_barter === barterId);
    if (barterIndex >= 0) {
      this.barters[barterIndex].status = newStatus;
    }
    
    // Si está aprobado, quitarlo de la lista de pendientes
    if (newStatus === 'aprobado_admin') {
      this.bartersPendingApproval = this.bartersPendingApproval.filter(
        b => b.id_barter !== barterId
      );
    }
  }

  toggleSidebarCollapse() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleSidebar() {
    this.isSidebarActive = !this.isSidebarActive;
  }

  public exitAdmin(): void {
    // Navegar a la página principal
    this.router.navigate(['/']);
  }
}