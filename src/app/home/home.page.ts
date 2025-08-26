import { Component, OnInit } from '@angular/core';

import { Router } from '@angular/router';
// import { AlertController, LoadingController } from '@ionic/angular';

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
  // mixedFeed: any[] = [];
  laravelChildren: any[] = [];
  laravelEvents: any[] = [];

  announcementStudentFilter: string = '';
  announcementSort: string = 'latest';
  announcementLimit: number = 5;

  eventStudentFilter: string = '';
  eventSort: string = 'latest';
  eventLimit: number = 5;

  // studentFilter: string = '';
  // feedSort: string = 'latest';
  // feedLimit: number = 5;

  constructor(
    private apiService: ApiService,
    private router: Router,
    // private alertController: AlertController,
    // private loadingController: LoadingController
  ) {
    // console.log('HomePage constructor');
  }

  //* already read!
  ngOnInit() {
    // Subscribe to user and profile changes
    this.apiService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (!this.currentUser) {
        this.router.navigate(['/login']);
      }
    });

    this.apiService.currentProfile$.subscribe(profile => {
      // console.log('HomePage currentProfile$ subscription:', profile);
      this.currentProfile = profile;
      if (this.currentProfile) {
        this.loadAnnouncementsAndEvents();
        this.loadChildrenWithPhotos(); 
      }
    });

    // Listen for profile updates (e.g., after editing profile)
    this.apiService.profileUpdated$.subscribe(() => {
      if (this.currentProfile) {
        this.loadAnnouncementsAndEvents();
        this.loadChildrenWithPhotos(); 
      }
    });
    // if (this.currentProfile) {
    //   this.loadAnnouncementsAndEvents();
    // }
  }

  loadChildrenWithPhotos() {
    if (!this.currentProfile) {
      return;
    }
     this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
    next: (response) => {
      if (response.success) {
        this.laravelChildren = response.children;

        // For each child, fetch the full profile (with full photo_url)
        // this.laravelChildren.forEach(child => {
        //   this.apiService.getStudentProfile(child.student_id).subscribe(profile => {
        //     child.photo_url = profile.photo_url;
        //     // ...update other fields if needed
        //   });
        // });
      }
    },
    error: (error) => {
      // handle error if needed
    }
  });
    
  }

  //* already read!
  ionViewWillEnter() {
    // Refresh data every time Home is shown
    if (this.currentProfile) {
      this.loadChildrenWithPhotos();
      this.loadAnnouncementsAndEvents();
    }
  }

  //* already read!
  loadAnnouncementsAndEvents() {
    if (!this.currentProfile) return;

    // Announcements
    this.apiService.getParentAnnouncements(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        this.laravelAnnouncements = response.announcements || [];
        // Only announcements in mixedFeed
        // map means get each announcement and add a type called announcement, the data is the announcement itself
        // this.mixedFeed = this.laravelAnnouncements.map((a: any) => ({
        //   type: 'announcement',
        //   data: a
        // }));
      }
    });

    // Events for all children
    this.apiService.getParentEvents(this.currentProfile.parent_id).subscribe({
      next: (response) => {
        this.laravelEvents = response.events || [];
      }
    });

    // Children (for getStudentById)
    // this.apiService.getParentChildren(this.currentProfile.parent_id).subscribe({
    //   next: (response) => {
    //     this.laravelChildren = response.children || [];
    //   }
    // });
  }

  //* already read!
  async refreshData(event?: any) {
    await this.loadAnnouncementsAndEvents();
    await this.loadChildrenWithPhotos();
    if (event) {
      // stops the refresh spinner
      event.target.complete();
    }
  }

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

  //* already read!
  openAnnouncement(announcement: any) {
    // console.log('Announcement clicked:', announcement);
    this.router.navigate(['/announcement-detail', announcement.announcement_id]);
  }

  //* already read!
  openEventDetail(event: any) {
    // console.log('Event clicked:', event);
    this.router.navigate(['/event-detail', event.id]);
  }

  //* already read!
  getStudentById(studentId: number) {
    return this.laravelChildren.find(child => child.student_id === studentId);
  }

  // Filtered Announcements
  //* already read!
  get filteredAnnouncements() {
    let list = this.laravelAnnouncements;
    // if (this.studentFilter) {
    //   list = list.filter(a => a.student_id == this.studentFilter);
    // }
    // // a and b are announcement objects
    // // the top is just a filter, this one is the sort (important)
    // // sort function negative means a comes first, positive means b comes first, it is FIXED RULE OF JAVASCRIPT
    // list = [...list].sort((a, b) => {
    //   if (this.feedSort === 'latest') {
    //     // a.created_at = '2024-01-01'
    //     // b.created_at = '2025-01-01'
    //     // For latest:
    //     // new Date(b).getTime() - new Date(a).getTime() → positive → b first (newest first)

    //     // For oldest:
    //     // new Date(a).getTime() - new Date(b).getTime() → negative → a first (oldest first)
    //     // algorithm by google https://stackoverflow.com/questions/10123953/how-to-sort-an-object-array-by-date-property
    //     return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    //   } else {
    //     return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    //   }
    // });
    // return list.slice(0, this.feedLimit);
    return list;
  }

  // Filtered Events
  //* already read! same as announcements
  get filteredEvents() {
    let list = this.laravelEvents;
    // if (this.studentFilter) {
    //   list = list.filter(e => e.student_id == this.studentFilter);
    // }
    // list = [...list].sort((a, b) => {
    //   if (this.feedSort === 'latest') {
    //     return new Date(b.date).getTime() - new Date(a.date).getTime();
    //   } else {
    //     return new Date(a.date).getTime() - new Date(b.date).getTime();
    //   }
    // });
    // return list.slice(0, this.feedLimit);
    return list;
  }

  // Add this getter to your HomePage class
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

  return Object.values(groups);
}
}