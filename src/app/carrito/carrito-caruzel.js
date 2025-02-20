let index = 0;
function moveCarousel(direction) {
    const carousel = document.getElementById('carousel');
    if (!carousel) {
        console.error("Error: No se encontró el elemento con ID 'carousel'");
        return;
    }
    const items = document.querySelectorAll('.recommended-item');
    const totalItems = items.length;
    index = (index + direction + totalItems) % totalItems;
    carousel.style.transform = `translateX(${-index * 100}%)`;
}
setInterval(() => moveCarousel(1), 3000);
