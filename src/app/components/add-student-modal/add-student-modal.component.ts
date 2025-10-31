import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ModalController, IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-add-student-modal',
  templateUrl: './add-student-modal.component.html',
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class AddStudentModalComponent {
  studentId: number | null = null;
  student: any = null;
  firstName: string = '';
  lastName: string = '';
  bday: string = '';
  loading = false;
  error: string | null = null;
  constructor(private modalCtrl: ModalController) { }
  dismiss() { this.modalCtrl.dismiss(); }

  submit() {
    this.modalCtrl.dismiss({
      student_id: this.studentId,
      first_name: this.firstName,
      last_name: this.lastName,
      birthdate: this.bday
    });
  }
}
