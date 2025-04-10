import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ProductService } from '../services/productos.services';
import { CategoryService } from '../services/category.service';
import { Product } from '../interfaces/product';
import { Category } from '../interfaces/category';

@Component({
  selector: 'app-edit-product',
  templateUrl: './edit-product.component.html',
  styleUrls: ['./edit-product.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class EditProductComponent implements OnInit {
  @Input() productId: number | undefined;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<boolean>();
  
  productData: Product = {
    id_user: 0,
    id_category: 0,
    name: '',
    description: '',
    price: 0,
    stock: 0,
    permite_trueque: false
  };
  
  categories: Category[] = [];
  loading: boolean = false;
  isSaving: boolean = false;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadCategories();
    
    // Si hay un ID de producto, cargar los datos
    if (this.productId) {
      this.loadProductData();
    } else {
      // Para productos nuevos, obtener el ID del usuario actual del localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        this.productData.id_user = user.id;
      }
    }
  }

  loadCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe({
      next: (data) => {
        this.categories = data.filter(category => category.status); // Solo categorías activas
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.toastr.error('Error al cargar las categorías');
        this.loading = false;
      }
    });
  }

  loadProductData(): void {
    this.loading = true;
    this.productService.getProduct(this.productId!).subscribe({
      next: (data) => {
        this.productData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos del producto:', error);
        this.toastr.error('Error al cargar los datos del producto');
        this.loading = false;
        this.closeModal(false);
      }
    });
  }

  onSubmit(): void {
    this.isSaving = true;
    
    if (this.productId) {
      // Actualizar producto existente
      this.productService.updateProduct(this.productId, this.productData).subscribe({
        next: () => {
          this.toastr.success('Producto actualizado exitosamente');
          this.isSaving = false;
          this.closeModal(true);
        },
        error: (error) => {
          console.error('Error al actualizar producto:', error);
          this.toastr.error(error.error?.msg || 'Error al actualizar el producto');
          this.isSaving = false;
        }
      });
    } else {
      // Crear nuevo producto
      this.productService.createProduct(this.productData).subscribe({
        next: () => {
          this.toastr.success('Producto creado exitosamente');
          this.isSaving = false;
          this.closeModal(true);
        },
        error: (error) => {
          console.error('Error al crear producto:', error);
          this.toastr.error(error.error?.msg || 'Error al crear el producto');
          this.isSaving = false;
        }
      });
    }
  }

  cancel(): void {
    this.closeModal(false);
  }

  closeModal(refresh: boolean): void {
    this.close.emit(refresh);
  }
}
