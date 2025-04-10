import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BarterService } from '../services/barter.service';
import { ProductService } from '../services/productos.services';
import { UserService } from '../services/user.services';
import { Barter } from '../interfaces/barter';
import { Product } from '../interfaces/product';
import { user } from '../interfaces/user';

@Component({
  selector: 'app-edit-barter',
  templateUrl: './edit-barter.component.html',
  styleUrls: ['./edit-barter.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditBarterComponent implements OnInit {
  @Input() barterId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  
  barterData: Barter = {
    id_prod_offer: 0,
    id_prod_request: 0,
    id_user_offer: 0,
    id_user_receiving: 0,
    value: 0,
    status: 'pendiente'
  };
  
  availableProducts: Product[] = [];
  users: user[] = [];
  loading: boolean = false;
  isSaving: boolean = false;

  // Propiedades para filtrar productos por usuario
  userProducts: { [key: number]: Product[] } = {};
  selectedOfferUser: number = 0;
  selectedReceivingUser: number = 0;

  constructor(
    private barterService: BarterService,
    private productService: ProductService,
    private userService: UserService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
    this.loadProducts();
    
    if (this.barterId) {
      this.loadBarterData();
    } else {
      // Obtener el ID del usuario actual del localStorage para preseleccionar
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        this.barterData.id_user_offer = user.id;
        this.selectedOfferUser = user.id;
      }
    }
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.toastr.error('Error al cargar los usuarios');
        this.loading = false;
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        // Solo productos disponibles (no vendidos ni en trueque)
        this.availableProducts = data.filter(product => product.status === 'disponible');
        
        // Agrupar productos por usuario
        this.availableProducts.forEach(product => {
          if (!this.userProducts[product.id_user]) {
            this.userProducts[product.id_user] = [];
          }
          this.userProducts[product.id_user].push(product);
        });
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.toastr.error('Error al cargar los productos');
        this.loading = false;
      }
    });
  }

  loadBarterData(): void {
    this.loading = true;
    this.barterService.getBarter(this.barterId!).subscribe({
      next: (data) => {
        this.barterData = data;
        this.selectedOfferUser = data.id_user_offer;
        this.selectedReceivingUser = data.id_user_receiving;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del trueque:', error);
        this.toastr.error('Error al cargar los datos del trueque');
        this.loading = false;
        this.closeModal(false);
      }
    });
  }

  onSubmit(): void {
    this.isSaving = true;
    
    if (this.barterId) {
      console.log('Estado a enviar:', this.barterData.status); // Para debugging
      
      // Asegúrate de que el status no sea undefined
      if (!this.barterData.status) {
        this.toastr.error('Debes seleccionar un estado válido');
        this.isSaving = false;
        return;
      }
      
      // Actualizar trueque (solo se puede cambiar el estado)
      this.barterService.updateBarterStatus(this.barterId, this.barterData.status).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.toastr.success('Estado del trueque actualizado exitosamente');
          this.isSaving = false;
          this.closeModal(true);
        },
        error: (error) => {
          console.error('Error al actualizar trueque:', error);
          this.toastr.error(error.error?.msg || 'Error al actualizar el trueque');
          this.isSaving = false;
        }
      });
    } else {
      // Crear nuevo trueque
      this.barterService.createBarter(this.barterData).subscribe({
        next: () => {
          this.toastr.success('Solicitud de trueque creada exitosamente');
          this.isSaving = false;
          this.closeModal(true);
        },
        error: (error) => {
          console.error('Error al crear trueque:', error);
          this.toastr.error(error.error?.msg || 'Error al crear la solicitud de trueque');
          this.isSaving = false;
        }
      });
    }
  }

  onUserOfferChange(): void {
    // Resetear el producto ofrecido cuando cambia el usuario
    this.barterData.id_prod_offer = 0;
  }

  onUserReceivingChange(): void {
    // Resetear el producto solicitado cuando cambia el usuario
    this.barterData.id_prod_request = 0;
  }

  // Obtener los productos disponibles para un usuario específico
  getProductsForUser(userId: number): Product[] {
    return this.userProducts[userId] || [];
  }

  cancel(): void {
    this.closeModal(false);
  }

  closeModal(refresh: boolean): void {
    this.close.emit(refresh);
  }
}
