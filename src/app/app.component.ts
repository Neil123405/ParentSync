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
  private toastQueue: string[] = [];
   private isToastDisplaying = false;
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
// // ← ADD THIS DEBUGGING:
//   console.log('📬 Full notification object:', notification);
//   console.log('📬 notification.title:', notification.title);
//   console.log('📬 notification.data:', notification.data);
//   console.log('📬 notification.data?.student_name:', notification.data?.student_name);

//       // Show a simple toast for the announcement
//       const toast = await this.toastController.create({
//         message: `${notification.body || 'Your child'}: ${notification.title || 'New Update'}`,
//         duration: 4000,
//         position: 'top',
//         color: 'primary',
//          cssClass: `toast-${this.toastQueue.length}` // Different position for each
//       });
//       toast.present();

 const message = `${notification.body || 'Your child'}: ${notification.title || 'New Update'}`;
      this.showQueuedToast(message);


      this.apiService.notifyNewAnnouncement();
    });
  }

  private async showQueuedToast(message: string) {
    this.toastQueue.push(message);
    
    if (!this.isToastDisplaying) {
      this.processToastQueue();
    }
  }
  private async processToastQueue() {
    if (this.toastQueue.length === 0) {
      this.isToastDisplaying = false;
      return;
    }

    this.isToastDisplaying = true;
    const message = this.toastQueue.shift();

    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      position: 'top',
      color: 'primary'
    });

    await toast.present();
    
    // Wait for toast duration + buffer before showing next one
    setTimeout(() => {
      this.processToastQueue();
    }, 4500); // 4000ms duration + 500ms buffer
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
