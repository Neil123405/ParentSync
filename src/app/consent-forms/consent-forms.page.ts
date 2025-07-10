import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-consent-forms',
  templateUrl: './consent-forms.page.html',
  styleUrls: ['./consent-forms.page.scss'],
  standalone: false,
})
export class ConsentFormsPage implements OnInit {
  studentId!: number;
  consentForms: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.apiService.getConsentFormsForStudent(this.studentId).subscribe(res => {
      console.log('Consent forms API response:', res);
      this.consentForms = res.forms;
    });
  }

  openConsentForm(form: any) {
    console.log('Navigating to detail for form:', form.form_id, 'student:', this.studentId);
    this.router.navigate(['/consent-form-detail', form.form_id, this.studentId]);
  }
}
