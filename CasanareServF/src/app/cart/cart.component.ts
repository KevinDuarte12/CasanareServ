import { Component,OnInit, OnDestroy, PLATFORM_ID, Inject, ElementRef, ViewChild } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterLink } from '@angular/router';
import { NgFor } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
@Component({
  selector: 'app-cart',
  imports: [HeaderComponent, NavbarComponent, BreadcrumbComponent, FooterComponent, RouterLink, NgFor],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy{
  @ViewChild('slidesContainer') slidesContainer!: ElementRef;

  slides = [
    { image: 'img/mano_libres.jpg', alt: 'Slide 1', name: 'Auriculares Bluetooth', price: 50, quantity: 10 },
    { image: 'img/zapatilla.jpg', alt: 'Slide 2', name: 'Zapatillas deportivas', price: 70, quantity: 5 },
    { image: 'img/mouse.jpg', alt: 'Slide 3', name: 'Mouse inalámbrico', price: 25, quantity: 15 },
    { image: 'img/reloj.jpg', alt: 'Slide 4', name: 'Reloj inteligente', price: 120, quantity: 8 },
    { image: 'img/vendor-5.jpg', alt: 'Slide 5', name: 'Cámara de seguridad', price: 90, quantity: 3 },
    { image: 'img/vendor-6.jpg', alt: 'Slide 6', name: 'Teclado mecánico', price: 90, quantity: 7 },
    { image: 'img/vendor-7.jpg', alt: 'Slide 7', name: 'Monitor 24 pulgadas', price: 180, quantity: 4 },
    { image: 'img/vendor-8.jpg', alt: 'Slide 8', name: 'Altavoz portátil', price: 60, quantity: 12 }
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
