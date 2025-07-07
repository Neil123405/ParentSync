import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService, User, ParentProfile } from '../services/api.service';

// Laravel API interfaces
interface LaravelStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  grade_level: number;
  section_name: string;
  grade_name: string;
}

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

interface ConsentForm {
  form_id: number;
  title: string;
  description: string;
  deadline: string;
  signed: boolean;
}

interface AttendanceRecord {
  attendance_id: number;
  date: string;
  status: string;
  teacher_first_name: string;
  teacher_last_name: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  // Auth properties
  currentUser: User | null = null;
  currentProfile: ParentProfile | null = null;

  // Laravel API properties
  laravelChildren: LaravelStudent[] = [];
  laravelAnnouncements: LaravelAnnouncement[] = [];
  laravelEvents: LaravelEvent[] = [];
  
  // Selected child data
  selectedChild: LaravelStudent | null = null;
  consentForms: ConsentForm[] = [];
  attendanceRecords: AttendanceRecord[] = [];
  attendanceSummary: any = null;
  studentEvents: LaravelEvent[] = [];
  
  // UI state
  activeSection: string = '';
  segmentValue: string = 'children'; // Changed default to children

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check authentication using ApiService
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

    // Load Laravel data
    if (this.currentProfile) {
      this.loadData();
    }
  }

  async loadData() {
    if (!this.currentProfile) return;

    const loading = await this.loadingController.create({
      message: 'Loading data...',
    });
    await loading.present();

    try {
      // Load children
      this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
        next: (response) => {
          if (response.success) {
            this.laravelChildren = response.children;
          }
        },
        error: (error) => console.error('Error loading children:', error)
      });

      // Load announcements
      this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
        next: (response) => {
          if (response.success) {
            this.laravelAnnouncements = response.announcements;
          }
        },
        error: (error) => console.error('Error loading announcements:', error)
      });

      // Load events for announcements page
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

  selectChild(child: LaravelStudent) {
    this.selectedChild = child;
    this.activeSection = ''; // Reset active section
    // Clear previous data
    this.consentForms = [];
    this.attendanceRecords = [];
    this.attendanceSummary = null;
    this.studentEvents = [];
  }

  async showSection(section: string) {
    this.activeSection = section;
    
    if (!this.selectedChild) return;

    const loading = await this.loadingController.create({
      message: 'Loading data...',
    });
    await loading.present();

    try {
      switch (section) {
        case 'consent':
          await this.loadConsentForms();
          break;
        case 'attendance':
          await this.loadAttendance();
          break;
        case 'events':
          await this.loadStudentEvents();
          break;
      }
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      console.error('Error loading section data:', error);
    }
  }

  async loadConsentForms() {
    // Mock data for now - you can replace with actual API call
    this.consentForms = [
      {
        form_id: 1,
        title: 'Field Trip Permission',
        description: 'Permission for upcoming science museum trip',
        deadline: '2024-12-25',
        signed: true
      },
      {
        form_id: 2,
        title: 'Sports Activity Consent',
        description: 'Consent for participation in school sports activities',
        deadline: '2024-12-30',
        signed: false
      }
    ];
  }

  async loadAttendance() {
    if (!this.selectedChild) return;

    // Load attendance records
    this.apiService.getStudentAttendance(this.selectedChild.student_id).subscribe({
      next: (response) => {
        if (response.success) {
          this.attendanceRecords = response.attendance;
        }
      },
      error: (error) => console.error('Error loading attendance:', error)
    });

    // Load attendance summary
    this.apiService.getAttendanceSummary(this.selectedChild.student_id).subscribe({
      next: (response) => {
        if (response.success) {
          // Convert array to object for easier access
          const summary: any = {};
          response.summary.forEach((item: any) => {
            summary[item.status.toLowerCase()] = item.count;
          });
          this.attendanceSummary = summary;
        }
      },
      error: (error) => console.error('Error loading attendance summary:', error)
    });
  }

  async loadStudentEvents() {
    if (!this.selectedChild) return;

    this.apiService.getStudentEvents(this.selectedChild.student_id).subscribe({
      next: (response) => {
        if (response.success) {
          this.studentEvents = response.events;
        }
      },
      error: (error) => console.error('Error loading student events:', error)
    });
  }

  getAttendanceColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'present':
        return 'success';
      case 'absent':
        return 'danger';
      case 'late':
        return 'warning';
      default:
        return 'medium';
    }
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

  switchTab(tab: string) {
    this.segmentValue = tab;
  }
}