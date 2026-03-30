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
    console.log('studentId from route', this.studentId);
  }

  openAnnouncementDetail(announcement: any) {
  const announcementId = announcement.id ?? announcement.announcement_id;
  const studentId = this.studentId; // from route param
   if (!studentId) {
    console.error('studentId missing');
    return;
  }
  this.apiService.markAnnouncementAsRead(announcementId, studentId).subscribe({
    next: () => {
    announcement.is_read = 1;
    // this.apiService.decrementUnreadAnnouncementCount(studentId);
  },
  error: (err) => {
    console.warn('mark read failed', err);
  }
  });

  this.router.navigate(['/announcement-detail', announcementId, studentId]);
}

  doRefresh(event: any) {
    this.ngOnInit();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }
}