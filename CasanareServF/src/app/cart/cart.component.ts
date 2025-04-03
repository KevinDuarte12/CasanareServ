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
    { image: 'img/relog.jpg', alt: 'Slide 4', name: 'Reloj inteligente', price: 120, quantity: 18 },
    { image: 'img/pantalon.jpg', alt: 'Slide 5', name: 'jogers', price: 90, quantity: 13 },
    { image: 'img/impresora-3d.jpg', alt: 'Slide 6', name: 'Impresora 3D', price: 300, quantity: 17 },
    { image: 'img/pc-gamer.jpg', alt: 'Slide 7', name: 'Pc Gamers', price: 480, quantity: 20 },
    { image: 'img/ps5.jpg', alt: 'Slide 8', name: 'Play Station-5', price: 600, quantity: 12 }
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
