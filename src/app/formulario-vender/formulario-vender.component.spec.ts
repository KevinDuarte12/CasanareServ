import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioVenderComponent } from './formulario-vender.component';

describe('FormularioVenderComponent', () => {
  let component: FormularioVenderComponent;
  let fixture: ComponentFixture<FormularioVenderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioVenderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormularioVenderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
