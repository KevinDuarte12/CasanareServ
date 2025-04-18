import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-patrocinadores',
  templateUrl: './patrocinadores.component.html',
  styleUrls: ['./patrocinadores.component.css'],
  imports: [NgFor],
  standalone: true
})
export class PatrocinadoresComponent implements OnInit, OnDestroy {
  @ViewChild('slidesContainer') slidesContainer!: ElementRef;

  slides = [
    { image: 'img/caballo.jpg', alt: 'Slide 1' },
    { image: 'img/vendor-2.jpg', alt: 'Slide 2' },
    { image: 'img/vendor-3.jpg', alt: 'Slide 3' },
    { image: 'img/vendor-4.jpg', alt: 'Slide 4' },
    { image: 'img/vendor-5.jpg', alt: 'Slide 5' },
    { image: 'img/vendor-6.jpg', alt: 'Slide 6' },
    { image: 'img/vendor-7.jpg', alt: 'Slide 7' },
    { image: 'img/vendor-8.jpg', alt: 'Slide 8' }
  ];

  currentIndex = 0;
  slidesPerView = 4;
  autoPlayInterval: any;
  isBrowser: boolean;
  touchStartX = 0;
  touchEndX = 0;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.updateSlidesPerView();
      this.startAutoPlay();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.stopAutoPlay();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateSlidesPerView();
    this.updateSlidePosition();
  }

  updateSlidesPerView() {
    const width = window.innerWidth;
    if (width < 480) {
      this.slidesPerView = 1;
    } else if (width < 768) {
      this.slidesPerView = 2;
    } else if (width < 1024) {
      this.slidesPerView = 3;
    } else {
      this.slidesPerView = 4;
    }
    
    // Ajusta el currentIndex para que no exceda el máximo permitido
    const maxIndex = this.slides.length - this.slidesPerView;
    if (this.currentIndex > maxIndex) {
      this.currentIndex = maxIndex > 0 ? maxIndex : 0;
    }
  }

  nextSlide() {
    const maxIndex = this.slides.length - this.slidesPerView;
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
    } else {
      // Animación suave al volver al inicio
      this.currentIndex = maxIndex;
      setTimeout(() => {
        if (this.slidesContainer) {
          this.slidesContainer.nativeElement.style.transition = 'none';
          this.currentIndex = 0;
          this.updateSlidePosition();
          setTimeout(() => {
            if (this.slidesContainer) {
              this.slidesContainer.nativeElement.style.transition = 'transform 0.5s ease';
            }
          }, 50);
        }
      }, 500);
    }
    this.updateSlidePosition();
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      // Animación suave al ir al final
      this.currentIndex = 0;
      setTimeout(() => {
        if (this.slidesContainer) {
          this.slidesContainer.nativeElement.style.transition = 'none';
          this.currentIndex = this.slides.length - this.slidesPerView;
          this.updateSlidePosition();
          setTimeout(() => {
            if (this.slidesContainer) {
              this.slidesContainer.nativeElement.style.transition = 'transform 0.5s ease';
            }
          }, 50);
        }
      }, 500);
    }
    this.updateSlidePosition();
  }

  private updateSlidePosition() {
    if (this.isBrowser && this.slidesContainer) {
      const slideWidth = 100 / this.slidesPerView;
      this.slidesContainer.nativeElement.style.transform = 
        `translateX(-${this.currentIndex * slideWidth}%)`;
    }
  }

  public startAutoPlay() {
    if (this.isBrowser && !this.autoPlayInterval) {
      this.autoPlayInterval = setInterval(() => {
        this.nextSlide();
      }, 5000);
    }
  }

  public stopAutoPlay() {
    if (this.isBrowser && this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  // Soporte para gestos táctiles
  onTouchStart(e: TouchEvent) {
    this.stopAutoPlay(); // Detener reproducción automática al tocar
    this.touchStartX = e.touches[0].clientX;
    
    // Si tenemos una transición, asegurémonos de que esté establecida correctamente
    if (this.slidesContainer) {
      this.slidesContainer.nativeElement.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.slidesContainer) return;
    
    this.touchEndX = e.touches[0].clientX;
    const diff = this.touchStartX - this.touchEndX;
    const slideWidth = 100 / this.slidesPerView;
    
    // Solo para movimientos significativos (evitar pequeños movimientos accidentales)
    if (Math.abs(diff) > 10) {
      // Aplica un arrastre visual limitado (no más de medio slide)
      const dragOffset = Math.min(Math.abs(diff) / 5, slideWidth / 2) * (diff > 0 ? 1 : -1);
      const baseTransform = this.currentIndex * slideWidth;
      
      this.slidesContainer.nativeElement.style.transform = 
        `translateX(-${baseTransform + dragOffset}%)`;
        
      // Prevenir desplazamiento de página en móviles durante el gesto
      e.preventDefault();
    }
  }

  onTouchEnd() {
    if (!this.slidesContainer) return;
    
    const threshold = 50; // Umbral reducido para dispositivos móviles
    const touchDiff = this.touchStartX - this.touchEndX;
    
    // Restaurar la transición suave
    this.slidesContainer.nativeElement.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    
    if (Math.abs(touchDiff) > threshold) {
      if (touchDiff > 0) {
        this.nextSlide();
      } else {
        this.prevSlide();
      }
    } else {
      // Si el movimiento es pequeño, vuelve a la posición original
      this.updateSlidePosition();
    }
    
    // Reiniciar el autoplay después de un tiempo
    setTimeout(() => {
      this.startAutoPlay();
    }, 3000);
  }
}