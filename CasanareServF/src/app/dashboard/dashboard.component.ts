import { Component, OnInit } from '@angular/core';
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
export class DashboardComponent implements OnInit {
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

  // Método para abrir modal de edición
  editBarter(barter: Barter): void {
    console.log('Barter a editar:', barter);
    
    // Asegúrate de que status exista
    if (!barter.status) {
      barter.status = 'pendiente'; // Valor por defecto si es undefined
    }
    
    this.selectedBarterId = barter.id_barter;
    this.showBarterModal = true; // Cambiado de isBarterModalOpen a showBarterModal
  }

  // Método para manejar cierre del modal
  onBarterModalClose(refresh: boolean): void {
    this.showBarterModal = false; // Cambiado de isBarterModalOpen a showBarterModal
    this.selectedBarterId = undefined;
    
    if (refresh) {
      this.loadTrueques(); // Cambiado de loadBarters a loadTrueques
    }
  }

  // Método para cerrar sesión
  logOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.toastr.success('Sesión cerrada correctamente');
    this.router.navigate(['/login']);
  }
}