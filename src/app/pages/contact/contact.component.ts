import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page-container">
      <h1>Contact Us</h1>
      <div class="content-section">
        <h2>Get in Touch</h2>
        <p>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>

        <form [formGroup]="contactForm" (ngSubmit)="onSubmit()" class="contact-form">
          <div class="form-group">
            <label for="name">Name</label>
            <input
              type="text"
              id="name"
              formControlName="name"
              [class.error]="contactForm.get('name')?.invalid && contactForm.get('name')?.touched"
            >
            <div class="error-message" *ngIf="contactForm.get('name')?.invalid && contactForm.get('name')?.touched">
              Name is required
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              formControlName="email"
              [class.error]="contactForm.get('email')?.invalid && contactForm.get('email')?.touched"
            >
            <div class="error-message" *ngIf="contactForm.get('email')?.invalid && contactForm.get('email')?.touched">
              <span *ngIf="contactForm.get('email')?.errors?.['required']">Email is required</span>
              <span *ngIf="contactForm.get('email')?.errors?.['email']">Please enter a valid email</span>
            </div>
          </div>

          <div class="form-group">
            <label for="message">Message</label>
            <textarea
              id="message"
              formControlName="message"
              rows="5"
              [class.error]="contactForm.get('message')?.invalid && contactForm.get('message')?.touched"
            ></textarea>
            <div class="error-message" *ngIf="contactForm.get('message')?.invalid && contactForm.get('message')?.touched">
              Message is required
            </div>
          </div>

          <button type="submit" [disabled]="contactForm.invalid" class="submit-btn">
            Send Message
          </button>
        </form>
      </div>
    </div>
  `,
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  contactForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      message: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      console.log('Form submitted:', this.contactForm.value);
      // Here you would typically send the form data to a service
      alert('Thank you for your message! We will get back to you soon.');
      this.contactForm.reset();
    }
  }
}
