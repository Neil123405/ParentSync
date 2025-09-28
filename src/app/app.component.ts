import { Component, OnInit } from '@angular/core';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ToastController, ModalController, MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ApiService, ParentProfile } from './services/api.service';
import { AccountMenuModalComponent } from './components/account-menu-modal/account-menu-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  parent: ParentProfile | null = null;
  constructor(
    private toastController: ToastController,
    private modalCtrl: ModalController,
    private menu: MenuController,
    private apiService: ApiService,
    private router: Router  
  ) { }

  ngOnInit() {
    this.parent = this.apiService.getCurrentProfile();
    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      Haptics.impact({ style: ImpactStyle.Heavy });

      if ('vibrate' in navigator) {
        navigator.vibrate(800);
      }

      // Show a simple toast for the announcement
      const toast = await this.toastController.create({
        message: notification.title
          ? `${notification.title}`
          : 'New Announcement/s',
        duration: 4000,
        position: 'top',
        color: 'primary'
      });
      toast.present();
    });
  }

  async openProfileSettings() {
    const modal = await this.modalCtrl.create({
      component: AccountMenuModalComponent,
      cssClass: 'account-menu-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
    this.parent = this.apiService.getCurrentProfile();
  }

  async openUpcomingEvents() {
    await this.menu.close('accountMenu');
    this.router.navigate(['/all-events']);
  }

  async openPendingForms() {
    await this.menu.close('accountMenu');
    this.router.navigate(['/all-forms']);
  }

  logout() {
    const token = this.apiService.getFcmToken();
    this.menu.close('accountMenu');

    if ((window as any).Capacitor?.isNativePlatform && token) {
      this.apiService.removePushToken(token).subscribe({
        next: () => {
          this.apiService.logout();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        },
        error: () => {
          this.apiService.logout();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
    } else {
      this.apiService.logout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }
}
