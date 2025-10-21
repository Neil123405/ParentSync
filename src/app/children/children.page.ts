import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { AlertController } from '@ionic/angular';

import { LoadingController, ToastController, ModalController } from '@ionic/angular';

// import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { ApiService, User, ParentProfile } from '../services/api.service';
import { AddStudentModalComponent } from '../components/add-student-modal/add-student-modal.component';
import { ChildOptionsModalComponent } from '../components/child-options-modal/child-options-modal.component';
import { Storage } from '@ionic/storage-angular';

interface LaravelStudent {
  student_id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  grade_level: number;
  section_name: string;
  grade_name: string;
  photo_url?: string;
}

interface ConsentForm {
  form_id: number;
  title: string;
  description: string;
  deadline: string;
  signed: boolean;
}

// interface AttendanceRecord {
//   attendance_id: number;
//   date: string;
//   status: string;
//   teacher_first_name: string;
//   teacher_last_name: string;
// }

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

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
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
  // consentForms: ConsentForm[] = [];
  // studentEvents: LaravelEvent[] = [];

  activeSection: string = '';

  newStudentId: number | null = null;

  // Timeline and consent form states
  showTimeline: { [studentId: number]: boolean } = {};
  signedConsentForms: { [studentId: number]: any[] } = {};

  consentFormCountsTwo: { [studentId: number]: any } = {};
  consentFormCounts: { [studentId: number]: any } = {};
  schoolEventCounts: { [studentId: number]: any } = {};
  announcementCounts: { [studentId: number]: any } = {};
  schoolEventCountsTwo: { [studentId: number]: any } = {};
  announcementCountsTwo: { [studentId: number]: any } = {};


  showTasks = false;
  showSchoolEvents = false;

  pendingStudents: LaravelStudent[] = [];

  pressTimer: any = null;


  centerCardIndex: number = 0;
  isPanning: boolean = false;
  panStartX: number = 0;
  currentPanX: number = 0;
  // studentAnnouncements: Announcement[] = [];
  isLoading: boolean = true; // Add loading state
  private _storage: Storage | null = null;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private apiService: ApiService,
    private toastController: ToastController,
    private modalController: ModalController,
    private storage: Storage,
    // private actionSheetController: ActionSheetController

  ) { }

  // router.navigate(['])

  async ngOnInit() {
    // Check authentication
    this._storage = await this.storage.create();
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


    // Load data including this.consentFormCounts
    if (this.currentProfile) {
      await this.loadData();

      // Automatically select the first child if available
      const lastSelectedChild = await this.storage.get('lastSelectedChild');
      console.log('Last selected child from storage:', lastSelectedChild);
      if (lastSelectedChild) {
        const index = this.laravelChildren.findIndex(child => child.student_id === lastSelectedChild.student_id);
        if (index !== -1) {
          this.selectChildAndCenter(this.laravelChildren[index], index);
        }
      }
      // else if (this.laravelChildren.length > 0) {
      //   this.selectChildAndCenter(this.laravelChildren[0], 0);
      // }
    }

    setTimeout(() => {
      if (this.laravelChildren.length > 0) {
        this.centerCard(0);
      }
    }, 100);

    // Listen for signed consent forms signed
    //* already read!
    // this.apiService.consentFormSigned$.subscribe(({ formId, studentId }) => {
    //   // Only update if the selected child matches
    //   if (this.selectedChild && this.selectedChild.student_id === studentId) {
    //     this.consentForms = this.consentForms.filter(f => f.form_id !== formId);
    //   }
    //   // // Optionally, update the badge/counts as well
    //   // if (this.consentFormCounts[studentId] !== undefined) {
    //   //   this.consentFormCounts[studentId] = Math.max(0, this.consentFormCounts[studentId] - 1);
    //   // }
    // });
  }

  ionViewWillEnter() {
    if (this.currentProfile) {
      this.loadData().then(async () => {
        // Check if selectedChild is already set
        if (!this.selectedChild && this.laravelChildren.length > 0) {
          // Try to restore the last selected child from storage
          const lastSelectedChild = await this.storage.get('lastSelectedChild');
          console.log('Last selected child in ionViewWillEnter:', lastSelectedChild);

          if (lastSelectedChild) {
            const index = this.laravelChildren.findIndex(child => child.student_id === lastSelectedChild.student_id);
            if (index !== -1) {
              this.selectChildAndCenter(this.laravelChildren[index], index);
              return; // Exit the method after restoring the last selected child
            }
          }

          // If no last selected child is found, select the first child
          this.selectChildAndCenter(this.laravelChildren[0], 0);
        }
      });
    }
  }

  // * loadingController.create({}), .present()
  // * .forEach((e: any) => {});


  upcomingConsentForms: any[] = [];
  upcomingEvents: any[] = [];
  recentAnnouncements: any[] = [];

  updateSelectedChildData() {
    console.log('Selected Child:', this.selectedChild);

    if (this.selectedChild && this.selectedChild.student_id) {
      this.upcomingConsentForms = this.consentFormCountsTwo[this.selectedChild.student_id] || [];
      this.upcomingEvents = this.schoolEventCountsTwo[this.selectedChild.student_id] || [];
      this.recentAnnouncements = this.announcementCountsTwo[this.selectedChild.student_id] || [];
    } else {
      console.warn('Selected child or student_id is invalid');
      this.upcomingConsentForms = [];
      this.upcomingEvents = [];
      this.recentAnnouncements = [];
    }
  }

  processData<T extends { deadline: string; student_id: number; date: string; created_at: string }>(
    items: T[],
    filterCondition: (item: T) => boolean,
    groupByKey: (item: T) => string | number
  ): { grouped: { [key: string]: T[] }, counts: { [key: string]: number } } {
    const grouped: { [key: string]: T[] } = {};
    const counts: { [key: string]: number } = {};

    items.forEach(item => {
      const key = groupByKey(item);
      if (filterCondition(item)) {
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      }
      counts[key] = (counts[key] || 0) + 1;
    });

    return { grouped, counts };
  }

  async clearCache() {
    await this._storage?.remove('laravelChildren');
  }

  async loadData() {
    // console.log('loadData called');
    if (!this.currentProfile) {
      // console.log('No currentProfile, returning');
      return;
    }
    console.log('loadData started, isLoading:', this.isLoading); // Should log true initially

    this.isLoading = true; // Set loading state to true
    // const loading = await this.loadingController.create({
    //   message: 'Loading children...',
    // });
    // await loading.present();

    try {
      // Load children
      const parentId = this.currentProfile.parent_id;
      // console.log('About to call getParentChildren with:', this.currentProfile.parent_id);

      const cachedChildren = await this._storage?.get('laravelChildren');
      const cachedConsentCounts = await this._storage?.get('consentFormCounts');
      const cachedConsentCountsTwo = await this._storage?.get('consentFormCountsTwo');
      const cachedEventCounts = await this._storage?.get('schoolEventCounts');
      const cachedAnnouncementCounts = await this._storage?.get('announcementCounts');
      const cachedEventCountsTwo = await this._storage?.get('schoolEventCountsTwo');
      const cachedAnnouncementCountsTwo = await this._storage?.get('announcementCountsTwo');
      // if (cachedData) {
      //   console.log('Using cached data');
      //   this.laravelChildren = cachedData;
      //   // this.isLoading = false;
      //   // return;
      // } else {
      //   const childrenRes = await this.apiService.getParentChildren(parentId).toPromise();
      //   if (childrenRes.success) {
      //     this.laravelChildren = childrenRes.children || [];
      //     // Cache the data
      //     await this._storage?.set('laravelChildren', this.laravelChildren);
      //   }
      // }

      // Use cached data if available
      if (cachedChildren) {
        console.log('Using cached children data');
        this.laravelChildren = cachedChildren;
      }
      if (cachedConsentCounts) {
        console.log('Using cached consent form counts');
        this.consentFormCounts = cachedConsentCounts;
        this.consentFormCountsTwo = cachedConsentCountsTwo;
      }
      if (cachedEventCounts) {
        console.log('Using cached school event counts');
        this.schoolEventCounts = cachedEventCounts;
        this.schoolEventCountsTwo = cachedEventCountsTwo;
      }
      if (cachedAnnouncementCounts) {
        console.log('Using cached announcement counts');
        this.announcementCounts = cachedAnnouncementCounts;
        this.announcementCountsTwo = cachedAnnouncementCountsTwo;
      }
      if (!cachedChildren || !cachedConsentCounts || !cachedEventCounts || !cachedAnnouncementCounts) {
        const [childrenRes, eventsRes, announcementsRes, consentFormsRes, pendingStudentsRes] = await Promise.all([
          this.apiService.getParentChildren(parentId).toPromise(),
          this.apiService.getParentEvents(parentId).toPromise(),
          this.apiService.getParentAnnouncements(parentId).toPromise(),
          this.apiService.getAllUnsignedConsentFormsForParent(parentId).toPromise(),
          this.apiService.getPendingChildren(parentId).toPromise(),
        ]);


        if (childrenRes.success) {
          this.laravelChildren = childrenRes.children || [];
          await this._storage?.set('laravelChildren', this.laravelChildren);
        }
        // if (this.currentProfile?.parent_id) {
        //   this.apiService.getAllUnsignedConsentFormsForParent(this.currentProfile.parent_id).subscribe(res => {
        //     const forms = res.forms || [];
        const today = new Date();
        // Reset counts
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());  // Date only, no time
        const { grouped: consentFormGrouped, counts: consentFormCounts } = this.processData(
          consentFormsRes.forms,
          form => {
            const deadlineDate = new Date(new Date(form.deadline).toDateString());
            const diffDays = (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 3600 * 24);
            return diffDays >= 0 && diffDays <= 5;
          },
          form => form.student_id
        );
        this.consentFormCounts = consentFormCounts;
        await this._storage?.set('consentFormCounts', this.consentFormCounts);
        this.consentFormCountsTwo = consentFormGrouped;
        await this._storage?.set('consentFormCountsTwo', this.consentFormCountsTwo);
        // consentFormsRes.forms.forEach((form: any) => {
        //   const deadline = new Date(form.deadline);
        //   const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());  // Date only, no time
        //   const diffDays = (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 3600 * 24);
        //   if (diffDays >= 0 && diffDays <= 5) {
        //     const sidTwo = form.student_id;
        //     if (!this.consentFormCountsTwo[sidTwo]) this.consentFormCountsTwo[sidTwo] = [];
        //     this.consentFormCountsTwo[sidTwo].push(form);
        //   }
        //   const sid = form.student_id;

        //   this.consentFormCounts[sid] = (this.consentFormCounts[sid] || 0) + 1;
        // });
        // if (this.selectedChild) this.updateSelectedChildData();
        // });
        // this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe(res => {
        // const events = res.events || [];
        // const today = new Date();
        const { grouped: eventGrouped, counts: eventCounts } = this.processData(
          eventsRes.events,
          event => {
            const eventDate = new Date(event.date);
            const diffDays = (eventDate.getTime() - todayDate.getTime()) / (1000 * 3600 * 24);
            return diffDays >= 0 && diffDays <= 10;
          },
          event => event.student_id
        );
        this.schoolEventCountsTwo = eventGrouped;
        this.schoolEventCounts = eventCounts;
        await this._storage?.set('schoolEventCounts', this.schoolEventCounts);
        await this._storage?.set('schoolEventCountsTwo', this.schoolEventCountsTwo);
        // eventsRes.events.forEach((event: any) => {
        //   const eventDate = new Date(event.date);
        //   const diffDays = (eventDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
        //   if (diffDays >= 0 && diffDays <= 10) {
        //     const sidTwo = event.student_id;
        //     if (!this.schoolEventCountsTwo[sidTwo]) this.schoolEventCountsTwo[sidTwo] = [];
        //     this.schoolEventCountsTwo[sidTwo].push(event);
        //   }
        //   const sid = event.student_id;
        //   this.schoolEventCounts[sid] = (this.schoolEventCounts[sid] || 0) + 1;
        // });
        // if (this.selectedChild) this.updateSelectedChildData();
        // });
        // this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe(res => {
        // const announcements = res.announcements || [];
        // const today = new Date();
        // const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());  // Date only, no time
        const { grouped: announcementGrouped, counts: announcementCounts } = this.processData(
          announcementsRes.announcements,
          announcement => {
            const announcementDate = new Date(new Date(announcement.created_at).toDateString());
            return announcementDate.getTime() === todayDate.getTime();
          },
          announcement => announcement.student_id
        );
        this.announcementCountsTwo = announcementGrouped;
        this.announcementCounts = announcementCounts;
        await this._storage?.set('announcementCounts', this.announcementCounts);
        await this._storage?.set('announcementCountsTwo', this.announcementCountsTwo);
        // announcementsRes.announcements.forEach((announcement: any) => {
        //   const date = new Date(announcement.created_at);
        //   const announcementDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());  // Date only, no time
        //   if (announcementDate.getTime() === todayDate.getTime()) {  // Only today's announcements
        //     const sidTwo = announcement.student_id;
        //     if (!this.announcementCountsTwo[sidTwo]) this.announcementCountsTwo[sidTwo] = [];
        //     this.announcementCountsTwo[sidTwo].push(announcement);
        //   }
        //   const sid = announcement.student_id;
        //   this.announcementCounts[sid] = (this.announcementCounts[sid] || 0) + 1;
        // });
        // if (this.selectedChild) this.updateSelectedChildData();
        // });
        // }
        // this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
        //   next: (response) => {
        //     // console.log('API response for children:', response);

        //     if (response.success) {
        //       this.laravelChildren = response.children;
        //       // console.log('laravelChildren set to:', this.laravelChildren);
        //       // Fetch counts for each child
        //       // this.laravelChildren.forEach(child => {
        //       //   // this.apiService.getUnsignedConsentFormsForStudent(child.student_id).subscribe(res => {
        //       //   //   this.consentFormCounts[child.student_id] = (res.forms || []).length;

        //       //   //   // this.consentForms = res.forms || [];
        //       //   // });
        //       //   // this.apiService.getStudentEvents(child.student_id).subscribe(res => {
        //       //   //   this.schoolEventCounts[child.student_id] = (res.events || []).length;
        //       //   // });
        //       //   // Fetch announcements count
        //       //   // this.apiService.getStudentAnnouncements(child.student_id).subscribe(res => {
        //       //   //   this.announcementCounts[child.student_id] = (res.announcements || []).length;
        //       //   // });
        //       //   // this.apiService.getStudentProfile(child.student_id).subscribe(profile => {
        //       //   //   child.photo_url = profile.photo_url;
        //       //   //   // ...update other fields if needed
        //       //   // });
        //       // });
        //     }
        //     // else {
        //     //   // console.warn('API response did not have success=true:', response);
        //     // }
        //   },
        //   error: (error) => {
        //     // console.error('Error loading children:', error);
        //   }
        // });

        // Load pending students
        // this.apiService.getPendingChildren(this.currentProfile.parent_id).subscribe({
        //   next: (res) => {
        //     this.pendingStudents = res.pending || [];
        //   },
        //   error: () => {
        //     this.pendingStudents = [];
        //   }
        // });

        // Process pending students data
        this.pendingStudents = pendingStudentsRes.pending || [];
      }
      // Update selected child data
      if (this.selectedChild) this.updateSelectedChildData();
      this.isLoading = false; // Set loading state to true
      // await loading.dismiss();
    } catch (error) {
      this.isLoading = false; // Set loading state to true
      // await loading.dismiss();
      // console.error('Error loading data:', error);
    }
  }

  async clearAllCache() {
    await this._storage?.clear();
    console.log('All cache cleared');
  }


  selectChild(child: LaravelStudent) {
    this.selectedChild = child;
    this.activeSection = '';
    this.showTasks = false;
    // Optionally reset timeline dropdown of all children when you click a child, think of it as closing all timelines for all children
    // so that only the selected child's timeline is open
    // +key converts string keys to numbers
    // Object.keys(this.showTimeline).forEach(key => this.showTimeline[+key] = false);
    // Clear previous data
    // this.consentForms = [];
    // this.attendanceRecords = [];
    // this.attendanceSummary = null;
    // this.studentEvents = [];
    // this.studentAnnouncements = [];
    this.apiService.getUnsignedConsentFormsForStudent(child.student_id).subscribe(res => {
      this.upcomingConsentForms = res.forms || [];
    });

    this.apiService.getStudentEvents(child.student_id).subscribe(res => {
      this.upcomingEvents = res.events || [];
    });

    this.apiService.getStudentAnnouncements(child.student_id).subscribe(res => {
      this.recentAnnouncements = res.announcements || [];
    });
    console.log('Upcoming Consent Forms:', this.upcomingConsentForms);
  }

  showSection(section: string) {
    this.activeSection = section;
    if (!this.selectedChild) return;

    // if (section === 'tasks') {
    //   // this.loadConsentForms();      // <-- Load consent forms
    //   // this.loadStudentEvents();
    //   // this.loadStudentAnnouncements();   // <-- Load events
    // }
    if (section === 'timeline') {
      this.toggleTimeline(this.selectedChild);
    }
  }

  // loadConsentForms() {
  //   if (!this.selectedChild) return;
  //   this.apiService.getUnsignedConsentFormsForStudent(this.selectedChild.student_id).subscribe({
  //     next: (response) => {
  //       this.consentForms = response.forms || [];
  //     },
  //     error: (err) => {
  //       this.consentForms = [];
  //     }
  //   });
  // }

  // async loadAttendance() {
  //   if (!this.selectedChild) return;

  //   // Load attendance records
  //   this.apiService.getStudentAttendance(this.selectedChild.student_id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.attendanceRecords = response.attendance;
  //       }
  //     },
  //     error: (error) => console.error('Error loading attendance:', error)
  //   });

  //   // Load attendance summary
  //   this.apiService.getAttendanceSummary(this.selectedChild.student_id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         const summary: any = {};
  //         response.summary.forEach((item: any) => {
  //           summary[item.status.toLowerCase()] = item.count;
  //         });
  //         this.attendanceSummary = summary;
  //       }
  //     },
  //     error: (error) => console.error('Error loading attendance summary:', error)
  //   });
  // }

  toggleSchoolEvents() {
    this.activeSection = 'tasks'; // Ensure the right section is active
    this.showSchoolEvents = !this.showSchoolEvents;
    // if (this.showSchoolEvents && this.selectedChild) {
    //   this.loadStudentEvents();
    // }
  }

  // async loadStudentEvents() {
  //   if (!this.selectedChild) return;
  //   this.apiService.getStudentEvents(this.selectedChild.student_id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         // Attach student_id to each event
  //         this.studentEvents = (response.events || []).map((e: any) => ({
  //           ...e,
  //           student_id: this.selectedChild ? this.selectedChild.student_id : null
  //         }));
  //       } else {
  //         this.studentEvents = [];
  //       }
  //     },
  //     error: () => {
  //       this.studentEvents = [];
  //     }
  //   });
  // }

  // getAttendanceColor(status: string): string {
  //   switch (status.toLowerCase()) {
  //     case 'present':
  //       return 'success';
  //     case 'absent':
  //       return 'danger';
  //     case 'late':
  //       return 'warning';
  //     default:
  //       return 'medium';
  //   }
  // }

  // async logout() {
  //   const alert = await this.alertController.create({
  //     header: 'Logout',
  //     message: 'Are you sure you want to logout?',
  //     buttons: [
  //       {
  //         text: 'Cancel',
  //         role: 'cancel'
  //       },
  //       {
  //         text: 'Logout',
  //         handler: () => {
  //           this.apiService.logout();
  //           this.router.navigate(['/login']);
  //         }
  //       }
  //     ]
  //   });
  //   await alert.present();
  // }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  async refreshData(event?: any) {
    await this.clearCache();
    await this.loadData();
    if (event) {
      event.target.complete();
    }
  }

  // async addStudent() {
  //   if (!this.newStudentId || !this.currentProfile) {
  //     this.showToast('Please enter a valid Student ID.');
  //     return;
  //   }

  //   const loading = await this.loadingController.create({
  //     message: 'Linking student...',
  //   });
  //   await loading.present();
  //   //* already read!
  //   this.apiService.linkStudentToParent(this.currentProfile.parent_id, this.newStudentId).subscribe({
  //     next: async (response) => {
  //       await loading.dismiss();
  //       if (response.success) {
  //         this.showToast('Student linked successfully!');
  //         this.newStudentId = null;
  //         this.loadData(); // Refresh children list
  //       } else {
  //         this.showToast(response.message || 'Failed to link student.');
  //       }
  //     },
  //     error: async (error) => {
  //       await loading.dismiss();
  //       let errorMessage = error.error?.message || 'Failed to link student.';
  //       if (error.error?.errors) {
  //         const details = Object.entries(error.error.errors)
  //           .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
  //           .join('\n');
  //         errorMessage += '\n' + details;
  //       }
  //       this.showToast(errorMessage);
  //     }
  //   });
  // }

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

  goToStudentAnnouncements(child: LaravelStudent) {
    this.router.navigate(['/student-announcements', child.student_id]);
  }

  toggleTimeline(child: LaravelStudent) {
    const studentId = child.student_id;
    // Toggle only for selected child
    // ! means the opposite of the current value, so if it's true, it becomes false and vice versa
    this.showTimeline[studentId] = !this.showTimeline[studentId];

    if (this.showTimeline[studentId]) {
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
      component: AddStudentModalComponent
    });
    modal.onDidDismiss().then((result) => {
      if (result.data && result.data.student_id) {
        this.addStudentById(
          result.data.student_id,
          result.data.first_name,
          result.data.last_name,
          result.data.birthdate
        );
      }
    });
    await modal.present();
  }

  async addStudentById(studentId: number, firstName: string, lastName: string, birthdate: string) {
    if (!studentId || !this.currentProfile) {
      this.showToast('Please enter a valid Student ID, First Name, and Last Name.');
      return;
    }
    this.apiService.getStudentProfile(studentId).subscribe({
      next: async (profile) => {
        const alert = await this.alertController.create({
          header: 'Confirm Link',
          message: `Are you sure you want to link this student to your account? (ID: ${profile.student_id})`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Yes',
              handler: () => {
                if (this.currentProfile && this.currentProfile.parent_id !== undefined) {
                  this.apiService.linkStudentToParent(this.currentProfile.parent_id, studentId, firstName,
                    lastName,
                    birthdate).subscribe({
                      next: async (response) => {
                        if (response.success) {
                          this.showToast('Student linked successfully!');
                          await this.clearCache();
                          this.loadData();
                        } else {
                          this.showToast(response.message);
                        }
                      },
                      error: () => this.showToast('Failed to link student.')
                    });
                } else {
                  this.showToast('Parent ID is missing.');
                }
              }
            }
          ]
        });

        await alert.present();
      },
      error: () => {
        this.showToast('Student not found.');
      }
    });
  }



  // async changeStudentPhoto(student: any) {
  //   const actionSheet = await this.actionSheetController.create({
  //     header: 'Change Photo',
  //     buttons: [
  //       {
  //         text: 'Take Photo',
  //         icon: 'camera',
  //         handler: () => this.getPhoto(student, CameraSource.Camera)
  //       },
  //       {
  //         text: 'Upload from Device',
  //         icon: 'image',
  //         handler: () => this.getPhoto(student, CameraSource.Photos)
  //       },
  //       {
  //         text: 'Cancel',
  //         icon: 'close',
  //         role: 'cancel'
  //       }
  //     ]
  //   });
  //   await actionSheet.present();
  // }

  // async getPhoto(student: any, source: CameraSource) {
  //   try {
  //     const image = await Camera.getPhoto({
  //       quality: 80,
  //       allowEditing: true,
  //       resultType: CameraResultType.Base64,
  //       source
  //     });
  //     if (image && image.base64String) {
  //       this.apiService.uploadStudentPhoto(student.student_id, image.base64String).subscribe({
  //         next: (res) => {
  //           student.photo_url = res.photo_url;
  //         },
  //         error: (err) => {
  //           // console.error('Upload error:', err);
  //         }
  //       });
  //     }
  //   } catch (err) {
  //     // console.error('Camera error:', err);
  //   }
  // }

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
    this.router.navigate(['/event-detail', event.event_id, event.student_id]);
  }

  longPressedId: number | null = null;
  animationTimer: any = null;

  startPress(event: Event, child: any) {
    // Only prevent default for mouse events, not touch events
    // event.preventDefault(); prevents default for browser's default behavior like text selection
    if (event instanceof MouseEvent) {
      event.preventDefault();
    }

    this.animationTimer = setTimeout(() => {
      this.longPressedId = child.student_id;
    }, 100);

    this.pressTimer = setTimeout(() => {
      // this.longPressedId = child.student_id; // Set the pressed student
      this.openChildOptions(event, child);
      // Optionally, reset after a short delay if you want the animation to disappear
      setTimeout(() => this.longPressedId = null, 800);
    }, 600); // 600ms for long press
  }

  endPress() {
    clearTimeout(this.pressTimer);
    clearTimeout(this.animationTimer);
    this.longPressedId = null; // Remove animation if press is released early
  }

  openConsentFormDetail(form: any) {
    const formId = form.form_id;
    const studentId = form.student_id || (this.selectedChild && this.selectedChild.student_id);
    if (formId && studentId) {
      this.router.navigate(['/consent-form-detail', formId, studentId]);
    }
  }

  // loadStudentAnnouncements() {
  //   if (!this.selectedChild) return;
  //   this.apiService.getStudentAnnouncements(this.selectedChild.student_id).subscribe({
  //     next: (response) => {
  //       if (response.success) {
  //         this.studentAnnouncements = response.announcements || [];
  //       } else {
  //         this.studentAnnouncements = [];
  //       }
  //     },
  //     error: () => {
  //       this.studentAnnouncements = [];
  //     }
  //   });
  // }


  selectChildAndCenter(child: any, index: number) {
    // this.selectChild(child);
    // this.centerCard(index);
    this.selectedChild = child;
    this.centerCardIndex = index;
    // Ensure selectedChild is valid before updating data
    if (this.selectedChild) {
      this.storage.set('lastSelectedChild', this.selectedChild);
      this.updateSelectedChildData();
    } else {
      console.error('Selected child is null or invalid');
    }
  }

  centerCard(index: number) {
    if (index >= 0 && index < this.laravelChildren.length) {
      this.centerCardIndex = index;

      // Auto-select the centered child
      if (this.laravelChildren[index]) {
        this.selectedChild = this.laravelChildren[index];
        this.activeSection = ''; // Reset active section when changing cards
      }
    }
  }

  goToCard(index: number) {
    if (this.laravelChildren[index]) {
      const child = this.laravelChildren[index];
      this.selectChildAndCenter(child, index);
    }
  }

  goToNextCard() {
    const nextIndex = this.centerCardIndex + 1;
    if (nextIndex < this.laravelChildren.length) {
      const nextChild = this.laravelChildren[nextIndex];
      this.selectChildAndCenter(nextChild, nextIndex);
    }
  }

  goToPrevCard() {
    const prevIndex = this.centerCardIndex - 1;
    if (prevIndex >= 0) {
      const prevChild = this.laravelChildren[prevIndex];
      this.selectChildAndCenter(prevChild, prevIndex);
    }
  }

  getCardTransform(index: number): string {
    const diff = index - this.centerCardIndex;

    if (diff === 0) {
      // Center card
      return 'translate(-50%, -50%) scale(1) rotateY(0deg)';
    } else if (diff < 0) {
      // Left cards
      const distance = Math.abs(diff);
      const translateX = -50 - (distance * 120);
      const scale = Math.max(0.6, 1 - (distance * 0.2));
      const rotateY = Math.min(75, 45 + (distance * 15));
      const opacity = Math.max(0.1, 1 - (distance * 0.4));

      return `translate(${translateX}%, -50%) scale(${scale}) rotateY(${rotateY}deg)`;
    } else {
      // Right cards
      const distance = diff;
      const translateX = -50 + (distance * 120);
      const scale = Math.max(0.6, 1 - (distance * 0.2));
      const rotateY = Math.max(-75, -45 - (distance * 15));
      const opacity = Math.max(0.1, 1 - (distance * 0.4));

      return `translate(${translateX}%, -50%) scale(${scale}) rotateY(${rotateY}deg)`;
    }
  }

  // Pan gesture handlers
  onPan(event: any) {
    if (!this.isPanning) {
      this.isPanning = true;
      this.panStartX = event.center.x;
    }

    this.currentPanX = event.deltaX;

    // Optional: Add real-time pan feedback here
    // You can modify card positions during pan for smoother UX
  }

  onPanEnd(event: any) {
    if (!this.isPanning) return;

    this.isPanning = false;
    const threshold = 50; // Minimum distance to trigger navigation

    if (Math.abs(event.deltaX) > threshold) {
      if (event.deltaX > 0) {
        // Panned right - go to previous card
        this.goToPrevCard();
      } else {
        // Panned left - go to next card
        this.goToNextCard();
      }
    }

    this.currentPanX = 0;
  }

  onSwipe(event: any) {
    const threshold = 50;

    if (Math.abs(event.deltaX) > threshold) {
      if (event.deltaX > 0) {
        this.goToPrevCard();
      } else {
        this.goToNextCard();
      }
    }
  }
}
