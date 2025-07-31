import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../services/api.service';

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
    private apiService: ApiService
  ) {}

  ngOnInit() {
    // the plus converts the string to a number
    this.announcementId = +this.route.snapshot.paramMap.get('announcementId')!;
    this.apiService.getAnnouncementDetail(this.announcementId).subscribe(res => {
      this.announcement = res.announcement;
    });
  }
}
