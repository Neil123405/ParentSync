import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { ToastController, ModalController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { ApiService, User, ParentProfile } from '../services/api.service';
import { AddStudentModalComponent } from '../components/add-student-modal/add-student-modal.component';
import { ChildOptionsModalComponent } from '../components/child-options-modal/child-options-modal.component';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { GestureController, Gesture } from '@ionic/angular';
import { FullCalendarComponent } from '@fullcalendar/angular/public-api';

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

@Component({
  selector: 'app-children',
  templateUrl: './children.page.html',
  styleUrls: ['./children.page.scss'],
  standalone: false,
})
export class ChildrenPage implements OnInit, AfterViewInit {
  currentUser: User | null = null;
  currentProfile: ParentProfile | null = null;
  laravelChildren: LaravelStudent[] = [];
  pendingStudents: LaravelStudent[] = [];
  selectedChild: LaravelStudent | null = null;
  upcomingConsentForms: any[] = [];
  upcomingEvents: any[] = [];
  recentAnnouncements: any[] = [];
  animationTimer: any = null;
  activeSection: string = '';
  newStudentId: number | null = null;
  longPressedId: number | null = null;
  pressTimer: any = null;
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
  isPanning: boolean = false;
  isLoading: boolean = true;
  centerCardIndex: number = 0;
  panStartX: number = 0;
  currentPanX: number = 0;
  // attendanceData: any[] = []; // Raw attendance data from API
  // uniqueTeachers: any[] = []; // List of unique teachers
  // selectedTeacher: any = null; // Currently selected teacher
  attendanceEvents: any[] = []; // Array to hold FullCalendar events
  attendanceCurrentMonth: string = '';
  presentCount: number = 0;
  absentCount: number = 0;
  lateCount: number = 0;
  excusedCount: number = 0;
  selectedYear: string = 'All';
  availableYears: string[] = ['All'];

  get filteredMilestones() {
    if (this.selectedYear === 'All') {
      return this.milestones;
    }
    return this.milestones.filter(m =>
      new Date(m.achieved_on).getFullYear().toString() === this.selectedYear
    );
  }

  extractAvailableYears() {
    const years = new Set<string>();
    this.milestones.forEach(m => {
      const year = new Date(m.achieved_on).getFullYear().toString();
      years.add(year);
    });

    // Sort years newest to oldest 'All' at the start
    this.availableYears = ['All', ...Array.from(years).sort().reverse()];

    this.selectedYear = 'All';
  }

  private attendanceGesture?: Gesture;
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin],
    initialView: 'dayGridMonth',
    events: [], // Will be populated with attendanceEvents
    height: 'auto',
    eventDisplay: 'background', // Show as background colors on dates
    eventColor: '#3788d8', // Default color (overridden per event)
    headerToolbar: {
      left: '',
      center: '',
      right: '',
    },
    datesSet: (arg) => {
      const centerDate = new Date(arg.view.currentStart);
      this.attendanceCurrentMonth = centerDate.toLocaleString('default', {
        month: 'long',
        year: 'numeric'
      });
      this.updateAttendanceStats(centerDate);
      this.cdr.detectChanges();
    },
  };
  milestones: any[] = []; // Array to hold milestone data
  private _storage: Storage | null = null;
  @ViewChild('attendanceCalendar') attendanceCalendarComponent!: FullCalendarComponent;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private apiService: ApiService,
    private toastController: ToastController,
    private modalController: ModalController,
    private storage: Storage,
    private gestureCtrl: GestureController,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) { }

  ngAfterViewInit() {
    // Initialize swipe gesture after view is ready
    setTimeout(() => {
      this.initializeAttendanceSwipe();
    }, 500);
  }

  initializeAttendanceSwipe() {
    if (this.attendanceGesture) {
      this.attendanceGesture.destroy();
      this.attendanceGesture = undefined;
    }
    const calendarElement = this.elementRef.nativeElement.querySelector('full-calendar');
    if (calendarElement) {
      this.attendanceGesture = this.gestureCtrl.create({
        el: calendarElement,
        gestureName: 'swipe',
        threshold: 15,
        passive: true,
        onEnd: (ev) => {
          // Prevent default only when necessary
          if (Math.abs(ev.deltaX) > 50) {
            this.handleAttendanceSwipe(ev);
          }
        },
      });
      this.attendanceGesture.enable(true);
    }
  }

  handleAttendanceSwipe(ev: any) {
    const calendarElement = this.elementRef.nativeElement.querySelector('full-calendar');
    const swipeThreshold = 50; // Minimum pixels for a swipe

    // Check for horizontal swipe
    if (Math.abs(ev.deltaX) > swipeThreshold) {
      if (ev.deltaX > 0) {
        // Swiped right
        calendarElement?.classList.add('swipe-right');
        setTimeout(() => calendarElement?.classList.remove('swipe-right'), 300);
        this.goToAttendancePrevious();
      } else {
        // Swiped left
        calendarElement?.classList.add('swipe-left');
        setTimeout(() => calendarElement?.classList.remove('swipe-left'), 300);
        this.goToAttendanceNext();
      }
    }
  }

  goToAttendancePrevious() {
    if (this.attendanceCalendarComponent) {
      const calendarApi = this.attendanceCalendarComponent.getApi();
      calendarApi.prev();
    }
  }

  goToAttendanceNext() {
    if (this.attendanceCalendarComponent) {
      const calendarApi = this.attendanceCalendarComponent.getApi();
      calendarApi.next();
    }
  }

  updateAttendanceStats(currentDate: Date) {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Reset counts
    this.presentCount = 0;
    this.absentCount = 0;
    this.lateCount = 0;
    this.excusedCount = 0;

    // Count attendance by status for current month
    this.attendanceEvents.forEach(event => {
      const eventDate = new Date(event.start);
      if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
        const status = event.extendedProps?.status?.toLowerCase();
        switch (status) {
          case 'present':
            this.presentCount++;
            break;
          case 'absent':
            this.absentCount++;
            break;
          case 'late':
            this.lateCount++;
            break;
          case 'excused':
            this.excusedCount++;
            break;
        }
      }
    });
  }

  async ngOnInit() {
    if (!this._storage) {
      this._storage = await this.storage.create();
    }
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

    this.apiService.announcementReceived$.subscribe(() => {
    console.log('📢 New announcement detected! Refreshing unread counts...');
    this.refreshUnreadCounts(); // Call new method
  });


    // Load data including this.consentFormCounts
    if (this.currentProfile) {
      const lastSelectedChild = await this.storage.get('lastSelectedChild');
      this.selectedChild = lastSelectedChild || null;
      await this.loadData();

      // Automatically select the first child if available

      if (lastSelectedChild) {
        const index = this.laravelChildren.findIndex(child => child.student_id === lastSelectedChild.student_id);
        if (index !== -1) {
          this.selectChildAndCenter(this.laravelChildren[index], index);
        }
      }
    }

    setTimeout(() => {
      if (this.laravelChildren.length === 0) return;
      if (this.selectedChild) {
        const idx = this.laravelChildren.findIndex(c => c.student_id === this.selectedChild!.student_id);
        if (idx !== -1) {
          this.centerCard(idx);
          return;
        }
      }
      this.centerCard(0);
    }, 100);

  }

// New method to refresh only unread counts (lightweight)
refreshUnreadCounts() {
  const parentId = this.currentProfile?.parent_id;
  if (!parentId) return;

  this.apiService.getParentAnnouncements(parentId).toPromise().then(announcementsRes => {
    const unreadCounts: { [key: number]: number } = {};
    announcementsRes.announcements.forEach((ann: any) => {
      if (ann.is_read === 0 || ann.is_read === '0' || ann.is_read === false) {
        const id = ann.student_id;
        unreadCounts[id] = (unreadCounts[id] || 0) + 1;
        this.apiService.setUnreadAnnouncementCount(id, unreadCounts[id]);
      }
    });
    console.log('✓ Unread counts refreshed:', unreadCounts);
    
    // Force change detection (push notifications may fire outside Angular zone)
    this.cdr.detectChanges();
  }).catch(err => {
    console.error('❌ Failed to refresh unread counts:', err);
  });
}

  ionViewWillEnter() {
    if (this.currentProfile) {
      this.loadData().then(async () => {
        if (!this._storage) {
          this._storage = await this.storage.create();
        }
        // Check if selectedChild is already set
        if (!this.selectedChild && this.laravelChildren.length > 0) {
          // Try to restore the last selected child from storage
          const lastSelectedChild = await this.storage.get('lastSelectedChild');

          if (lastSelectedChild) {
            const index = this.laravelChildren.findIndex(child => child.student_id === lastSelectedChild.student_id);
            if (index !== -1) {
              this.selectChildAndCenter(this.laravelChildren[index], index);
              return;
            }
          }

          // If no last selected child is found, select the first child
          this.selectChildAndCenter(this.laravelChildren[0], 0);
        }
      });
    }
  }

  updateSelectedChildData() {
    if (this.selectedChild && this.selectedChild.student_id) {
      this.upcomingConsentForms = this.consentFormCountsTwo[this.selectedChild.student_id] || [];
      this.upcomingEvents = this.schoolEventCountsTwo[this.selectedChild.student_id] || [];
      this.recentAnnouncements = this.announcementCountsTwo[this.selectedChild.student_id] || [];
    } else {
      this.upcomingConsentForms = [];
      this.upcomingEvents = [];
      this.recentAnnouncements = [];
    }
  }

  // Expose to template
  get unreadAnnouncementCounts() {
    return this.apiService.unreadAnnouncementCounts;
  }

  processData<T extends { deadline: string; student_id: number; date: string; created_at: string; is_read?: number | string }>(
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
    if (!this.currentProfile) {
      return;
    }

    this.isLoading = true; // Set loading state to true

    try {
      // Load children
      const parentId = this.currentProfile.parent_id;
      const cachedChildren = await this._storage?.get('laravelChildren');
      const cachedConsentCounts = await this._storage?.get('consentFormCounts');
      const cachedConsentCountsTwo = await this._storage?.get('consentFormCountsTwo');
      const cachedEventCounts = await this._storage?.get('schoolEventCounts');
      const cachedAnnouncementCounts = await this._storage?.get('announcementCounts');
      const cachedEventCountsTwo = await this._storage?.get('schoolEventCountsTwo');
      const cachedAnnouncementCountsTwo = await this._storage?.get('announcementCountsTwo');

      // Use cached data if available
      if (cachedChildren) {
        this.laravelChildren = cachedChildren;
      }
      if (cachedConsentCounts) {
        this.consentFormCounts = cachedConsentCounts;
        this.consentFormCountsTwo = cachedConsentCountsTwo;
      }
      if (cachedEventCounts) {
        this.schoolEventCounts = cachedEventCounts;
        this.schoolEventCountsTwo = cachedEventCountsTwo;
      }
      if (cachedAnnouncementCounts) {
        this.announcementCounts = cachedAnnouncementCounts;
        this.announcementCountsTwo = cachedAnnouncementCountsTwo;
      }

//       try {
//   const announcementsRes = await this.apiService.getParentAnnouncements(parentId).toPromise();
  
//   console.log('🔍 Raw announcementsRes:', announcementsRes);
//   console.log('🔍 announcementsRes.announcements:', announcementsRes?.announcements);
//   console.log('🔍 Array length:', announcementsRes?.announcements?.length);
  
//   // Count ALL unread announcements
//   const unreadCounts: { [key: number]: number } = {};
//   if (announcementsRes?.announcements && Array.isArray(announcementsRes.announcements)) {
//     announcementsRes.announcements.forEach((ann: any) => {
//       console.log('🔍 Checking announcement:', ann.announcement_id, 'is_read:', ann.is_read, 'type:', typeof ann.is_read);
//       if (ann.is_read === 0 || ann.is_read === '0' || ann.is_read === false) {
//         const id = ann.student_id;
//         unreadCounts[id] = (unreadCounts[id] || 0) + 1;
//         this.apiService.setUnreadAnnouncementCount(id, unreadCounts[id]);
//       }
//     });
//   } else {
//     console.warn('⚠️ announcements is not an array or doesnt exist');
//   }
//   console.log('✓ Final unreadCounts:', unreadCounts);
//   console.log('✓ ApiService.unreadAnnouncementCounts:', this.apiService.unreadAnnouncementCounts);
// } catch (error) {
//   console.error('❌ Failed to fetch announcements for unread count:', error);
// }
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
        const today = new Date();
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
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
        const { grouped: announcementGrouped, counts: announcementCounts } = this.processData(
          announcementsRes.announcements,
          announcement => {
            const announcementDate = new Date(new Date(announcement.created_at).toDateString());
            const isToday = announcementDate.getTime() === todayDate.getTime();
            return isToday;
          },
          announcement => announcement.student_id
        );
        this.announcementCountsTwo = announcementGrouped;
        this.announcementCounts = announcementCounts;
        // Simple: count ALL unread announcements (no date filter)
        const unreadCounts: { [key: number]: number } = {};
        announcementsRes.announcements.forEach((ann: any) => {
          if (ann.is_read === 0 || ann.is_read === '0') {
            const id = ann.student_id;
            unreadCounts[id] = (unreadCounts[id] || 0) + 1;
            // Sync to ApiService
            this.apiService.setUnreadAnnouncementCount(id, unreadCounts[id]);
          }
        });
        console.log('Unread counts:', unreadCounts);
console.log('ApiService unreadAnnouncementCounts:', this.apiService.unreadAnnouncementCounts);
        await this._storage?.set('announcementCounts', this.announcementCounts);
        await this._storage?.set('announcementCountsTwo', this.announcementCountsTwo);
        // Process pending students data
        this.pendingStudents = pendingStudentsRes.pending || [];

        const lastSelectedChild = await this._storage?.get('lastSelectedChild');
        this.selectedChild = lastSelectedChild || null;
        if (lastSelectedChild && this.laravelChildren.length > 0) {
          const index = this.laravelChildren.findIndex(child => child.student_id === lastSelectedChild.student_id);
          if (index !== -1) {
            this.selectChildAndCenter(this.laravelChildren[index], index);
          } else {
            this.selectChildAndCenter(this.laravelChildren[0], 0);
          }
        } else if (this.laravelChildren.length > 0 && !this.selectedChild) {
          this.selectChildAndCenter(this.laravelChildren[0], 0);
        }
      }
      // Update selected child data
      if (this.selectedChild) this.updateSelectedChildData();
      this.isLoading = false;
    } catch (error) {
      this.isLoading = false;
    }
  }

  async clearAllCache() {
    await this._storage?.clear();
  }

  showSection(section: string) {
    this.activeSection = section;
    if (!this.selectedChild) return;
    if (section === 'attendance') {
      this.loadAttendanceData(); // Load attendance when section is selected
      setTimeout(() => {
        this.initializeAttendanceSwipe();
      }, 300);
    } else if (section === 'milestones') {
      this.loadMilestonesData(); // Load milestones when section is selected
    }
    // else if (section === 'timeline') {
    //   this.toggleTimeline(this.selectedChild);
    // }
  }

  async loadMilestonesData() {
    if (!this.selectedChild) return;

    const storageKey = `milestones_${this.selectedChild.student_id}`;
    const cachedMilestones = await this._storage?.get(storageKey);
    if (cachedMilestones) {
      this.milestones = cachedMilestones;
      this.extractAvailableYears();
      this.isLoading = false; // Show data immediately
    }

    this.apiService.getStudentMilestones(this.selectedChild.student_id).subscribe({
      next: async (response) => {
        if (response.success && response.milestones.length > 0) {
          this.milestones = response.milestones;
          this.extractAvailableYears();
          await this._storage?.set(storageKey, this.milestones);
          this.isLoading = false;
        } else {
          if (!cachedMilestones) {
            this.milestones = [];
            this.showToast('No milestones found.');
            this.isLoading = false;
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading milestones:', err);
        if (!cachedMilestones) {
          this.showToast('Failed to load milestones data.');
        }
        this.isLoading = false;
      },
    });
  }

  async loadAttendanceData() {
    if (!this.selectedChild) return;

    const storageKey = `attendance_${this.selectedChild.student_id}`;
    const cachedAttendance = await this._storage?.get(storageKey);
    if (cachedAttendance) {
      this.processAttendanceData(cachedAttendance);
    } else {
      this.isLoading = true; // Only show spinner if no cache
    }

    this.apiService.getStudentAttendance(this.selectedChild.student_id).subscribe({
      next: async (response) => {
        this.isLoading = false;
        if (response.success && response.attendance.length > 0) {
          // Directly create events from all attendance records
          this.processAttendanceData(response.attendance);
          await this._storage?.set(storageKey, response.attendance);
        } else {
          if (!cachedAttendance) {
            this.attendanceEvents = [];
            this.showToast('No attendance records found.');
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading attendance:', err);
        if (!cachedAttendance) {
          this.showToast('Failed to load attendance data.');
        }
      },
    });
  }

  processAttendanceData(attendanceRecords: any[]) {
    this.attendanceEvents = attendanceRecords.map((record: any) => ({
      title: record.status.charAt(0).toUpperCase() + record.status.slice(1),
      start: record.date,
      allDay: true,
      backgroundColor: this.getStatusColor(record.status),
      borderColor: this.getStatusColor(record.status),
      extendedProps: {
        teacher: `${record.teacher_first_name} ${record.teacher_last_name}`,
        status: record.status,
      },
    }));

    this.calendarOptions = {
      ...this.calendarOptions,
      events: this.attendanceEvents,
    };

    // Only update stats if viewing the current month/context
    // (Optional: logic to check if calendar is currently viewed)
    let now = new Date();
    if (this.attendanceCalendarComponent) {
      const calendarApi = this.attendanceCalendarComponent.getApi();
      if (calendarApi) {
        now = calendarApi.getDate();
      }
    }
    this.attendanceCurrentMonth = now.toLocaleString('default', {
      month: 'long',
      year: 'numeric'
    });
    this.updateAttendanceStats(now);
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'present':
        return '#28a745'; // Green
      case 'absent':
        return '#dc3545'; // Red
      case 'late':
        return '#ffc107'; // Yellow/Orange
      case 'excused':
        return '#6c757d'; // Gray/Blue
      default:
        return '#3788d8'; // Default blue
    }
  }

  toggleSchoolEvents() {
    this.activeSection = 'tasks';
    this.showSchoolEvents = !this.showSchoolEvents;
  }

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
          cssClass: 'purple-alert',
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

  async openChildOptions(ev: Event, child: LaravelStudent) {
    ev.stopPropagation();
    const modal = await this.modalController.create({
      component: ChildOptionsModalComponent,
      componentProps: { child }
    });
    await modal.present();
  }

  openEventDetail(event: any) {
    this.router.navigate(['/event-detail', event.event_id, event.student_id]);
  }


  startPress(event: Event, child: any) {
    if (event instanceof MouseEvent) {
      event.preventDefault();
    }

    this.animationTimer = setTimeout(() => {
      this.longPressedId = child.student_id;
    }, 100);

    this.pressTimer = setTimeout(() => {
      this.openChildOptions(event, child);
      setTimeout(() => this.longPressedId = null, 800);
    }, 600);
  }

  endPress() {
    clearTimeout(this.pressTimer);
    clearTimeout(this.animationTimer);
    this.longPressedId = null;
  }

  openConsentFormDetail(form: any) {
    const formId = form.form_id;
    const studentId = form.student_id || (this.selectedChild && this.selectedChild.student_id);
    if (formId && studentId) {
      this.router.navigate(['/consent-form-detail', formId, studentId]);
    }
  }

  selectChildAndCenter(child: any, index: number) {
    this.selectedChild = child;
    this.centerCardIndex = index;
    if (this.selectedChild) {
      this.storage.set('lastSelectedChild', this.selectedChild);
      this.updateSelectedChildData();
      if (this.activeSection === 'attendance') {
        this.loadAttendanceData();
        // Re-initialize swipe gesture in case the calendar view refreshes
        setTimeout(() => this.initializeAttendanceSwipe(), 300);
      } else if (this.activeSection === 'milestones') {
        this.loadMilestonesData();
      }
    } else {
      console.error('Selected child is null or invalid');
    }
  }

  centerCard(index: number) {
    if (index >= 0 && index < this.laravelChildren.length) {
      this.centerCardIndex = index;
      if (this.laravelChildren[index]) {
        this.selectedChild = this.laravelChildren[index];
        this.activeSection = '';
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
      return 'translate(-50%, -50%) scale(1) rotateY(0deg)';
    } else if (diff < 0) {
      const distance = Math.abs(diff);
      const translateX = -50 - (distance * 80);
      const scale = Math.max(0.6, 1 - (distance * 0.2));
      const rotateY = Math.min(75, 45 + (distance * 15));
      return `translate(${translateX}%, -50%) scale(${scale}) rotateY(${rotateY}deg)`;
    } else {
      const distance = diff;
      const translateX = -50 + (distance * 80);
      const scale = Math.max(0.6, 1 - (distance * 0.2));
      const rotateY = Math.max(-75, -45 - (distance * 15));
      return `translate(${translateX}%, -50%) scale(${scale}) rotateY(${rotateY}deg)`;
    }
  }

  onPan(event: any) {
    if (!this.isPanning) {
      this.isPanning = true;
      this.panStartX = event.center.x;
    }
    this.currentPanX = event.deltaX;
  }

  onPanEnd(event: any) {
    if (!this.isPanning) return;
    this.isPanning = false;
    const threshold = 50;
    if (Math.abs(event.deltaX) > threshold) {
      if (event.deltaX > 0) {
        this.goToPrevCard();
      } else {
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
