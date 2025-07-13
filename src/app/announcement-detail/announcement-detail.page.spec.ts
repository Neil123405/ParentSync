import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnnouncementDetailPage } from './announcement-detail.page';

describe('AnnouncementDetailPage', () => {
  let component: AnnouncementDetailPage;
  let fixture: ComponentFixture<AnnouncementDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnnouncementDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
