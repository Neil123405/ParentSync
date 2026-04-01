import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';

import { ModalController, AlertController, ToastController, MenuController } from '@ionic/angular';

import { filter } from 'rxjs/operators';

import { ApiService, ParentProfile } from '../../services/api.service';

import { AddStudentModalComponent } from '../add-student-modal/add-student-modal.component';

import { Storage } from '@ionic/storage-angular';  // ← ADD THIS

@Component({
  selector: 'app-global-footer',
  templateUrl: './global-footer.component.html',
  styleUrls: ['./global-footer.component.scss'],
  standalone: false
})
export class GlobalFooterComponent implements OnInit {
  currentRoute: string = '';
  showFooter: boolean = true;
  parent: any;
  currentProfile: ParentProfile | null = null;
    hasNewNotification: boolean = false;  // ← ADD THIS
    private _storage: Storage | null = null;


  constructor(
    private router: Router,
    private modalController: ModalController,
    private menu: MenuController,
    private toastController: ToastController,
    private apiService: ApiService,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
    private storage: Storage  // ← ADD THIS
  ) { }

   ngOnInit() {
    this.storage.create().then(storage => {
    this._storage = storage;
    
    // Restore badge state from storage (handle the Promise correctly)
    this._storage.get('hasNewNotification').then(savedBadgeState => {
      if (savedBadgeState === true) {
        this.hasNewNotification = true;
        this.cdr.markForCheck();
      }
    });
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
        this.currentRoute = event.url;
        this.showFooter = !this.currentRoute.startsWith('/login');

        if (this.currentRoute === '/children') {
          this.hasNewNotification = false;
          if (this._storage) {
            await this._storage.remove('hasNewNotification');
          }
          this.cdr.markForCheck();
        }
      });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
    });

    this.apiService.announcementReceived$.subscribe(async () => {
      this.hasNewNotification = true;
      if (this._storage) {
        await this._storage.set('hasNewNotification', true);
      }
      this.cdr.markForCheck();
    });

    this.apiService.resetNotification$.subscribe(() => {
    this.hasNewNotification = false;
    this.cdr.markForCheck();
  });
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
