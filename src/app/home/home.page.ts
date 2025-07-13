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
  consentForms: any[] = [];
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
    console.log('ngOnInit: currentUser', this.currentUser);
    console.log('ngOnInit: currentProfile', this.currentProfile);

    if (!this.currentUser) {
      console.log('No user, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.apiService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('currentUser$ updated:', user);
    });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
      console.log('currentProfile$ updated:', profile);
    });

    if (this.currentProfile) {
      console.log('Loading children and feed...');
      this.loadChildrenAndFeed();
    } else {
      console.warn('No currentProfile, not loading feed');
    }
  }

  loadChildrenAndFeed() {
    if (!this.currentProfile) {
      console.warn('loadChildrenAndFeed: No currentProfile');
      return;
    }
    console.log('Calling getParentChildren with', this.currentProfile.parent_id);
    this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        console.log('getParentChildren response:', response);
        this.laravelChildren = response.children || [];
        this.loadAnnouncementsAndConsentForms();
      }
    });
  }

  loadAnnouncementsAndConsentForms() {
    if (!this.currentProfile) {
      console.warn('loadAnnouncementsAndConsentForms: No currentProfile');
      return;
    }
    console.log('Calling getParentAnnouncements with', this.currentProfile.parent_id);
    this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        console.log('getParentAnnouncements response:', response);
        this.laravelAnnouncements = response.announcements || [];
        this.tryMixFeed();
      }
    });

    // Fetch consent forms for all children
    this.consentForms = [];
    let loaded = 0;
    if (this.laravelChildren.length === 0) {
      this.tryMixFeed();
      return;
    }
    this.laravelChildren.forEach(child => {
      this.apiService.getUnsignedConsentFormsForStudent(child.student_id).subscribe(res => {
        if (res.forms) {
          this.consentForms.push(...res.forms.map((f: any) => ({ ...f, student: child })));
        }
        loaded++;
        if (loaded === this.laravelChildren.length) {
          this.tryMixFeed();
        }
      });
    });

    // Fetch events for the parent
    this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        this.laravelEvents = response.events || [];
      }
    });
  }

  tryMixFeed() {
    // Only mix when both arrays are loaded
    if (this.laravelAnnouncements && this.consentForms) {
      this.mixedFeed = [];
      const maxLen = Math.max(this.laravelAnnouncements.length, this.consentForms.length);
      let a = 0, c = 0;
      for (let i = 0; i < maxLen; i++) {
        if (a < this.laravelAnnouncements.length) {
          this.mixedFeed.push({ type: 'announcement', data: this.laravelAnnouncements[a++] });
        }
        if (c < this.consentForms.length) {
          this.mixedFeed.push({ type: 'consent', data: this.consentForms[c++] });
        }
      }
    }
  }

  async refreshData() {
    await this.loadChildrenAndFeed();
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

  openConsentForm(form: any) {
    // form.student.student_id is available because you attached student info when mixing
    this.router.navigate(['/consent-form-detail', form.form_id, form.student.student_id]);
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