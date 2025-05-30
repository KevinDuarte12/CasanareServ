import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarterCheckoutComponent } from './barter-checkout.component';

describe('BarterCheckoutComponent', () => {
  let component: BarterCheckoutComponent;
  let fixture: ComponentFixture<BarterCheckoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarterCheckoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BarterCheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
