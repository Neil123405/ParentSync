import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-day-events',
  templateUrl: './day-events.page.html',
  styleUrls: ['./day-events.page.scss'],
  standalone: false,
})
export class DayEventsPage implements OnInit {
  date: string = '';
  events: any[] = [];
  parentProfile: any;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.date = this.route.snapshot.paramMap.get('date')!;
    this.parentProfile = this.apiService.getCurrentProfile();
    if (this.parentProfile) {
      this.apiService.getParentEventsByDate(this.parentProfile.parent_id, this.date)
        .subscribe(res => {
          this.events = res.events || [];
        });
    }
  }

  onWeekDayClick(date: string) {
    // Option 1: Just reload events for the new date
    this.date = date;
    this.loadEventsForDate(date);
    // Option 2: Navigate to the same page with new date param
    // this.router.navigate(['/day-events', date]);
  }

  loadEventsForDate(date: string) {
    if (this.parentProfile) {
      this.apiService.getParentEventsByDate(this.parentProfile.parent_id, date)
        .subscribe(res => {
          this.events = res.events || [];
        });
    }
  }

  openEventDetail(event: any) {
    this.router.navigate(['/event-detail', event.id, event.student_id]);
  }
}
