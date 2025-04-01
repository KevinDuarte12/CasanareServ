import { Component } from '@angular/core';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.component.html',
  styleUrls: ['./carrito.component.css']
})
export class CarritoComponent {
  carrito: number[] = [];
  mensajeVacio = true;
  cantidadProductos = 0;
  totalPrecio = 0;

  agregarProducto(precio: number) {
    this.carrito.push(precio);
    this.actualizarCarrito();
  }

  eliminarProducto() {
    this.carrito.pop();
    this.actualizarCarrito();
  }

  actualizarCarrito() {
    this.mensajeVacio = this.carrito.length === 0;
    this.cantidadProductos = this.carrito.length;
    this.totalPrecio = this.carrito.reduce((acc, val) => acc + val, 0);
  }
}
