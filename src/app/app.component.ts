import { Component } from '@angular/core';
import { PushNotifications, PushNotificationSchema } from '@capacitor/push-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private toastController: ToastController) {}

   ngOnInit() {
    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      // Use Capacitor Haptics for iOS/Android
      Haptics.impact({ style: ImpactStyle.Heavy });

      // Use Vibrate API for longer vibration (Android only)
      if ('vibrate' in navigator) {
        navigator.vibrate(800); // vibrate for 800ms (adjust as needed)
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
}
