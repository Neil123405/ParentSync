import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../services/api.service';

import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-announcement-detail',
  templateUrl: './announcement-detail.page.html',
  styleUrls: ['./announcement-detail.page.scss'],
  standalone: false,
})
export class AnnouncementDetailPage implements OnInit {
  announcementId!: number;
  studentId!: number;
  announcement: any;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private storage: Storage
  ) { }

  async ngOnInit() {
    // the plus converts the string to a number
    await this.storage.create();
    this.announcementId = +this.route.snapshot.paramMap.get('announcementId')!;
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    const cachedAnnouncement = await this.storage.get(`announcement_${this.announcementId}`);
    if (cachedAnnouncement) {
      this.announcement = cachedAnnouncement;
    }
    this.apiService.getAnnouncementDetail(this.announcementId).subscribe({
      next: async (res) => {
        this.apiService.markAnnouncementAsRead(this.announcementId, this.studentId).subscribe({
  next: () => { this.announcement.is_read = true; },
  error: (err) => console.warn('mark read failed', err)
});
        this.announcement = res.announcement;

        // Cache the announcement
        await this.storage.set(`announcement_${this.announcementId}`, this.announcement);
      },
      error: (error) => {
        console.error('Error fetching announcement:', error);
      },
    });
  }

  async clearAnnouncementCache(announcementId: number) {
    await this.storage.remove(`announcement_${announcementId}`);
  }

  async refreshAnnouncement(event: any) {
    // Clear the cache for the current announcement
    await this.storage.remove(`announcement_${this.announcementId}`);

    // Fetch fresh data
    this.apiService.getAnnouncementDetail(this.announcementId).subscribe({
      next: async (res) => {
        this.announcement = res.announcement;

        // Cache the fresh data
        await this.storage.set(`announcement_${this.announcementId}`, this.announcement);

        // Complete refresher
        event.target.complete();
      },
      error: (error) => {
        console.error('Error refreshing announcement:', error);

        // Complete the refresher even if there’s an error
        event.target.complete();
      },
    });
  }
}
