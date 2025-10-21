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
    const cachedAnnouncement = await this.storage.get(`announcement_${this.announcementId}`);
    if (cachedAnnouncement) {
      console.log('Using cached announcement:', cachedAnnouncement);
      this.announcement = cachedAnnouncement;
    }
    this.apiService.getAnnouncementDetail(this.announcementId).subscribe({
      next: async (res) => {
        this.announcement = res.announcement;

        // Cache the announcement
        await this.storage.set(`announcement_${this.announcementId}`, this.announcement);
        console.log('Cached announcement:', this.announcement);
      },
      error: (error) => {
        console.error('Error fetching announcement:', error);
      },
    });
  }

  async clearAnnouncementCache(announcementId: number) {
    await this.storage.remove(`announcement_${announcementId}`);
    console.log(`Cache cleared for announcement ID: ${announcementId}`);
  }

  async refreshAnnouncement(event: any) {
  console.log('Refreshing announcement...');

  // Clear the cache for the current announcement
  await this.storage.remove(`announcement_${this.announcementId}`);
  console.log(`Cache cleared for announcement ID: ${this.announcementId}`);

  // Fetch fresh data
  this.apiService.getAnnouncementDetail(this.announcementId).subscribe({
    next: async (res) => {
      this.announcement = res.announcement;

      // Cache the fresh data
      await this.storage.set(`announcement_${this.announcementId}`, this.announcement);
      console.log('Refreshed and cached announcement:', this.announcement);

      // Complete the refresher
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
