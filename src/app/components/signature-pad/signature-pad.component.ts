import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-pad',
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss'],
  standalone: false,
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @Output() signature = new EventEmitter<string>();

  private signaturePad!: SignaturePad;

  ngAfterViewInit() {
    this.signaturePad = new SignaturePad(this.canvasRef.nativeElement, {
      backgroundColor: '#fff',
      penColor: '#222',
      minWidth: 1,
    });
  }

  clear() {
    this.signaturePad.clear();
  }

  emitSignature() {
    if (this.signaturePad.isEmpty()) {
      alert('Please provide a signature.');
      return;
    }
    const dataUrl = this.signaturePad.toDataURL();
    this.signature.emit(dataUrl); // This emits a string
    this.clear();
  }
}
