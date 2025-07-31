import { Component, Input, OnInit } from '@angular/core'

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ModalController, ToastController, ActionSheetController, IonicModule } from '@ionic/angular';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-child-options-modal',
  templateUrl: './child-options-modal.component.html',
  styleUrls: ['./child-options-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class ChildOptionsModalComponent implements OnInit {
  @Input() child: any;

  constructor(
    private modalCtrl: ModalController,
    private apiService: ApiService,
    private toastController: ToastController,
    private actionSheetController: ActionSheetController
  ) {}

  ngOnInit() {}

  close() {
    this.modalCtrl.dismiss();
  }

  async changeStudentPhoto(child: any) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Change Photo',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => this.getPhoto(child, CameraSource.Camera)
        },
        {
          text: 'Upload from Device',
          icon: 'image',
          handler: () => this.getPhoto(child, CameraSource.Photos)
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

  async getPhoto(child: any, source: CameraSource) {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source
      });
      if (image && image.base64String) {
        this.apiService.uploadStudentPhoto(child.student_id, image.base64String).subscribe({
          next: (res) => {
            child.photo_url = res.photo_url;
            this.showToast('Photo updated!');
          },
          error: (err) => {
            this.showToast('Upload error.');
          }
        });
      }
    } catch (err) {
      this.showToast('Camera error.');
    }
  }

  unlinkStudent(child: any) {
    this.apiService.unlinkStudentFromParent(child.student_id).subscribe({
      next: () => {
        this.showToast('Student unlinked!');
        this.modalCtrl.dismiss({ unlinked: true });
      },
      error: () => this.showToast('Failed to unlink student.')
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
