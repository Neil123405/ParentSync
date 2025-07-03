import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, doc, getDoc, addDoc, serverTimestamp} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AlertController } from '@ionic/angular';

interface Student {
  first_name: string;
  last_name: string;
  birthdate: string; 
  grade_level: number;
  section_id: number;
  id?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  // Array to hold selected students
  selectedStudents: Student[] = [];
  
  // Student ID input
  studentIdInput: string = '';
  
  // Error message
  errorMessage: string = '';

  constructor(
    private firestore: Firestore,
    private alertController: AlertController
  ) {}

  ngOnInit() {}

  // Add a student by ID
  async addStudentById() {
    if (!this.studentIdInput) {
      this.errorMessage = 'Please enter a student ID';
      return;
    }
    
    try {
      const studentId = this.studentIdInput.trim();
      const studentDocRef = doc(this.firestore, 'students', this.studentIdInput);
      const studentSnap = await getDoc(studentDocRef);
      
      if (studentSnap.exists()) {
        const studentData = studentSnap.data() as Student;
        studentData.id = studentId;
        this.selectedStudents.push(studentData);
        await this.createParentStudentLink(studentId);
        
        this.studentIdInput = ''; // Clear the input
        this.errorMessage = ''; // Clear any error message
        this.showSuccessAlert(studentData.first_name, studentData.last_name);
      } else {
        this.errorMessage = 'No student found with this ID';
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      this.errorMessage = 'Error fetching student data';
    }
  }

  private async createParentStudentLink(studentId: string) {
    try {
      // Get reference to the parentStudentLinks collection
      const linksCollection = collection(this.firestore, 'parentStudentLinks');
      
      // Add new document with student_id field
      await addDoc(linksCollection, {
        student_id: studentId,
        created_at: serverTimestamp(), // Optional: add a timestamp
        // You can add more fields as needed, like parent_id if available
      });
      
      console.log('Parent-student link created successfully');
    } catch (error) {
      console.error('Error creating parent-student link:', error);
      throw error; // Rethrow to be caught by the calling function
    }
  }

  private async showSuccessAlert(firstName: string, lastName: string) {
    const alert = await this.alertController.create({
      header: 'Student Added',
      message: `${firstName} ${lastName} was added successfully and linked to your account.`,
      buttons: ['OK']
    });
    
    await alert.present();
  }

  // Remove a student from selected list
  removeStudent(index: number) {
    this.selectedStudents.splice(index, 1);
  }
}