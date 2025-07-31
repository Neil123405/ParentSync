import { Component, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ModalController, ToastController, ActionSheetController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { ApiService, ParentProfile } from '../../services/api.service';


@Component({
  selector: 'app-account-menu-modal',
  templateUrl: './account-menu-modal.component.html',
  styleUrls: ['./account-menu-modal.component.scss'],
  imports: [FormsModule, CommonModule, IonicModule]
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
  ) { }

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
    if (!this.parent) return;
    this.apiService.updateParentAccount(this.parent.parent_id, {
      first_name: this.parent.first_name,
      last_name: this.parent.last_name,
      email: this.parent.email,
      contactNo: this.parent.contactNo
    }).subscribe({
      next: (res) => {
        this.showToast('Account updated!');
        this.apiService.setCurrentUser(
          this.apiService.getCurrentUser()!,
          { ...this.parent, ...(res as any).parent }
        );
        if (this.parent) {
          this.apiService.getParentProfile(this.parent.parent_id).subscribe(profileRes => {
            this.apiService.setCurrentUser(
              this.apiService.getCurrentUser()!,
              profileRes.parent
            );
            // Notify others that the profile was updated
            this.apiService.profileUpdated$.next();
          });
        } else {
          // Notify even if no profile reload
          this.apiService.profileUpdated$.next();
        }
        this.close();
      },
      error: (err) => {
        // Narrow the error type
        if (
          err &&
          typeof err === 'object' &&
          'status' in err &&
          err.status === 422 &&
          err.error &&
          typeof err.error === 'object' &&
          'errors' in err.error
        ) {
          // Now err.error.errors is safe to use
          // const errors = (err.error as any).errors;
          const messages = Object.values(err.error.errors)
            .reduce((acc: string[], val: any) => acc.concat(val), [])
            .join(' ');
          this.showToast(messages);
        } else {
          this.showToast('Update failed.');
        }
      }
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
