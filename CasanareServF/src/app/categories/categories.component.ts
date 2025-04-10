import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
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
    private productService: ProductService, // Asumiendo que tienes un servicio de productos
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;

    // Obtener todas las categorías y todos los productos en paralelo
    forkJoin({
      categories: this.categoryService.getCategories(),
      products: this.productService.getRecentProducts() // Asumiendo que esto trae todos los productos
    }).subscribe({
      next: (result) => {
        console.log('Datos cargados:', result);
        this.categories = result.categories;
        
        // Limitar a 12 categorías
        const limitedCategories = this.categories.slice(0, this.maxCategoriesToShow);
        
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
          productCount: products.length
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
        this.displayedCategories = validCategories.map(cat => ({
          ...cat,
          productCount: 0
        }));
        
        this.loading = false;
      }
    });
  }
}
