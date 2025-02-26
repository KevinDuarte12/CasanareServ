import { Component, inject, Input } from '@angular/core';
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
  @Input() title: string = 'Featured Products';
  @Input() maxProducts: number = 8;
}
