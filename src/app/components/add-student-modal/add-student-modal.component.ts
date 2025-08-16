import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { ModalController, IonicModule } from '@ionic/angular';

import { ApiService } from 'src/app/services/api.service'; 

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
  loading = false;
  error: string | null = null;
  constructor(private modalCtrl: ModalController, private apiService: ApiService) {}
  dismiss() { this.modalCtrl.dismiss(); }

  // async onStudentIdChange() {
  //   this.student = null;
  //   this.error = null;
  //   if (this.studentId) {
  //     this.loading = true;
  //     this.apiService.getStudentProfile(this.studentId).subscribe({
  //       next: (profile) => {
  //         this.student = profile;
  //         this.loading = false;
  //       },
  //       error: () => {
  //         this.error = 'Student not found.';
  //         this.loading = false;
  //       }
  //     });
  //   }
  // }

  submit() {
  this.modalCtrl.dismiss({
    student_id: this.studentId
  });
}
}
