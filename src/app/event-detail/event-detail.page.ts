import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../services/api.service';

import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.page.html',
  styleUrls: ['./event-detail.page.scss'],
  standalone: false,
})
export class EventDetailPage implements OnInit {
  eventId!: number;
  studentId!: number;
  event: any = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private storage: Storage
  ) { }

  async ngOnInit() {
    await this.storage.create();
    // why there is a studentId? to know who owns the event despite the getEventDetail only needing eventId, because in the MySQL there is no description for event participants
    this.eventId = +this.route.snapshot.paramMap.get('eventId')!;
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    const cachedEvent = await this.storage.get(`event_${this.eventId}`);
    if (cachedEvent) {
      console.log('Using cached event:', cachedEvent);
      this.event = cachedEvent;
      this.loading = false; // Display cached data immediately
    }
    this.apiService.getEventDetail(this.eventId).subscribe({
      next: async (res) => {
        this.event = res.event;
        this.loading = false;

        // Cache the event details
        await this.storage.set(`event_${this.eventId}`, this.event);
        console.log('Cached event:', this.event);
      },
      error: () => {
        this.loading = false;
        console.error('Error fetching event details');
      },
    });
  }

  async refreshEvent(event: any) {
    console.log('Refreshing event...');
    await this.storage.remove(`event_${this.eventId}`); // Clear the cache

    this.apiService.getEventDetail(this.eventId).subscribe({
      next: async (res) => {
        this.event = res.event;

        // Cache the fresh data
        await this.storage.set(`event_${this.eventId}`, this.event);
        console.log('Refreshed and cached event:', this.event);

        // Complete the refresher
        event.target.complete();
      },
      error: (error) => {
        console.error('Error refreshing event:', error);

        // Complete the refresher even if there’s an error
        event.target.complete();
      },
    });
  }
}
