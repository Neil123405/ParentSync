import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { ApiService, User, ParentProfile } from '../services/api.service';

import { Storage } from '@ionic/storage-angular';

import { ActionSheetController } from '@ionic/angular';

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
  laravelChildren: any[] = [];
  laravelEvents: any[] = [];
  laravelConsentForms: any[] = [];

  announcementStudentFilter: string = '';
  announcementSort: string = 'latest';
  announcementLimit: number = 5;

  eventStudentFilter: string = '';
  eventSort: string = 'latest';
  eventLimit: number = 5;

  selectedStudents: any[] = [];
  isStudentsModalOpen: boolean = false;

  parent: ParentProfile | null = null;
  userPhotoUrl: string = '';

  activeTab: string = 'announcements';

  // Dashboard counts
  consentFormCount: number = 0;
  eventCount: number = 0;
  announcementCount: number = 0;

  // Feed state tracking
  activeFeedState = {
    loading: false,
    error: false,
    isInitialLoad: true
  };

  // Track individual data source load completion
  private dataLoaded = {
    announcements: false,
    events: false,
    consentForms: false,
    children: false
  };

  constructor(
    private apiService: ApiService,
    private router: Router,
    private storage: Storage,
  ) {

  }

  ngOnInit() {
    this.storage.create(); // Ensure storage is ready
    this.apiService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!this.currentUser) {
        this.router.navigate(['/login']);
      }
    });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
      if (this.currentProfile) {
        this.loadAnnouncementsAndEvents();
        this.loadChildrenWithPhotos();
      }
    });

    this.apiService.profileUpdated$.subscribe(() => {
      if (this.currentProfile) {
        this.loadAnnouncementsAndEvents();
        this.loadChildrenWithPhotos();
      }
    });

    const profile = this.apiService.getCurrentProfile();
    this.apiService.currentProfile$.subscribe(profile => {
      this.parent = profile ? (profile as ParentProfile) : null;
    });
  }

  ionViewWillEnter() {
    if (this.currentProfile) {
      this.loadChildrenWithPhotos();
      this.loadAnnouncementsAndEvents();
    }
  }

  private updateCounts(): void {
    this.consentFormCount = this.filteredConsentForms.length;
    this.eventCount = this.filteredEvents.length;
    this.announcementCount = this.filteredAnnouncements.length;
  }

  private checkAllDataLoaded(): void {
    if (
      this.dataLoaded.announcements &&
      this.dataLoaded.events &&
      this.dataLoaded.consentForms &&
      this.dataLoaded.children
    ) {
      this.activeFeedState.loading = false;
      this.activeFeedState.isInitialLoad = false;
    }
  }

  get filteredAnnouncements() {
    let list = this.laravelAnnouncements;
    list = [...list].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }

  get filteredEvents() {
    let list = this.laravelEvents;
    list = [...list].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }

  get studentsWithAnnouncements() {
    const studentIds = new Set(this.filteredAnnouncements.map(a => a.student_id));
    return this.laravelChildren.filter(child => studentIds.has(child.student_id));
  }

  get studentsWithEvents() {
    const studentIds = new Set(this.filteredEvents.map(e => e.student_id));
    return this.laravelChildren.filter(child => studentIds.has(child.student_id));
  }

  get groupedAnnouncements() {
    const groups: { [key: string]: { announcement: any, studentIds: number[] } } = {};

    for (const ann of this.filteredAnnouncements) {
      const key = ann.announcement_id;

      if (!groups[key]) {
        groups[key] = {
          announcement: ann,
          studentIds: []
        };
      }
      groups[key].studentIds.push(ann.student_id);
    }

    return Object.values(groups).sort((a, b) => {
      return new Date(b.announcement.created_at).getTime() - new Date(a.announcement.created_at).getTime();
    });
  }

  get groupedEvents() {
    const groups: { [key: string]: { event: any, studentIds: number[] } } = {};

    for (const event of this.filteredEvents) {
      const key = event.event_id || event.id;

      if (!groups[key]) {
        groups[key] = {
          event: event,
          studentIds: []
        };
      }
      groups[key].studentIds.push(event.student_id);
    }

    return Object.values(groups).sort((a, b) => {
      return new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime();
    });
  }

  get filteredConsentForms() {
    let list = this.laravelConsentForms;
    list = [...list].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }

  async showAssociatedStudents(event: Event, studentIds: number[]) {
    event.stopPropagation(); // Prevent opening the announcement detail page

    this.selectedStudents = studentIds.map(id => this.getStudentById(id)).filter(s => s !== undefined);

    if (this.selectedStudents.length > 0) {
      this.isStudentsModalOpen = true;
    }
  }

  async loadChildrenWithPhotos() {
    if (!this.currentProfile) {
      return;
    }

    // Check if cached children data exists
    const cachedChildren = await this.storage.get('cachedChildrenWithPhotos');
    if (cachedChildren) {
      this.laravelChildren = cachedChildren;
    }

    // Fetch fresh children data from the API
    this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        if (response.success) {
          this.laravelChildren = response.children || [];          
          await this.storage.set('cachedChildrenWithPhotos', this.laravelChildren);
          this.dataLoaded.children = true;
          this.checkAllDataLoaded();
        }
      },
      error: (error) => {
        console.error('Error fetching children with photos:', error);
        this.dataLoaded.children = true;
        this.checkAllDataLoaded();
      },
    });
  }

  async loadAnnouncementsAndEvents() {
    if (!this.currentProfile) return;

    // Set loading state for initial load
    if (this.activeFeedState.isInitialLoad) {
      this.activeFeedState.loading = true;
    }

    const cachedAnnouncements = await this.storage.get('cachedAnnouncements');
    const cachedEvents = await this.storage.get('cachedEvents');
    const cachedConsentForms = await this.storage.get('cachedConsentForms');

    if (cachedAnnouncements) {
      this.laravelAnnouncements = cachedAnnouncements;
      this.updateCounts();
    }

    if (cachedEvents) {
      this.laravelEvents = cachedEvents;
      this.updateCounts();
    }

    if (cachedConsentForms) {
      this.laravelConsentForms = cachedConsentForms;
      this.updateCounts();
    }

    this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        this.laravelAnnouncements = response.announcements || [];
        this.updateCounts();
        await this.storage.set('cachedAnnouncements', this.laravelAnnouncements);
        this.dataLoaded.announcements = true;
        this.checkAllDataLoaded();
      },
      error: (error) => {
        console.error('Error fetching announcements:', error);
        this.dataLoaded.announcements = true;
        this.checkAllDataLoaded();
      },
    });

    this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        this.laravelEvents = response.events || [];
        this.updateCounts();
        // Cache the events
        await this.storage.set('cachedEvents', this.laravelEvents);
        this.dataLoaded.events = true;
        this.checkAllDataLoaded();
      },
      error: (error) => {
        console.error('Error fetching events:', error);
        this.dataLoaded.events = true;
        this.checkAllDataLoaded();
      },
    });

    this.apiService.getAllUnsignedConsentFormsForParent(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        this.laravelConsentForms = response.forms || [];
        this.updateCounts();
        // Cache the consent forms
        await this.storage.set('cachedConsentForms', this.laravelConsentForms);
        this.dataLoaded.consentForms = true;
        this.checkAllDataLoaded();
      },
      error: (error) => {
        console.error('Error fetching consent forms:', error);
        this.dataLoaded.consentForms = true;
        this.checkAllDataLoaded();
      },
    });
  }

  async clearAnnouncementsAndEventsCache() {
    await this.storage.remove('cachedChildrenWithPhotos');
    await this.storage.remove('cachedAnnouncements');
    await this.storage.remove('cachedEvents');
    await this.storage.remove('cachedConsentForms');
  }

  async refreshData(event?: any) {
    await this.clearAnnouncementsAndEventsCache();
    await this.loadAnnouncementsAndEvents();
    await this.loadChildrenWithPhotos();
    if (event) {
      event.target.complete();
    }
  }

  openAnnouncement(announcement: any) {
    this.router.navigate(['/announcement-detail', announcement.announcement_id]);
  }

  openEventDetail(event: any) {
    this.router.navigate(['/event-detail', event.id]);
  }

  openConsentFormDetail(form: any) {
    this.router.navigate(['/consent-form-detail', form.form_id, form.student_id]);
  }

  getStudentById(studentId: number) {
    return this.laravelChildren.find(child => child.student_id === studentId);
  }

  showAnnouncementInfo() {
    alert('This button shows information about announcements.');
  }

  showEventsInfo() {
    alert('This button shows information about events.');
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  setStudentModalOpen(isOpen: boolean) {
    this.isStudentsModalOpen = isOpen;
  }

  getStudentInitials(studentId: number): string {
    const student = this.getStudentById(studentId);
    if (student) {
      const first = student.first_name?.charAt(0) || '';
      const last = student.last_name?.charAt(0) || '';
      return (first + last).toUpperCase();
    }
    return '?';
  }

  getStudentCountLabel(studentIds: number[]): string {
    const count = studentIds.length;
    if (count === 1) return '1 Student';
    return `${count} Students`;
  }

  getDueStatusLabel(form: any): string {
    if (!form.deadline) return 'No Deadline';

    const today = new Date();
    const deadline = new Date(form.deadline);
    const daysUntilDue = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) return 'Overdue';
    if (daysUntilDue === 0) return 'Due Today';
    if (daysUntilDue === 1) return 'Due Tomorrow';
    if (daysUntilDue <= 7) return `${daysUntilDue} Days Left`;
    return 'Upcoming';
  }

  getTeacherOrAuthorName(item: any): string {
    // Handle multiple possible field names for teacher/author
    const firstName = item?.teacher_first_name || item?.author_first_name || item?.first_name || '';
    const lastName = item?.teacher_last_name || item?.author_last_name || item?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'School Staff';
  }

}

// Trash code

// ngOnInit() {
//   this.storage.create(); // Ensure storage is ready
//   this.apiService.currentUser$.subscribe(user => {
//     this.currentUser = user;
//     if (!this.currentUser) {
//       this.router.navigate(['/login']);
//     }
//   });
//   this.apiService.currentProfile$.subscribe(profile => {
//     this.currentProfile = profile;
//     if (this.currentProfile) {
//       this.loadAnnouncementsAndEvents();
//       this.loadChildrenWithPhotos();
//     }
//   });
//   this.apiService.profileUpdated$.subscribe(() => {
//     if (this.currentProfile) {
//       this.loadAnnouncementsAndEvents();
//       this.loadChildrenWithPhotos();
//     }
//   });
//   const profile = this.apiService.getCurrentProfile();
//   this.parent = profile ? (profile as ParentProfile) : null;
// }

// get filteredAnnouncements() {
//     let list = this.laravelAnnouncements;
//     list = [...list].sort((a, b) => {
//       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
//     });
//     return list;
//   }

// get filteredEvents() {
//     let list = this.laravelEvents;
//     list = [...list].sort((a, b) => {
//       return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
//     });
//     return list;
//   }

// get studentsWithAnnouncements() {
//     const studentIds = new Set(this.filteredAnnouncements.map(a => a.student_id));
//     return this.laravelChildren.filter(child => studentIds.has(child.student_id));
//   }

// get studentsWithEvents() {
//   const studentIds = new Set(this.filteredEvents.map(e => e.student_id));
//   return this.laravelChildren.filter(child => studentIds.has(child.student_id));
// }

// get groupedAnnouncements() {
//     const groups: { [key: string]: { announcement: any, studentIds: number[] } } = {};
//     for (const ann of this.filteredAnnouncements) {
//       const key = ann.announcement_id;
//       if (!groups[key]) {
//         groups[key] = {
//           announcement: ann,
//           studentIds: []
//         };
//       }
//       groups[key].studentIds.push(ann.student_id);
//     }

//     return Object.values(groups).sort((a, b) => {
//       return new Date(b.announcement.created_at).getTime() - new Date(a.announcement.created_at).getTime();
//     });
//   }

// get groupedEvents() {
//   const groups: { [key: string]: { event: any, studentIds: number[] } } = {};
//   for (const event of this.filteredEvents) {
//     const key = event.event_id || event.id;
//     if (!groups[key]) {
//       groups[key] = {
//         event: event,
//         studentIds: []
//       };
//     }
//     groups[key].studentIds.push(event.student_id);
//   }

//   return Object.values(groups).sort((a, b) => {
//     return new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime();
//   });
// }

// ionViewWillEnter() {
//   if (this.currentProfile) {
//     this.loadChildrenWithPhotos();
//     this.loadAnnouncementsAndEvents();
//   }
// }

// setStudentModalOpen(isOpen: boolean) {
//   this.isStudentsModalOpen = isOpen;
// }

// goToStudentAnnouncements(studentId: number) {
//   this.router.navigate(['/student-announcements', studentId]);
// }

// goToStudentEvents(studentId: number) {
//   this.router.navigate(['/school-events', studentId]);
// }