import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditBarterComponent } from './edit-barter.component';

describe('EditBarterComponent', () => {
  let component: EditBarterComponent;
  let fixture: ComponentFixture<EditBarterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditBarterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditBarterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
