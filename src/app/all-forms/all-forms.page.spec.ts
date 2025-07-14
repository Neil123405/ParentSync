import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllFormsPage } from './all-forms.page';

describe('AllFormsPage', () => {
  let component: AllFormsPage;
  let fixture: ComponentFixture<AllFormsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllFormsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
