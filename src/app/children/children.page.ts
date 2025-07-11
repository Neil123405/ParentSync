import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { ApiService, User, ParentProfile } from '../services/api.service';

interface LaravelStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  grade_level: number;
  section_name: string;
  grade_name: string;
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
  selector: 'app-children',
  templateUrl: './children.page.html',
  styleUrls: ['./children.page.scss'],
  standalone: false,
})
export class ChildrenPage implements OnInit {
  currentUser: User | null = null;
  currentProfile: ParentProfile | null = null;
  
  laravelChildren: LaravelStudent[] = [];
  selectedChild: LaravelStudent | null = null;
  
  // Child-specific data
  consentForms: ConsentForm[] = [];
  attendanceRecords: AttendanceRecord[] = [];
  attendanceSummary: any = null;
  studentEvents: LaravelEvent[] = [];
  
  activeSection: string = '';

  newStudentId: number | null = null;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private apiService: ApiService,
    private toastController: ToastController
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
    console.log('loadData called');
    if (!this.currentProfile) {
    console.log('No currentProfile, returning');
    return;
  }

    const loading = await this.loadingController.create({
      message: 'Loading children...',
    });
    await loading.present();

    try {
      // Load children
      console.log('About to call getParentChildren with:', this.currentProfile.parent_id);
      this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
        next: (response) => {
          console.log('API response for children:', response);
          if (response.success) {
            this.laravelChildren = response.children;
            console.log('laravelChildren set to:', this.laravelChildren);
          } else {
            console.warn('API response did not have success=true:', response);
          }
        },
        error: (error) => {
          console.error('Error loading children:', error);
        }
      });

      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      console.error('Error loading data:', error);
    }
  }

  selectChild(child: LaravelStudent) {
    this.selectedChild = child;
    this.activeSection = '';
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
    // Mock data for now
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

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  async refreshData() {
    await this.loadData();
  }

  async addStudent() {
    if (!this.newStudentId || !this.currentProfile) {
      this.showToast('Please enter a valid Student ID.');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Linking student...',
    });
    await loading.present();

    this.apiService.linkStudentToParent(this.currentProfile.parent_id, this.newStudentId).subscribe({
      next: async (response) => {
        await loading.dismiss();
        if (response.success) {
          this.showToast('Student linked successfully!');
          this.newStudentId = null;
          this.loadData(); // Refresh children list
        } else {
          this.showToast(response.message || 'Failed to link student.');
        }
      },
      error: async (error) => {
        await loading.dismiss();
        let errorMessage = error.error?.message || 'Failed to link student.';
        if (error.error?.errors) {
          const details = Object.entries(error.error.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('\n');
          errorMessage += '\n' + details;
        }
        this.showToast(errorMessage);
      }
    });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'primary'
    });
    toast.present();
  }

  goToConsentForms(child: LaravelStudent) {
    this.router.navigate(['/consent-forms', child.student_id]);
  }
}
