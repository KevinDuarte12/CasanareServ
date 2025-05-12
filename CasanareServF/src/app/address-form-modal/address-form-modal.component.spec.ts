import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddressFormModalComponent } from './address-form-modal.component';

describe('AddressFormModalComponent', () => {
  let component: AddressFormModalComponent;
  let fixture: ComponentFixture<AddressFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddressFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
