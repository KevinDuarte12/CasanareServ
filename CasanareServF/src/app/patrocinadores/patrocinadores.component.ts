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
    { image: 'img/safelab.jpg', alt: 'SafeLab' },
    { image: 'img/reciclaje.jpg', alt: 'Vendor 2' },
    { image: 'img/vendor-3.jpg', alt: 'Vendor 3' },
    { image: 'img/vendor-4.jpg', alt: 'Vendor 4' },
    { image: 'img/vendor-5.jpg', alt: 'Vendor 5' },
    { image: 'img/vendor-6.jpg', alt: 'Vendor 6' },
    { image: 'img/vendor-7.jpg', alt: 'Vendor 7' },
    { image: 'img/vendor-8.jpg', alt: 'Vendor 8' }
  ];

  currentIndex = 0;
  slidesPerView = 4;
  autoPlayInterval: any;
  isBrowser: boolean;
  touchStartX = 0;
  touchEndX = 0;
  isDragging = false;
  isTransitioning = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.updateSlidesPerView();
      this.updateSlidePosition();
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
    // Detener transición durante el resize
    this.isTransitioning = true;
    
    if (this.slidesContainer) {
      this.slidesContainer.nativeElement.style.transition = 'none';
    }
    
    this.updateSlidesPerView();
    this.updateSlidePosition();
    
    // Restaurar transición después del resize
    setTimeout(() => {
      if (this.slidesContainer) {
        this.slidesContainer.nativeElement.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      this.isTransitioning = false;
    }, 100);
  }

  updateSlidesPerView() {
    if (!this.isBrowser) return;
    
    const width = window.innerWidth;
    let newSlidesPerView;
    
    // Puntos de quiebre más específicos para mejor responsividad
    if (width >= 1400) {
      newSlidesPerView = 5;
    } else if (width >= 1200) {
      newSlidesPerView = 4;
    } else if (width >= 992) {
      newSlidesPerView = 3;
    } else if (width >= 768) {
      newSlidesPerView = 2;
    } else if (width >= 480) {
      newSlidesPerView = 2;
    } else {
      newSlidesPerView = 1;
    }
    
    // Solo actualizar si hay cambio
    if (this.slidesPerView !== newSlidesPerView) {
      this.slidesPerView = newSlidesPerView;
      
      // Ajustar currentIndex para evitar espacios vacíos
      const maxIndex = this.getMaxIndex();
      if (this.currentIndex > maxIndex) {
        this.currentIndex = Math.max(0, maxIndex);
      }
    }
  }

  getMaxIndex(): number {
    return Math.max(0, this.slides.length - this.slidesPerView);
  }

  nextSlide() {
    if (this.isTransitioning) return;
    
    const maxIndex = this.getMaxIndex();
    
    this.isTransitioning = true;
    
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
      this.updateSlidePosition();
      
      setTimeout(() => {
        this.isTransitioning = false;
      }, 500);
    } else {
      // Transición suave al inicio
      this.currentIndex = 0;
      this.updateSlidePosition();
      
      setTimeout(() => {
        this.isTransitioning = false;
      }, 500);
    }
  }

  prevSlide() {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updateSlidePosition();
      
      setTimeout(() => {
        this.isTransitioning = false;
      }, 500);
    } else {
      // Transición suave al final
      this.currentIndex = this.getMaxIndex();
      this.updateSlidePosition();
      
      setTimeout(() => {
        this.isTransitioning = false;
      }, 500);
    }
  }

  private updateSlidePosition() {
    if (!this.isBrowser || !this.slidesContainer) return;
    
    const slideWidth = 100 / this.slidesPerView;
    const translateValue = this.currentIndex * slideWidth;
    
    this.slidesContainer.nativeElement.style.transform = 
      `translateX(-${translateValue}%)`;
    
    // Actualizar CSS custom property para slides
    this.slidesContainer.nativeElement.style.setProperty('--slides-per-view', this.slidesPerView.toString());
  }

  public startAutoPlay() {
    if (!this.isBrowser || this.autoPlayInterval) return;
    
    this.autoPlayInterval = setInterval(() => {
      if (!this.isDragging && !this.isTransitioning) {
        this.nextSlide();
      }
    }, 4000); // Aumentado a 4 segundos para mejor UX
  }

  public stopAutoPlay() {
    if (this.isBrowser && this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  // Gestos táctiles mejorados
  onTouchStart(e: TouchEvent) {
    if (!this.isBrowser) return;
    
    this.stopAutoPlay();
    this.isDragging = true;
    this.touchStartX = e.touches[0].clientX;
    
    // Asegurar transición suave
    if (this.slidesContainer) {
      this.slidesContainer.nativeElement.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.isBrowser || !this.slidesContainer || !this.isDragging) return;
    
    this.touchEndX = e.touches[0].clientX;
    const diff = this.touchStartX - this.touchEndX;
    
    // Solo para movimientos significativos
    if (Math.abs(diff) > 10) {
      const slideWidth = 100 / this.slidesPerView;
      const currentTransform = this.currentIndex * slideWidth;
      
      // Limitar el arrastre para evitar espacios vacíos
      const maxDrag = slideWidth * 0.3; // Máximo 30% de un slide
      const dragOffset = Math.min(Math.abs(diff) / 3, maxDrag) * (diff > 0 ? 1 : -1);
      
      // Verificar límites
      const newTransform = currentTransform + dragOffset;
      const maxTransform = this.getMaxIndex() * slideWidth;
      
      if (newTransform >= 0 && newTransform <= maxTransform + slideWidth * 0.3) {
        this.slidesContainer.nativeElement.style.transform = 
          `translateX(-${newTransform}%)`;
      }
      
      e.preventDefault();
    }
  }

  onTouchEnd() {
    if (!this.isBrowser || !this.slidesContainer) return;
    
    this.isDragging = false;
    
    const threshold = Math.min(50, window.innerWidth * 0.1); // Threshold adaptativo
    const touchDiff = this.touchStartX - this.touchEndX;
    
    // Restaurar transición suave
    this.slidesContainer.nativeElement.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    
    if (Math.abs(touchDiff) > threshold) {
      if (touchDiff > 0 && this.currentIndex < this.getMaxIndex()) {
        this.nextSlide();
      } else if (touchDiff < 0 && this.currentIndex > 0) {
        this.prevSlide();
      } else {
        // Volver a la posición original si está en los límites
        this.updateSlidePosition();
      }
    } else {
      // Movimiento pequeño, volver a posición original
      this.updateSlidePosition();
    }
    
    // Reiniciar autoplay
    setTimeout(() => {
      if (!this.isDragging) {
        this.startAutoPlay();
      }
    }, 2000);
  }
}