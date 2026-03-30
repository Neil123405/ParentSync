import { Component, OnInit } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-school-events',
  templateUrl: './school-events.page.html',
  styleUrls: ['./school-events.page.scss'],
  standalone: false,
})
export class SchoolEventsPage implements OnInit {
  studentId?: number;
  events: any[] = [];
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    if (this.studentId) {
      this.apiService.getStudentEvents(this.studentId).subscribe({
        next: (res) => {
          // Attach studentId to each event
            this.events = (res.events || []).map((e: any) => ({ 
            ...e,
            event_id: e.event_id ?? e.id, // Ensure event_id exists
            student_id: this.studentId
          }));
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      this.loading = false;
    }
  }

  openEventDetail(event: any) {
  // Just mark as read, don't decrement (will be recounted on next refresh)
  this.apiService.markEventAsRead(event.event_id, event.student_id).subscribe({
    next: (response) => {
      event.is_read = 1;
      console.log('✓ Event marked as read:', response);
    },
    error: (error) => console.error('❌ Error marking event as read:', error)
  });

  // Navigate to detail page
  this.router.navigate(['/event-detail', event.event_id, event.student_id]);
}

  doRefresh(event: any) {
  this.ngOnInit();
  setTimeout(() => {
    event.target.complete();
  }, 1000); // Or call complete after data is actually loaded
}
}
