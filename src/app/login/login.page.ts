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

  isRegistering = false;

  constructor(
    private apiService: ApiService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {}

  async login() {
    if (!this.credentials.username || !this.credentials.password) {
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
        
        // Store user data using ApiService (which has the setCurrentUser method)
        this.apiService.setCurrentUser(response.user, response.profile);
        
        // Navigate to home page
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
    if (!this.credentials.username || !this.credentials.password) {
      this.showAlert('Error', 'Please fill in all fields');
      return;
    }

    const userData = {
      username: this.credentials.username,
      password: this.credentials.password,
      role: 'parent'
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
        this.credentials = { username: '', password: '' };
      },
      error: async (error) => {
        await loading.dismiss();
        console.error('Registration failed:', error);
        
        const errorMessage = error.error?.message || 'Registration failed';
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
    this.credentials = { username: '', password: '' };
  }
}
