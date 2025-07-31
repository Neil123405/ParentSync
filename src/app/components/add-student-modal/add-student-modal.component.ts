import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ModalController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-add-student-modal',
  templateUrl: './add-student-modal.component.html',
  standalone: true,
  imports: [IonicModule, FormsModule]
})
export class AddStudentModalComponent {
  studentId: number | null = null;
  constructor(private modalCtrl: ModalController) {}
  dismiss() { this.modalCtrl.dismiss(); }
  submit() {
    if (this.studentId) {
      this.modalCtrl.dismiss({ studentId: this.studentId });
    }
  }
}
