import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsentFormsPage } from './consent-forms.page';

describe('ConsentFormsPage', () => {
  let component: ConsentFormsPage;
  let fixture: ComponentFixture<ConsentFormsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsentFormsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
