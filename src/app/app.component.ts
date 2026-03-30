import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Platform } from '@ionic/angular';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ToastController, ModalController, MenuController } from '@ionic/angular';
import { ApiService, ParentProfile } from './services/api.service';
import { AccountMenuModalComponent } from './components/account-menu-modal/account-menu-modal.component';
import { Storage } from '@ionic/storage-angular';

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
    private router: Router,
    private platform: Platform,
    private storage: Storage
  ) {
    this.initializeApp();
  }

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

      this.apiService.notifyNewAnnouncement();
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      // Handle back button globally to prevent re-entry after logout
      this.platform.backButton.subscribeWithPriority(10, () => {
        const currentUrl = this.router.url;
        if (currentUrl === '/login') {
          // If on login page, exit the app instead of allowing back navigation
          if ((window as any).Capacitor?.isNativePlatform) {
            (window as any).Capacitor.Plugins.App.exitApp();
          } else {
            // In browser, prevent default back behavior
            window.history.replaceState(null, '', '/login');
          }
        } else {
          // Allow normal back navigation for other pages
          window.history.back();
        }
      });
    });
  }

  onMenuOpen() {
    this.parent = this.apiService.getCurrentProfile();
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
          this.performFullLogout();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        },
        error: () => {
          this.performFullLogout();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
    } else {
      this.performFullLogout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
  }

  private async performFullLogout() {
  // Step 2: Clear all storage via ApiService
  this.apiService.logout();

  // Step 3: Clear Ionic Storage cache
  await this.clearIonicStorage();

  // Step 4: Clear browser caches & cookies
  this.clearBrowserCache();

  // Step 5: Navigate to login
  this.router.navigateByUrl('/login', { replaceUrl: true });
}

private async clearIonicStorage() {
  const storage = await this.storage.create();
  await storage.clear();
}

private clearBrowserCache() {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
}
}
