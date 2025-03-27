import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-patrocinadores',
  templateUrl: './patrocinadores.component.html',
  styleUrls: ['./patrocinadores.component.css'],
  imports: [NgFor]
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

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.startAutoPlay();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      this.stopAutoPlay();
    }
  }

  nextSlide() {
    if (this.currentIndex < this.slides.length - this.slidesPerView) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0;
    }
    this.updateSlidePosition();
  }

  prevSlide() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = this.slides.length - this.slidesPerView;
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
}