import { Component, OnInit, OnChanges, ChangeDetectorRef, Input, SimpleChanges } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';

import { ModalController, AlertController, ToastController, MenuController } from '@ionic/angular';

import { filter } from 'rxjs/operators';

import { ApiService, ParentProfile } from '../../services/api.service';

import { AddStudentModalComponent } from '../add-student-modal/add-student-modal.component';

import { Storage } from '@ionic/storage-angular';  // ← ADD THIS

import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-global-footer',
  templateUrl: './global-footer.component.html',
  styleUrls: ['./global-footer.component.scss'],
  standalone: false
})
export class GlobalFooterComponent implements OnInit, OnChanges {
  currentRoute: string = '';
  showFooter: boolean = true;
  parent: any;
  currentProfile: ParentProfile | null = null;
  hasNewNotification: boolean = false;
  private _storage: Storage | null = null;
  // private _badgeState: boolean = false;
  badgeState$ = new BehaviorSubject<boolean>(false);  // ← NEW
  badgeState: boolean = false;  // For template binding
  //  @Input() 
  //   set badgeState(value: boolean) {
  //     console.log('🔔 [@Input] badgeState setter called with value:', value);
  //     this._badgeState = value;
  //     this.cdr.markForCheck();
  //   }
  //   get badgeState(): boolean {
  //     return this._badgeState;
  //   }
  constructor(
    private router: Router,
    private modalController: ModalController,
    private menu: MenuController,
    private toastController: ToastController,
    private apiService: ApiService,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
    private storage: Storage
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    console.log('🔄 ngOnChanges fired:', changes);
    if (changes['badgeState']) {
      console.log('🔄 Badge state input changed to:', this.badgeState);
      this.cdr.markForCheck();
    }
  }

  async ngOnInit() {
    this.storage.create().then(storage => {
      this._storage = storage;
    });

    this.badgeState$.subscribe(state => {
      this.badgeState = state;
      this.cdr.markForCheck();
    });

    // Subscribe to user changes and restore badge when user is available
    this.apiService.currentUser$.subscribe(async (user) => {
      if (user && user.user_id) {
        const userId = user.user_id;
        const savedBadgeState = await this._storage?.get(`hasNewNotification_${userId}`);
        if (savedBadgeState === true) {
          this.hasNewNotification = true;
          this.cdr.markForCheck();
        }
      }
    });
    // Set initial route and footer visibility, showing footer on all routes except '/login'
    this.currentRoute = this.router.url;
    if (this.currentRoute.startsWith('/login') || this.currentRoute === '/' || this.currentRoute === '') {
      this.currentRoute = '/home';
    }
    this.showFooter = !this.currentRoute.startsWith('/login');
    // const savedBadgeState = this._storage?.get('hasNewNotification');
    //     if (savedBadgeState === true) {
    //       this.hasNewNotification = true;
    //       this.cdr.markForCheck();
    //     }
    // Listen for route changes, so to show the footer only on specific routes like Home, Dashboard, etc.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(async (event: NavigationEnd) => {
        console.log('🛣️ Navigation to:', event.url);
        this.currentRoute = event.url;
        this.showFooter = !this.currentRoute.startsWith('/login');

        if (this.currentRoute === '/children') {
          console.log('🚨 AUTO-CLEARING BADGE - navigated to /children');
          this.clearBadge();
          this.hasNewNotification = false;
          const userId = this.apiService.getCurrentUser()?.user_id;
          if (userId) {
            this._storage?.set(`hasNewNotification_${userId}`, false);
          }
          this.cdr.markForCheck();
        }
      });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
    });

    this.apiService.announcementReceived$.subscribe(async () => {
      this.hasNewNotification = true;
      this.badgeState$.next(true);
      this.cdr.markForCheck();
      const userId = this.apiService.getCurrentUser()?.user_id;
      if (userId) {
        this._storage?.set(`hasNewNotification_${userId}`, true);
      }
    });

    this.apiService.resetNotification$.subscribe(() => {
      this.hasNewNotification = false;
      this.badgeState$.next(false);
      this.cdr.markForCheck();
    });
  }

  navigateAndClearBadge(route: string) {
    console.log('📍 Current route:', this.currentRoute, 'Target route:', route);
    if (this.currentRoute === route) {
      console.log('⚠️ Already on this route, NOT navigating');
      return;  // ← Prevent re-navigation if already there
    }
    this.router.navigate([route]);
    this.clearBadge();
  }

  private async clearBadge() {
    const parentId = this.apiService.getCurrentProfile()?.parent_id;  // ✅ CORRECT - This is PARENT ID
    if (!parentId) return;
    const userId = this.apiService.getCurrentUser()?.user_id;
    console.log('🔄 Clearing badge for parent:', parentId);
    this.badgeState$.next(false);
    this.hasNewNotification = false;
    this.cdr.markForCheck();
    await this.storage?.set('badgeState' + parentId, false);
    if (userId) {
      await this.storage?.set('hasNewNotification' + userId, false);
    }

    this.apiService.updateDeviceNotificationState(parentId, 0).subscribe(
      (response: any) => {
        // this.badgeState$.next(false);
        // this.hasNewNotification = false;
        // this.cdr.markForCheck();
        console.log('✅ Badge cleared in database');
      },
      (error) => {
        console.error('Error clearing badge:', error);
      }
    );
  }

  openAccountMenu(event: Event) {
    this.menu.open('accountMenu');
  }

  closeAccountMenu() {
    this.menu.close('accountMenu');
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'primary'
    });
    toast.present();
  }

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
                      next: (response) => {
                        if (response.success) {
                          this.showToast('Student linked successfully!');
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
}
