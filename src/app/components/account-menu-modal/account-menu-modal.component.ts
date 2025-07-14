import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, ActionSheetController } from '@ionic/angular';
import { ApiService, ParentProfile } from '../../services/api.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-account-menu-modal',
  templateUrl: './account-menu-modal.component.html',
  styleUrls: ['./account-menu-modal.component.scss'],
  
    imports: [IonicModule, FormsModule, CommonModule]
})
export class AccountMenuModalComponent implements OnInit {
  parent: ParentProfile | null = null;
  username: string = '';
  password: string = '';

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  ngOnInit() {
    const profile = this.apiService.getCurrentProfile();
    this.parent = profile ? (profile as ParentProfile) : null;
    this.username = this.parent?.username || '';
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async changePhoto() {
    const actionSheet = await this.actionSheetController.create({
      header: 'Change Photo',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => this.getPhoto(CameraSource.Camera)
        },
        {
          text: 'Upload from Device',
          icon: 'image',
          handler: () => this.getPhoto(CameraSource.Photos)
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async getPhoto(source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source
      });
      if (image && image.base64String && this.parent) {
        this.apiService.uploadParentPhoto(image.base64String).subscribe({
          next: (res) => {
            this.parent!.photo_url = (res as any).photo_url;
            this.showToast('Photo updated!');
          },
          error: () => this.showToast('Upload error.')
        });
      }
    } catch (err) {
      this.showToast('Camera error.');
    }
  }

  saveChanges() {
    this.apiService.updateParentAccount({
      username: this.username,
      password: this.password
    }).subscribe({
      next: () => this.showToast('Account updated!'),
      error: () => this.showToast('Update failed.')
    });
  }

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
}
