import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { ApiService, User, ParentProfile } from '../services/api.service';

interface LaravelAnnouncement {
  announcement_id: number;
  title: string;
  content: string;
  scope: string;
  created_at: string;
  student_id?: number;
}

interface LaravelEvent {
  event_id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  cost: number;
  scope: string;
  created_at: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentUser: User | null = null;
  currentProfile: ParentProfile | null = null;
  
  laravelAnnouncements: LaravelAnnouncement[] = [];
  laravelEvents: LaravelEvent[] = [];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private apiService: ApiService
  ) { }

  ngOnInit() {
    // Check authentication
    this.currentUser = this.apiService.getCurrentUser();
    this.currentProfile = this.apiService.getCurrentProfile();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    // Subscribe to user changes
    this.apiService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
    });

    // Load data
    if (this.currentProfile) {
      this.loadData();
    }
  }

  async loadData() {
    if (!this.currentProfile) return;

    const loading = await this.loadingController.create({
      message: 'Loading announcements...',
    });
    await loading.present();

    try {
      // Load announcements
      this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
        next: (response) => {
          console.log(response);
          if (response.success) {
            this.laravelAnnouncements = response.announcements;
            console.log(response);
          }
        },
        error: (error) => console.error('Error loading announcements:', error)
      });

      // Load events
      this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe({
        next: (response) => {
          if (response.success) {
            this.laravelEvents = response.events;
          }
        },
        error: (error) => console.error('Error loading events:', error)
      });

      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      console.error('Error loading data:', error);
    }
  }

  async refreshData() {
    await this.loadData();
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
}