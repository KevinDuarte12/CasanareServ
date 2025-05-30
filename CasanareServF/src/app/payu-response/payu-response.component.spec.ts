import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayuResponseComponent } from './payu-response.component';

describe('PayuResponseComponent', () => {
  let component: PayuResponseComponent;
  let fixture: ComponentFixture<PayuResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayuResponseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayuResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
