import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService, User, ParentProfile } from '../services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentUser: User | null = null;
  currentProfile: ParentProfile | null = null;
  
  laravelAnnouncements: any[] = [];
  mixedFeed: any[] = [];
  laravelChildren: any[] = [];
  laravelEvents: any[] = [];

  constructor(
    private apiService: ApiService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.currentUser = this.apiService.getCurrentUser();
    this.currentProfile = this.apiService.getCurrentProfile();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
    });

    if (this.currentProfile) {
      this.loadAnnouncementsAndEvents();
    }
  }

  loadAnnouncementsAndEvents() {
    if (!this.currentProfile) return;

    // Announcements
    this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        this.laravelAnnouncements = response.announcements || [];
        // Only announcements in mixedFeed
        this.mixedFeed = this.laravelAnnouncements.map((a: any) => ({
          type: 'announcement',
          data: a
        }));
      }
    });

    // Events for all children
    this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        this.laravelEvents = response.events || [];
      }
    });

    // Children (for getStudentById)
    this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        this.laravelChildren = response.children || [];
      }
    });
  }

  async refreshData() {
    this.loadAnnouncementsAndEvents();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: () => {
            this.apiService.logout();
            this.router.navigate(['/login']);
          }
        }
      ]
    });
    await alert.present();
  }

  openAnnouncement(announcement: any) {
    this.router.navigate(['/announcement-detail', announcement.announcement_id]);
  }

  openEventDetail(event: any) {
    this.router.navigate(['/school-event-detail', event.event_id, event.student_id]);
  }

  getStudentById(studentId: number) {
    return this.laravelChildren.find(child => child.student_id === studentId);
  }
}