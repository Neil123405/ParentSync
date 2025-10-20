import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';

import { ApiService, User, ParentProfile } from '../services/api.service';

import { Storage } from '@ionic/storage-angular';

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

  announcementStudentFilter: string = '';
  announcementSort: string = 'latest';
  announcementLimit: number = 5;

  eventStudentFilter: string = '';
  eventSort: string = 'latest';
  eventLimit: number = 5;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private storage: Storage,
  ) {

  }

  parent: ParentProfile | null = null;
  userPhotoUrl: string = '';

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
    this.parent = profile ? (profile as ParentProfile) : null;
  }

  async loadChildrenWithPhotos() {
    if (!this.currentProfile) {
      return;
    } 

    // Check if cached children data exists
    const cachedChildren = await this.storage.get('cachedChildrenWithPhotos');
    if (cachedChildren) {
      console.log('Using cached children with photos', cachedChildren);
      this.laravelChildren = cachedChildren;
    }

    // Fetch fresh children data from the API
    this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        if (response.success) {
          this.laravelChildren = response.children || [];
          // Cache the children data
          await this.storage.set('cachedChildrenWithPhotos', this.laravelChildren);
          console.log('Cached children with photos:', this.laravelChildren);
        }
      },
      error: (error) => {
        console.error('Error fetching children with photos:', error);
      },
    });
  }

  ionViewWillEnter() {
    if (this.currentProfile) {
      this.loadChildrenWithPhotos();
      this.loadAnnouncementsAndEvents();
    }
  }

  async loadAnnouncementsAndEvents() {
    if (!this.currentProfile) return;

    const cachedAnnouncements = await this.storage.get('cachedAnnouncements');
    const cachedEvents = await this.storage.get('cachedEvents');

    if (cachedAnnouncements) {
      console.log('Using cached announcements');
      this.laravelAnnouncements = cachedAnnouncements;
    }

    if (cachedEvents) {
      console.log('Using cached events');
      this.laravelEvents = cachedEvents;
    }

    this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        this.laravelAnnouncements = response.announcements || [];
        // Cache the announcements
        await this.storage.set('cachedAnnouncements', this.laravelAnnouncements);
        console.log('Cached announcements:', this.laravelAnnouncements);
      },
      error: (error) => {
        console.error('Error fetching announcements:', error);
      },
    });

    this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe({
      next: async (response) => {
        this.laravelEvents = response.events || [];
        // Cache the events
        await this.storage.set('cachedEvents', this.laravelEvents);
        console.log('Cached events:', this.laravelEvents);
      },
      error: (error) => {
        console.error('Error fetching events:', error);
      },
    });
  }

  async clearAnnouncementsAndEventsCache() {
    await this.storage.remove('cachedChildrenWithPhotos');
    await this.storage.remove('cachedAnnouncements');
    await this.storage.remove('cachedEvents');
    console.log('Announcements and events cache cleared');
  }

  async refreshData(event?: any) {
    await this.clearAnnouncementsAndEventsCache(); // Clear the cache
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

  getStudentById(studentId: number) {
    return this.laravelChildren.find(child => child.student_id === studentId);
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

  goToStudentAnnouncements(studentId: number) {
    this.router.navigate(['/student-announcements', studentId]);
  }

  get studentsWithEvents() {
    const studentIds = new Set(this.filteredEvents.map(e => e.student_id));
    return this.laravelChildren.filter(child => studentIds.has(child.student_id));
  }

  goToStudentEvents(studentId: number) {
    this.router.navigate(['/school-events', studentId]);
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

  activeTab: string = 'announcements';

  showAnnouncementInfo() {
    alert('This button shows information about announcements.');
  }

  showEventsInfo() {
    alert('This button shows information about events.');
  }

  setTab(tab: string) {
    this.activeTab = tab;
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
}