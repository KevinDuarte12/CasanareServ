import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RatingsListComponent } from './ratings-list.component';

describe('RatingsListComponent', () => {
  let component: RatingsListComponent;
  let fixture: ComponentFixture<RatingsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RatingsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RatingsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
