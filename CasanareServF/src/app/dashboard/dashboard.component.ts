import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
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

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, SpinnerComponent, EditUserComponent, EditCategoryComponent, EditProductComponent, EditBarterComponent]
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

  // Contador para las estadísticas
  userCount = 0;
  productCount = 0;
  truequeCount = 0;

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
  }

  ngAfterViewInit() {
    // Este método se ejecuta después de que Angular haya inicializado completamente la vista
    // Es útil para capturar y manejar errores de renderizado
    console.log('Vista inicializada correctamente');
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
  loadProducts() {
    this.productsLoading = true;
    this.productService.getProducts().subscribe({
      next: (response) => {
        this.products = response;
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
  loadTrueques() {
    this.bartersLoading = true;
    this.barterService.getBarters().subscribe({
      next: (response) => {
        this.barters = response;
        this.truequeCount = this.barters.length;
        this.bartersLoading = false;
      },
      error: (error) => {
        this.bartersLoading = false;
        this.toastr.error(error.error?.msg || 'Error al cargar los trueques');
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
    }
  }

  updateBarterStatus(id: number, estado: 'pendiente' | 'aceptado' | 'rechazado' | 'completado') {
    this.bartersLoading = true;
    this.barterService.updateBarterStatus(id, estado).subscribe({
      next: () => {
        this.toastr.success(`Estado del trueque cambiado a ${estado}`);
        this.loadTrueques();
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
      case 'aceptado': return 'Aceptado';
      case 'rechazado': return 'Rechazado';
      case 'completado': return 'Completado';
      default: return 'Desconocido';
    }
  }

  // Función para obtener clase CSS según estado
  getBarterStatusClass(status: string): string {
    switch(status) {
      case 'pendiente': return 'bg-yellow-500';
      case 'aceptado': return 'bg-green-500';
      case 'rechazado': return 'bg-red-500';
      case 'completado': return 'bg-blue-500';
      default: return 'bg-gray-500';
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
  confirmStatusChange(barter: Barter, newStatus: 'pendiente' | 'aceptado' | 'rechazado' | 'completado'): void {
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
    }
    
    if (confirm(confirmMessage)) {
      this.updateBarterStatus(barter.id_barter!, newStatus);
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
}