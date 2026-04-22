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
  filter: 'all' | 'signed' | 'unsigned' | 'declined' = 'all';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.loading = true;
    this.apiService.getConsentFormsForStudent(this.studentId).subscribe({
      next: (res) => {
        this.consentForms = res.forms;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  setFilter(filter: 'all' | 'signed' | 'unsigned' | 'declined') {
    this.filter = filter;
  }

  get filteredConsentForms() {
    if (this.filter === 'signed') {
      return this.consentForms.filter(f => f.signed);
    }
    if (this.filter === 'unsigned') {
      return this.consentForms.filter(f => !f.signed);
    }
    if (this.filter === 'declined') 
      return this.consentForms.filter(f => f.declined);
    return this.consentForms;
  }

  openConsentForm(form: any) {
    // Mark form as read immediately
    this.apiService.markConsentFormAsRead(form.form_id, this.studentId).subscribe({
      next: (response) => {
        console.log('✓ Consent form marked as read:', response);
        form.is_read = 1;  // ← Update local object to hide badge
        this.apiService.itemMarkedAsRead$.next({ type: 'form', studentId: this.studentId });
      },
      error: (error) => console.error('❌ Error marking consent form as read:', error)
    });

    this.router.navigate(['/consent-form-detail', form.form_id, this.studentId]);
  }
  onActionButtonClick(form: any, event: Event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();    
    this.openConsentForm(form);
  }

  doRefresh(event: any) {
    this.ngOnInit();
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Or call complete after data is actually loaded
  }
}
