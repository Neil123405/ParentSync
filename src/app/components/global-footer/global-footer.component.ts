import { Component, OnInit } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';

import { ModalController, AlertController, ToastController, MenuController } from '@ionic/angular';

import { filter } from 'rxjs/operators';

import { ApiService, ParentProfile } from '../../services/api.service';

import { AddStudentModalComponent } from '../add-student-modal/add-student-modal.component';

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

  constructor(
    private router: Router,
    private modalController: ModalController,
    private menu: MenuController,
    private toastController: ToastController,
    private apiService: ApiService,
    private alertController: AlertController,
  ) { }

  ngOnInit() {
    // Set initial route and footer visibility, showing footer on all routes except '/login'
    this.currentRoute = this.router.url;
    this.showFooter = !this.currentRoute.startsWith('/login');

    // Listen for route changes, so to show the footer only on specific routes like Home, Dashboard, etc.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.showFooter = !this.currentRoute.startsWith('/login');
      });

    this.apiService.currentProfile$.subscribe(profile => {
      this.currentProfile = profile;
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
