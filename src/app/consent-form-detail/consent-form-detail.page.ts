import { Component, OnInit } from '@angular/core';

import { ActivatedRoute } from '@angular/router';

import { ApiService } from '../services/api.service';

import { AlertController } from '@ionic/angular';

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
  signatureImage: string | null = null;
  declined = false;
  showSignaturePad = false;
  isLoading = false;

  
  signaturePadOptions: Object = {
    minWidth: 1,
    canvasWidth: 300,
    canvasHeight: 150,
    backgroundColor: '#fff',
    penColor: '#222'
  };

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private alertController: AlertController,
  ) { }

  ngOnInit() {
    this.formId = +this.route.snapshot.paramMap.get('formId')!;
    this.studentId = +this.route.snapshot.paramMap.get('studentId')!;
    this.loadFormDetail();
    // this.apiService.getConsentFormDetail(this.formId, this.studentId).subscribe(res => {
    //   this.form = res.form;
    //   this.alreadySigned = res.alreadySigned;
    //   // Fix: prepend data URL if needed
    //   if (res.signatureImage) {
    //     if (res.signatureImage.startsWith('data:')) {
    //       // Already a data URL
    //       this.signatureImage = res.signatureImage;
    //     } else if (res.signatureImage.startsWith('http')) {
    //       // It's a URL from backend
    //       this.signatureImage = res.signatureImage;
    //     } else {
    //       // Assume it's base64
    //       this.signatureImage = `data:image/png;base64,${res.signatureImage}`;
    //     }
    //   } else {
    //     this.signatureImage = null;
    //   }
    // });
  }

async submitDeclined() {
  const alert = await this.alertController.create({
    header: 'Confirm',
    message: 'Submit without a signature (no consent)?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      {
        text: 'Submit',
        handler: () => {
          this.apiService
            .signConsentForm(this.formId, this.studentId, null, true)
            .subscribe(res => {
              if (res.success) {
                this.declined = true;
                this.alreadySigned = false;
                this.signatureImage = null;
                // Clear cache so next load fetches fresh data
                this.apiService.clearConsentFormCache(this.formId, this.studentId);
                this.loadFormDetail(); // reload status if backend provides it
              }
            });
        }
      }
    ]
  });
  await alert.present();
}

private loadFormDetail() {
  this.isLoading = true;
  this.apiService.getConsentFormDetail(this.formId, this.studentId).subscribe({
    next: (res) => {
      // Process the response (either from cache or fresh API call)
      this.processFormDetail(res);
      this.isLoading = false;
    },
    error: () => {
      this.isLoading = false;
    }
  });
}

private processFormDetail(res: any) {
  this.form = res.form;

  console.log('signature_path:', this.form.signature_path);

  const signature = res.signature;
  const hasSignature = !!(signature?.signed_at || signature?.signature_path);
  const isDeclined = !!signature?.declined;

  this.alreadySigned = hasSignature && !isDeclined;
  this.declined = isDeclined;

  // Debug output
  console.log('signature record:', signature);
  if (res.signatureImage) {
    if (res.signatureImage.startsWith('data:')) {
      // Already a data URL
      this.signatureImage = res.signatureImage;
    } else if (res.signatureImage.startsWith('http')) {
      // It's a URL from backend
      this.signatureImage = res.signatureImage;
    } else {
      // Assume it's base64
      this.signatureImage = `data:image/png;base64,${res.signatureImage}`;
    }
  } else {
    this.signatureImage = null;
  }
}

  // onDrawEnd() {
  //   // Called when signature is finished
  // }

  async submitSignature(signatureData: string) {
    const alert = await this.alertController.create({
      header: 'Confirm Submission',
      message: 'Are you sure you want to submit your signature for this consent form?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit',
          handler: () => {
            this.apiService.signConsentForm(this.formId, this.studentId, signatureData).subscribe(res => {
              if (res.success) {
                this.alreadySigned = true;
                if (res.signatureImage) {
                  if (res.signatureImage.startsWith('data:')) {
                    this.signatureImage = res.signatureImage;
                  } else if (res.signatureImage.startsWith('http')) {
                    this.signatureImage = res.signatureImage;
                  } else {
                    this.signatureImage = `data:image/png;base64,${res.signatureImage}`;
                  }
                } else {
                  this.signatureImage = signatureData;
                }
                // Clear cache so next load fetches fresh data
                this.apiService.clearConsentFormCache(this.formId, this.studentId);
                // Notify that this form was signed
                // this.apiService.consentFormSigned$.next({ formId: this.formId, studentId: this.studentId });
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
