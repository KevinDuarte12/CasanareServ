let index = 0;
function moveCarousel(direction) {
    const carousel = document.getElementById('carousel');
    const item = document.querySelectorAll(".recommended-item");
    if (!carousel || items.length === 0)  {
        console.error("Error: No se encontraron los elementos necesarios");
        return;
    }
    const itemwidth = items[0].offsetwidth + 20; //Ancho del item + margen//
    const totalItems = items.length;
    index = (index+ direction + totalItems) % totalItems;
    carousel.style.transform = `translateX(${-index * itemWidth}px)`;
  }

  document.addEventListener("DOMContentLoaded", function(){
    setInterval (()=> moveCarousel(1),3000);
  });
