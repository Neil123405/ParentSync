import { Component, OnInit } from '@angular/core';
import { ApiService, ParentProfile } from '../services/api.service';

@Component({
  selector: 'app-all-forms',
  templateUrl: './all-forms.page.html',
  styleUrls: ['./all-forms.page.scss'],
  standalone: false,
})
export class AllFormsPage implements OnInit {
  parent: ParentProfile | null = null;
  laravelChildren: any[] = [];
  allConsentForms: any[] = [];
  loading = true;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.parent = this.apiService.getCurrentProfile();
    if (this.parent) {
      this.apiService.getParentChildren(this.parent.parent_id).subscribe({
        next: (response) => {
          this.laravelChildren = response.children || [];
          this.loadAllConsentForms();
        }
      });
    }
  }

  loadAllConsentForms() {
    this.allConsentForms = [];
    let loaded = 0;
    if (this.laravelChildren.length === 0) {
      this.loading = false;
      return;
    }
    this.laravelChildren.forEach(child => {
      this.apiService.getUnsignedConsentFormsForStudent(child.student_id).subscribe(res => {
        if (res.forms) {
          // Only push unsigned forms
          this.allConsentForms.push(...res.forms.map((f: any) => ({ ...f, student: child })));
        }
        loaded++;
        if (loaded === this.laravelChildren.length) {
          this.loading = false;
        }
      });
    });
  }
}
