import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
    private apiService: ApiService
  ) {}

  ngOnInit() {
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    if (this.studentId) {
      this.apiService.getStudentEvents(this.studentId).subscribe({
        next: (res) => {
          this.events = res.events || [];
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
}
