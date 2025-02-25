import { Component, inject } from '@angular/core';
import { Injector } from '@angular/core';
import { ProductosService } from '../services/productos.services';

@Component({
  selector: 'app-featured-products',
  imports: [],
  templateUrl: './featured-products.component.html',
  styleUrl: './featured-products.component.css',
  providers: [ProductosService]
})
export class FeaturedProductsComponent {
// private productosService = inject(ProductosService);
// constructor() {
//   this.productosService.Productos().subscribe((productos) => {
//     console.log(productos);
//   }
// }
}
