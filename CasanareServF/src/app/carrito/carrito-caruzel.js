document.addEventListener("DOMContentLoaded", () => {
  const carritoMensaje = document.getElementById("mensaje");
  const cantidadProductos = document.getElementById("cantidad");
  const totalPrecio = document.getElementById("total");
  const eliminarBtn = document.getElementById("eliminar");
  const finalizarBtn = document.getElementById("finalizar");
  const botonesAgregar = document.querySelectorAll(".agregar");

  let carrito = [];

  botonesAgregar.forEach(boton => {
      boton.addEventListener("click", (e) => {
          const precio = parseInt(e.target.getAttribute("data-precio"));
          carrito.push(precio);
          actualizarCarrito();
      });
  });

  eliminarBtn.addEventListener("click", () => {
      carrito = [];
      actualizarCarrito();
  });

  function actualizarCarrito() {
      if (carrito.length > 0) {
          carritoMensaje.style.display = "none";
          eliminarBtn.disabled = false;
          finalizarBtn.disabled = false;
      } else {
          carritoMensaje.style.display = "block";
          eliminarBtn.disabled = true;
          finalizarBtn.disabled = true;
      }
      cantidadProductos.textContent = carrito.length;
      totalPrecio.textContent = new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP"
      }).format(carrito.reduce((acc, val) => acc + val, 0));
  }
});
