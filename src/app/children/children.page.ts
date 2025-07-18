import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, ModalController, ActionSheetController } from '@ionic/angular';
import { ApiService, User, ParentProfile } from '../services/api.service';
import { AddStudentModalComponent } from '../components/add-student-modal/add-student-modal.component';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ChildOptionsModalComponent } from '../components/child-options-modal/child-options-modal.component';

interface LaravelStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  grade_level: number;
  section_name: string;
  grade_name: string;
  photo_url?: string; // <-- Add this line
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

  // Timeline and consent form states
  showTimeline: { [studentId: number]: boolean } = {};
  signedConsentForms: { [studentId: number]: any[] } = {};

  consentFormCounts: { [studentId: number]: number } = {};
  schoolEventCounts: { [studentId: number]: number } = {};

  showTasks = false;
  showSchoolEvents = false;

  pendingStudents: LaravelStudent[] = [];

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private apiService: ApiService,
    private toastController: ToastController,
    private modalController: ModalController,
    private actionSheetController: ActionSheetController
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

    // Listen for signed consent forms
    this.apiService.consentFormSigned$.subscribe(({ formId, studentId }) => {
      // Only update if the selected child matches
      if (this.selectedChild && this.selectedChild.student_id === studentId) {
        this.consentForms = this.consentForms.filter(f => f.form_id !== formId);
      }
      // Optionally, update the badge/counts as well
      if (this.consentFormCounts[studentId] !== undefined) {
        this.consentFormCounts[studentId] = Math.max(0, this.consentFormCounts[studentId] - 1);
      }
    });
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

            // Fetch counts for each child
            this.laravelChildren.forEach(child => {
              this.apiService.getUnsignedConsentFormsForStudent(child.student_id).subscribe(res => {
                this.consentFormCounts[child.student_id] = (res.forms || []).length;
              });
              this.apiService.getStudentEvents(child.student_id).subscribe(res => {
                this.schoolEventCounts[child.student_id] = (res.events || []).length;
              });
            });
          } else {
            console.warn('API response did not have success=true:', response);
          }
        },
        error: (error) => {
          console.error('Error loading children:', error);
        }
      });

      // Load pending students
      this.apiService.getPendingChildren(this.currentProfile.parent_id).subscribe({
        next: (res) => {
          this.pendingStudents = res.pending || [];
        },
        error: () => {
          this.pendingStudents = [];
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
    this.showTasks = false;
    // Optionally reset timeline dropdown
    Object.keys(this.showTimeline).forEach(key => this.showTimeline[+key] = false);
    // Clear previous data
    this.consentForms = [];
    this.attendanceRecords = [];
    this.attendanceSummary = null;
    this.studentEvents = [];
  }

  showSection(section: string) {
    this.activeSection = section;
    if (!this.selectedChild) return;

    if (section === 'tasks') {
      this.loadConsentForms();      // <-- Load consent forms
      this.loadStudentEvents();     // <-- Load events
    } else if (section === 'timeline') {
      this.toggleTimeline(this.selectedChild);
    }
  }

  async loadConsentForms() {
    if (!this.selectedChild) return;
    this.apiService.getUnsignedConsentFormsForStudent(this.selectedChild.student_id).subscribe({
      next: (response) => {
        this.consentForms = response.forms || [];
      },
      error: (err) => {
        this.consentForms = [];
      }
    });
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

  toggleSchoolEvents() {
    this.activeSection = 'tasks'; // Ensure the right section is active
    this.showSchoolEvents = !this.showSchoolEvents;
    if (this.showSchoolEvents && this.selectedChild) {
      this.loadStudentEvents();
    }
  }

  async loadStudentEvents() {
    if (!this.selectedChild) return;
    this.apiService.getStudentEvents(this.selectedChild.student_id).subscribe({
      next: (response) => {
        if (response.success) {
          // Attach student_id to each event
          this.studentEvents = (response.events || []).map((e: any) => ({
            ...e,
            student_id: this.selectedChild ? this.selectedChild.student_id : null
          }));
        } else {
          this.studentEvents = [];
        }
      },
      error: () => {
        this.studentEvents = [];
      }
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

  goToSchoolEvents(child: LaravelStudent) {
    this.router.navigate(['/school-events', child.student_id]);
  }

  toggleTimeline(child: LaravelStudent) {
    const studentId = child.student_id;
    // Toggle only for selected child
    this.showTimeline[studentId] = !this.showTimeline[studentId];

    if (this.showTimeline[studentId] && !this.signedConsentForms[studentId]) {
      this.apiService.getSignedConsentForms(studentId).subscribe({
        next: (response) => {
          this.signedConsentForms[studentId] = response.forms || [];
        },
        error: (err) => {
          this.signedConsentForms[studentId] = [];
        }
      });
    }
  }

  // Modal logic
  async openAddStudentModal() {
    const modal = await this.modalController.create({
      component: AddStudentModalComponent // You need to create this component below
    });
    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.studentId) {
        this.addStudentById(result.data.studentId);
      }
    });
    await modal.present();
  }

  addStudentById(studentId: number) {
    if (!studentId || !this.currentProfile) {
      this.showToast('Please enter a valid Student ID.');
      return;
    }
    this.apiService.linkStudentToParent(this.currentProfile.parent_id, studentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.showToast('Student linked successfully!');
        } else {
          this.showToast(response.message || 'Failed to link student.');
        }
      },
      error: () => this.showToast('Failed to link student.')
    });
  }

  async changeStudentPhoto(student: any) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Change Photo',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => this.getPhoto(student, CameraSource.Camera)
        },
        {
          text: 'Upload from Device',
          icon: 'image',
          handler: () => this.getPhoto(student, CameraSource.Photos)
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async getPhoto(student: any, source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source
      });
      if (image && image.base64String) {
        this.apiService.uploadStudentPhoto(student.student_id, image.base64String).subscribe({
          next: (res) => {
            student.photo_url = res.photo_url;
          },
          error: (err) => {
            console.error('Upload error:', err);
          }
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }

  async openChildOptions(ev: Event, child: LaravelStudent) {
    ev.stopPropagation(); // Prevents card click event
    const modal = await this.modalController.create({
      component: ChildOptionsModalComponent,
      componentProps: { child }
    });
    await modal.present();
  }

  openEventDetail(event: any) {
    // Pass both event_id and student_id to match your routing
    this.router.navigate(['/school-event-detail', event.event_id, event.student_id]);
  }
}
