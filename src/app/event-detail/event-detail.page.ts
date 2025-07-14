import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';

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
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.eventId = +this.route.snapshot.paramMap.get('eventId')!;
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.apiService.getEventDetail(this.eventId).subscribe({
      next: (res) => {
        this.event = res.event;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
