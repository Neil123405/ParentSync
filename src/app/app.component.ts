import { Component, ViewChild, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { ToastController, ModalController, MenuController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';
import { GlobalFooterComponent } from './components/global-footer/global-footer.component';
import { ApiService, ParentProfile } from './services/api.service';
import { AccountMenuModalComponent } from './components/account-menu-modal/account-menu-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})

export class AppComponent implements OnInit {
  @ViewChild(GlobalFooterComponent) globalFooter!: GlobalFooterComponent;
  parent: ParentProfile | null = null;
  private toastQueue: { message: string; data: any }[] = [];
  private isToastDisplaying = false;
  showBadge: boolean = false;

  constructor(
    private toastController: ToastController,
    private modalCtrl: ModalController,
    private menu: MenuController,
    private apiService: ApiService,
    private router: Router,
    private platform: Platform,
    private storage: Storage,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone

  ) {
    this.initializeApp();
  }

  ngOnInit() {
    this.parent = this.apiService.getCurrentProfile();

    if (this.parent?.parent_id) {
      console.log('🔍 Checking badge state for parent:', this.parent.parent_id);
      this.checkBadgeState(this.parent.parent_id);
    }

    App.addListener('appStateChange', (state) => {
      this.ngZone.run(() => {
        if (state.isActive) {
          console.log('📱 App resumed - rechecking badge state');
          const parentId = this.apiService.getCurrentProfile()?.parent_id;
          if (parentId) {
            this.checkBadgeState(parentId);
          }
        }
      });
    });

    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      Haptics.impact({ style: ImpactStyle.Heavy });

      if ('vibrate' in navigator) {
        navigator.vibrate(800);
      }
      const parentId = this.apiService.getCurrentProfile()?.parent_id;
      if (parentId) {
        const storage = await this.storage.create();
        await storage.set(`hasNewNotification_${parentId}`, true);
        await storage.set(`badgeState_${parentId}`, true);
        this.showBadge = true;
      }

      const message = `${notification.body || 'Your child'}: ${notification.title || 'New Update'}`;
      this.showQueuedToast(message, notification.data);


      this.apiService.notifyNewAnnouncement();
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
      console.log('📬 Notification clicked:', notification);
      this.handleNotificationAction(notification.notification.data);
    });
  }

  private clearBrowserCache() {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
  }

  private handleNotificationAction(data: any) {
    if (!data || !data.type) {
      console.log('No routing data in notification');
      return;
    }

    console.log('🎯 Navigating based on type:', data.type);

    switch (data.type) {
      case 'consent_form':
        this.router.navigate(['/consent-form-detail', data.form_id, data.student_id]);
        break;
      case 'event':
        this.router.navigate(['/event-detail', data.event_id, data.student_id]);
        break;
      case 'announcement':
        this.router.navigate(['/announcement-detail', data.announcement_id, data.student_id]);  // ← Fixed
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  private async checkBadgeState(parentId: number) {
    const storage = await this.storage.create();
    this.storage.get(`badgeState_${parentId}`).then(cached => {
      if (cached !== null) {
        console.log('📦 Cached badge on resume:', cached);
        this.showBadge = cached;
        if (this.globalFooter) {
          this.globalFooter.badgeState$.next(cached);
        }
        this.cdr.markForCheck();
      }
    });
    this.apiService.getDeviceNotificationState(parentId).subscribe(
      (response: any) => {
        console.log('📢 Badge state from backend:', response.notified);
        const newState = response.notified === 1;
        console.log('✅ Setting showBadge to:', newState);
        this.showBadge = newState;
        console.log('✅ After setting, showBadge is:', this.showBadge);
        if (this.globalFooter) {
          this.globalFooter.badgeState$.next(newState);
        }
        this.storage.set(`badgeState_${parentId}`, newState);
        this.cdr.markForCheck();
      },
      (error) => {
        console.error('Error checking badge state:', error);
        this.showBadge = false; // Default to no badge on error
        this.cdr.markForCheck();
      }
    );
  }

  private async showQueuedToast(message: string, data?: any) {
    this.toastQueue.push({ message, data });

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
    const item = this.toastQueue.shift();
    const message = item?.message;
    const data = item?.data;

    const toast = await this.toastController.create({
      message: message,
      duration: 4000,
      position: 'top',
      color: 'primary',
      buttons: [
        {
          text: 'View',
          handler: () => {
            this.handleNotificationAction(data);
          }
        },
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });

    await toast.present();

    // Wait for toast duration + buffer before showing next one
    setTimeout(() => {
      this.processToastQueue();
    }, 4500); // 4000ms duration + 500ms buffer
  }

  private async performFullLogout() {
    this.apiService.clearAppState();
    // Step 2: Clear all storage via ApiService
    this.apiService.logout();

    // Step 3: Clear Ionic Storage cache
    await this.clearIonicStorage();

    // Step 4: Clear browser caches & cookies
    this.clearBrowserCache();

    this.toastQueue = [];
    this.isToastDisplaying = false;

    // Step 5: Navigate to login
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private async clearIonicStorage() {
    try {
      const storage = await this.storage.create();
      
      const keysToRemove = [
        'cachedAnnouncements',
        'cachedEvents',
        'cachedChildrenWithPhotos',
        'unreadAnnouncementCounts',
        'unreadEventCounts',
        'unreadConsentFormCounts',
        'announcementCountsTwo',
        'schoolEventCountsTwo',
        'consentFormCountsTwo',
        'calendarEvents',
        'consentFormCount',
        'eventCount',
        'laravelChildren',
        'lastSelectedChild'
      ];

      // Remove each key individually for safety
      for (const key of keysToRemove) {
        await storage.remove(key);
      }

      // Or clear everything if you prefer
      // await storage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
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
        error: (err) => {
          console.error('FCM token removal failed, but proceeding with logout:', err);
          this.performFullLogout();
          this.router.navigateByUrl('/login', { replaceUrl: true });
        }
      });
    } else {
      this.performFullLogout();
      this.router.navigateByUrl('/login', { replaceUrl: true });
    }
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

}


// TRASH
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
// let userId = this.parent?.parent_id;
// if (!userId && notification.data?.parent_id) {
//   userId = notification.data.parent_id;
// }

// If we have a userId, save the badge state
// if (userId) {
//   const storage = await this.storage.create();
//   await storage.set(`hasNewNotification_${userId}`, true);
//    await storage.set(`badgeState_${userId}`, true);
//   this.showBadge = true;
// }

// export function initializeBadgeState(apiService: ApiService, storage: Storage) {
//   return async () => {
//     try {
//       const profile = apiService.getCurrentProfile();
//       if (!profile?.parent_id) {
//         return Promise.resolve();  // ← Return resolved promise
//       }

//       const cached = await storage.get(`badgeState_${profile.parent_id}`);
//       if (cached !== null) {
//         console.log('📦 Cached badge:', cached);
//         return Promise.resolve(cached);  // ← Return resolved promise
//       }

//       return new Promise((resolve) => {
//         apiService.getDeviceNotificationState(profile.parent_id).subscribe(
//           (response: any) => {
//             const state = response.notified === 1;
//             console.log('📢 Fetched badge on startup:', state);
//             storage.set(`badgeState_${profile.parent_id}`, state);
//             resolve(state);
//           },
//           (error) => {
//             console.error('Error fetching badge on startup:', error);
//             resolve(false);
//           }
//         );
//       });
//     } catch (error) {
//       console.error('Badge initialization error:', error);
//       return Promise.resolve();  // ← Return resolved promise on error
//     }
//   };
// }