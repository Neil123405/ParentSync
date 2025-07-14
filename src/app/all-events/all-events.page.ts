import { Component, OnInit } from '@angular/core';
import { ApiService, ParentProfile } from '../services/api.service';

@Component({
  selector: 'app-all-events',
  templateUrl: './all-events.page.html',
  styleUrls: ['./all-events.page.scss'],
  standalone: false,
})
export class AllEventsPage implements OnInit {
  parent: ParentProfile | null = null;
  events: any[] = [];
  loading = true;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.parent = this.apiService.getCurrentProfile();
    if (this.parent) {
      this.apiService.getParentEvents(this.parent.parent_id).subscribe({
        next: (response) => {
          this.events = response.events || [];
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
