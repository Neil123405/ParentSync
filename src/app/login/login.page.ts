import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AlertController, LoadingController } from '@ionic/angular';
// import { environment } from '../../environments/environment'; 
import { Keyboard } from '@capacitor/keyboard';
import { PushNotifications } from '@capacitor/push-notifications';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
//* already read!
export class LoginPage implements AfterViewInit, OnDestroy {
  credentials = {
    username: '',
    password: ''
  };

  parentInfo = {
    first_name: '',
    last_name: '',
    email: '',
    contactNo: ''
  };

  isRegistering = false;
  private keyboardShowListener: any;

  constructor(
    private apiService: ApiService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) { }

  showPassword = false;
  rememberMe = false;


  ngOnInit() {
    this.credentials = {
      username: '',
      password: ''
    };
    this.parentInfo = {
      first_name: '',
      last_name: '',
      email: '',
      contactNo: ''
    };
  }

  ionViewWillEnter() {
    this.credentials = { username: '', password: '' };
    // Optionally, also clear registration fields if needed:
    this.parentInfo = { first_name: '', last_name: '', email: '', contactNo: '' };
  }

  // prevents keyboard from covering input fields
  ngAfterViewInit() {
    this.keyboardShowListener = Keyboard.addListener('keyboardWillShow', async () => {
      const el = document.activeElement as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'ION-INPUT')) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    });
  }

  // cleans up the keyboard listener when the component is destroyed
  ngOnDestroy() {
    if (this.keyboardShowListener) {
      this.keyboardShowListener.remove();
    }
  }

  async login() {
    if (!this.isLoginValid()) {
      this.showAlert('Error', 'Please fill in all fields');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Logging in...',
    });
    await loading.present();

    this.apiService.login(this.credentials).subscribe({
      next: async (response) => {
        await loading.dismiss();
        // console.log('Login successful:', response);

        localStorage.setItem('token', response.token); // Store the token
        // Store user data using ApiService
        this.apiService.setCurrentUser(response.user, response.profile);
        // console.log('After setCurrentUser:', {
        //   user: this.apiService.getCurrentUser(),
        //   profile: this.apiService.getCurrentProfile()
        // });

        // --- FCM Registration and Token Sending ---
        // Only run on device (not browser)
        if ((window as any).Capacitor?.isNativePlatform) {
          try {
            const permResult = await PushNotifications.requestPermissions();
            if (permResult.receive === 'granted') {
              await PushNotifications.register();
              // listens for the registration event granted by the phone
              PushNotifications.addListener('registration', (token) => {
                // console.log('FCM Token:', token.value);
                this.apiService.setFcmToken(token.value); // <-- Add this line
                const profile = this.apiService.getCurrentProfile();
                if (profile) {
                  this.apiService.savePushToken(profile.parent_id, token.value).subscribe(); // {
                  //   next: (res) => console.log('Token saved!', res),
                  //   error: (err) => console.error('Failed to save token', err)
                  // });
                }
              });
            }
          } catch (err) {
            console.error('Push notification setup failed:', err);
          }
        }
        // --- End FCM Registration ---

        this.router.navigate(['/home']);
      },
      error: async (error) => {
        await loading.dismiss();
        // console.error('Login failed:', error);

        const errorMessage = error.error?.message || 'Invalid credentials';
        this.showAlert('Login Failed', errorMessage);
      }
    });
    // console.log('API URL:', environment.apiUrl);
  }

  async register() {
    if (!this.isRegistrationValid()) {
      this.showAlert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate email format
    if (!this.isValidEmail(this.parentInfo.email)) {
      this.showAlert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate contact number format (Philippine format)
    if (!this.isValidContactNumber(this.parentInfo.contactNo)) {
      this.showAlert('Error', 'Please enter a valid Philippine mobile number (09XXXXXXXXX)');
      return;
    }

    const userData = {
      username: this.credentials.username,
      password: this.credentials.password,
      role: 'parent',
      first_name: this.parentInfo.first_name,
      last_name: this.parentInfo.last_name,
      email: this.parentInfo.email,
      contactNo: this.parentInfo.contactNo
    };

    const loading = await this.loadingController.create({
      message: 'Creating account...',
    });
    await loading.present();

    this.apiService.register(userData).subscribe({
      next: async (response) => {
        await loading.dismiss();
        // console.log('Registration successful:', response);

        this.showAlert('Success', 'Account created successfully! You can now login.');
        this.isRegistering = false;
        this.clearForms();
      },
      error: async (error) => {
        await loading.dismiss();
        // console.error('Registration failed:', error);
        // error.error is an object with message and possibly errors, the second one is inside of an object which is the first error
        let errorMessage = error.error?.message || 'Registration failed';
        // If there are validation errors, append them to the message
        if (error.error?.errors) {
          const details = Object.entries(error.error.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[])}`)
            .join(' | ');
          errorMessage += ' ' + details;
        }
        this.showAlert('Registration Failed', errorMessage);
      }
    });
    // console.log('API URL:', environment.apiUrl); // <-- Add this line
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  toggleMode() {
    this.isRegistering = !this.isRegistering;
    this.clearForms();
  }

  private clearForms() {
    this.credentials = { username: '', password: '' };
    this.parentInfo = {
      first_name: '',
      last_name: '',
      email: '',
      contactNo: ''
    };
  }

  isLoginValid(): boolean {
    return !!(this.credentials.username && this.credentials.password);
  }

  isRegistrationValid(): boolean {
    return !!(
      this.credentials.username &&
      this.credentials.password &&
      this.parentInfo.first_name &&
      this.parentInfo.last_name &&
      this.parentInfo.email &&
      this.parentInfo.contactNo
    );
  }

  private isValidEmail(email: string): boolean {
    // convnetional email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidContactNumber(contactNo: string): boolean {
    // conventional regex for validating Philippine mobile numbers
    // Philippine mobile number format: 09XXXXXXXXX (11 digits starting with 09)
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(contactNo);
  }
}
