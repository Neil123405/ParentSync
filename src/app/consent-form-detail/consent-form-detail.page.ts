import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-consent-form-detail',
  templateUrl: './consent-form-detail.page.html',
  styleUrls: ['./consent-form-detail.page.scss'],
  standalone: false,
})
export class ConsentFormDetailPage implements OnInit {
  formId!: number;
  studentId!: number;
  form: any;
  alreadySigned = false;

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService
  ) {}

  ngOnInit() {
    console.log('ConsentFormDetailPage ngOnInit called');
    this.formId = +this.route.snapshot.paramMap.get('formId')!;
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.apiService.getConsentFormDetail(this.formId, this.studentId).subscribe(res => {
      this.form = res.form;
      this.alreadySigned = res.alreadySigned;
      
    console.log('Consent form detail response:', res);
    });
  }

  signForm() {
    this.apiService.signConsentForm(this.formId, this.studentId).subscribe(res => {
      if (res.success) {
        this.alreadySigned = true;
      }
    });
  }
}
