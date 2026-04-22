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
    let filtered = this.consentForms;
    if (this.filter === 'signed') {
      filtered = this.consentForms.filter(f => f.signed);
    } else if (this.filter === 'unsigned') {
      filtered = this.consentForms.filter(f => !f.signed);
    } else if (this.filter === 'declined') {
      filtered = this.consentForms.filter(f => f.declined);
    }
    // Sort by created_at descending (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at ?? a.createdAt ?? 0).getTime();
      const dateB = new Date(b.created_at ?? b.createdAt ?? 0).getTime();
      return dateB - dateA;
    });
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

    // Prefetch consent form detail before navigating
    this.apiService.getConsentFormDetail(form.form_id, this.studentId).subscribe({
      next: () => {
        // Data is cached, now navigate to detail page
        this.router.navigate(['/consent-form-detail', form.form_id, this.studentId]);
      },
      error: (error) => {
        console.error('Error prefetching consent form detail:', error);
        // Still navigate even if prefetch fails, detail page will handle it
        this.router.navigate(['/consent-form-detail', form.form_id, this.studentId]);
      }
    });
  }
  onActionButtonClick(form: any, event: Event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();    
    this.openConsentForm(form);
  }

  doRefresh(event: any) {
    this.apiService.clearConsentFormsCache(this.studentId);
    this.ngOnInit();
    setTimeout(() => {
      event.target.complete();
    }, 1000); // Or call complete after data is actually loaded
  }
}
