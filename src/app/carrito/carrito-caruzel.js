let index = 0;

function moveCarousel(direction) {
    const carousel = document.getElementById('carousel');
    const items = document.querySelectorAll(".recommended-item"); // Cambio en la variable

    if (!carousel || items.length === 0) {
        console.error("Error: No se encontraron los elementos necesarios");
        return;
    }

    const itemWidth = items[0].offsetWidth + 20; // Corregido offsetWidth y renombrado
    const totalItems = items.length;

    index = (index + direction + totalItems) % totalItems;
    carousel.style.transform = `translateX(${-index * itemWidth}px)`;
}

document.addEventListener("DOMContentLoaded", function () {
    setInterval(() => moveCarousel(1), 3000);
});
