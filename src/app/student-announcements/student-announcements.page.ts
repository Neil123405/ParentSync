import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-student-announcements',
  templateUrl: './student-announcements.page.html',
  styleUrls: ['./student-announcements.page.scss'],
  standalone: false,
})
export class StudentAnnouncementsPage implements OnInit {
  studentId!: number;
  announcements: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.apiService.getStudentAnnouncements(this.studentId).subscribe(res => {
      this.announcements = res.announcements || [];
    });
  }

  openAnnouncementDetail(announcement: any) {
    this.router.navigate(['/announcement-detail', announcement.id ?? announcement.announcement_id]);
  }

  doRefresh(event: any) {
    this.ngOnInit();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }
}