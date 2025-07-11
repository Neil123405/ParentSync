import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
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

  constructor(
    private apiService: ApiService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {}

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
        console.log('Login successful:', response);
        
        localStorage.setItem('token', response.token); // Store the token
        // Store user data using ApiService
        this.apiService.setCurrentUser(response.user, response.profile);
        
        // Navigate to home page (announcements)
        this.router.navigate(['/home']);
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Login failed:', error);
        
        const errorMessage = error.error?.message || 'Invalid credentials';
        this.showAlert('Login Failed', errorMessage);
      }
    });
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
        console.log('Registration successful:', response);
        
        this.showAlert('Success', 'Account created successfully! You can now login.');
        this.isRegistering = false;
        this.clearForms();
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Registration failed:', error);

        let errorMessage = error.error?.message || 'Registration failed';
        // If there are validation errors, append them to the message
        if (error.error?.errors) {
          const details = Object.entries(error.error.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('<br>');
          errorMessage += '<br>' + details;
        }
        this.showAlert('Registration Failed', errorMessage);
      }
    });
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidContactNumber(contactNo: string): boolean {
    // Philippine mobile number format: 09XXXXXXXXX (11 digits starting with 09)
    const phoneRegex = /^09\d{9}$/;
    return phoneRegex.test(contactNo);
  }
}
