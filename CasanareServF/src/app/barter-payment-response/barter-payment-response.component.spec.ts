import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarterPaymentResponseComponent } from './barter-payment-response.component';

describe('BarterPaymentResponseComponent', () => {
  let component: BarterPaymentResponseComponent;
  let fixture: ComponentFixture<BarterPaymentResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarterPaymentResponseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarterPaymentResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
