import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConsentFormDetailPage } from './consent-form-detail.page';

describe('ConsentFormDetailPage', () => {
  let component: ConsentFormDetailPage;
  let fixture: ComponentFixture<ConsentFormDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ConsentFormDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
