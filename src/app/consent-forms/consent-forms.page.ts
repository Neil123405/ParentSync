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
  filter: 'all' | 'signed' | 'unsigned' = 'all';

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.apiService.getConsentFormsForStudent(this.studentId).subscribe(res => {
      this.consentForms = res.forms;
    });
  }

  setFilter(filter: 'all' | 'signed' | 'unsigned') {
    this.filter = filter;
  }

  get filteredConsentForms() {
    if (this.filter === 'signed') {
      return this.consentForms.filter(f => f.signed);
    }
    if (this.filter === 'unsigned') {
      return this.consentForms.filter(f => !f.signed);
    }
    return this.consentForms;
  }

  openConsentForm(form: any) {
    this.router.navigate(['/consent-form-detail', form.form_id, this.studentId]);
  }
}
