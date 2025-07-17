import { Component, OnInit } from '@angular/core';
import { ApiService, ParentProfile } from '../../services/api.service';
import { AccountMenuModalComponent } from '../account-menu-modal/account-menu-modal.component';
import { Router } from '@angular/router';
import { ModalController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-menu-modal',
  templateUrl: './dashboard-menu-modal.component.html',
  styleUrls: ['./dashboard-menu-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class DashboardMenuModalComponent implements OnInit {
  parent: ParentProfile | null = null;

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.parent = this.apiService.getCurrentProfile();
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async openProfileSettings() {
    const modal = await this.modalCtrl.create({
      component: AccountMenuModalComponent,
      cssClass: 'account-menu-modal'
    });
    await modal.present();
    await modal.onDidDismiss();

    // Refresh the parent profile after closing the modal
    this.parent = this.apiService.getCurrentProfile();
  }

  openUpcomingEvents() {
    this.close();
    this.router.navigate(['/all-events']);
  }

  openPendingForms() {
    this.close();
    this.router.navigate(['/all-forms']);
  }
}
