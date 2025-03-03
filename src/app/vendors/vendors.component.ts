import { Component, OnInit } from '@angular/core';
declare var $: any;

@Component({
  selector: 'app-vendors',
  templateUrl: './vendors.component.html',
  styleUrls: ['./vendors.component.css']
})
export class VendorsComponent implements OnInit {
  ngOnInit() {
    $('.vendor-carousel').owlCarousel({
      loop: true,
      margin: 29,
      nav: false,
      autoplay: true,
      smartSpeed: 1000,
      responsive: {
        0: {
          items: 2
        },
        576: {
          items: 3
        },
        768: {
          items: 4
        },
        992: {
          items: 5
        },
        1200: {
          items: 6
        }
      }
    });
  }
}
