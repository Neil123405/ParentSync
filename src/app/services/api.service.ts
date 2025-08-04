// src/app/services/api.service.ts
import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, BehaviorSubject, Subject } from 'rxjs';

import { environment } from '../../environments/environment';
// import { Http } from '@capacitor-community/http';
// import { PushNotifications } from '@capacitor/push-notifications';

export interface User {
  user_id: number;
  username: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParentProfile {
  parent_id: number;
  first_name: string;
  last_name: string;
  email: string;
  contactNo: string;
  photo_url?: string; 
  username?: string; 
}

export interface AuthResponse {
  token: string; 
  user: User;
  profile?: ParentProfile;
  message?: string;
}

interface SignConsentResponse {
  success: boolean;
  signatureImage?: string; 
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://192.168.1.7:8000/api';

  // User management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentProfileSubject = new BehaviorSubject<ParentProfile | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public currentProfile$ = this.currentProfileSubject.asObservable();
  public profileUpdated$ = new Subject<void>();
  // consentFormSigned$ = new Subject<{ formId: number, studentId: number }>();

  private fcmToken: string | null = null;

  constructor(private http: HttpClient) {
    // Load stored user data on service initialization
    this.loadStoredUser();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
  }

  // Authentication Methods
  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials, { headers: this.getHeaders() });
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData, { headers: this.getHeaders() });
  }

  // User Management Methods
  setCurrentUser(user: User, profile?: ParentProfile): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);

    if (profile) {
      localStorage.setItem('currentProfile', JSON.stringify(profile));
      this.currentProfileSubject.next(profile);
      // console.log('setCurrentUser: profile set', profile);
    } else {
      // console.log('setCurrentUser: profile is null or undefined');
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentProfile(): ParentProfile | null {
    return this.currentProfileSubject.value;
  }

  logout(): void {
    // Remove FCM token from backend if on device
    if ((window as any).Capacitor?.isNativePlatform && this.fcmToken) {
      this.removePushToken(this.fcmToken).subscribe();
      // {
      //   next: () => console.log('FCM token removed on logout'),
      //   error: (err) => console.error('Failed to remove FCM token on logout:', err)
      // }
    }

    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentProfile');
    this.currentUserSubject.next(null);
    this.currentProfileSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    const storedProfile = localStorage.getItem('currentProfile');

    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser));
    }
    if (storedProfile) {
      this.currentProfileSubject.next(JSON.parse(storedProfile));

      // console.log('loadStoredUser: loaded profile', JSON.parse(storedProfile));
    }
  }

  // Parent APIs
  getParentProfile(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/profile`, { headers: this.getHeaders() });
  }

  getParentChildren(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/children`, { headers: this.getHeaders() });
  }

  updateParentProfile(parentId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/parent/${parentId}/profile`, data, { headers: this.getHeaders() });
  }

  // Announcements
  getParentAnnouncements(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/announcements`, { headers: this.getHeaders() });
  }

  getStudentAnnouncements(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${studentId}/announcements`, { headers: this.getHeaders() });
  }

  getAnnouncementDetail(announcementId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/announcements/${announcementId}`, { headers: this.getHeaders() });
  }

  // Events
  // getParentEvents(parentId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/parent/${parentId}/events`, { headers: this.getHeaders() });
  // }

  getParentEvents(parentId: number, date?: string): Observable<any> {
    const options: any = { headers: this.getHeaders() };
    if (date) {
      options.params = { date };
    }
    return this.http.get(`${this.apiUrl}/parent/${parentId}/events`, options);
  }

  getStudentEvents(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${studentId}/events`, { headers: this.getHeaders() });
  }

  // participateInEvent(eventId: number, studentId: number): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/events/${eventId}/participate`,
  //     { student_id: studentId },
  //     { headers: this.getHeaders() });
  // }

  getEventDetail(eventId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/events/${eventId}`, { headers: this.getHeaders() });
  }

  getAllEvents() {
    return this.http.get<{ events: any[] }>(`${this.apiUrl}/events`, { headers: this.getHeaders() });
  }

  // Attendance
  // getStudentAttendance(studentId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/attendance/student/${studentId}`, { headers: this.getHeaders() });
  // }

  // getAttendanceSummary(studentId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/attendance/student/${studentId}/summary`, { headers: this.getHeaders() });
  // }

  linkStudentToParent(parentId: number, studentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/parent/link-student`, {
      parent_id: parentId,
      student_id: studentId
    }, { headers: this.getHeaders() });
  }

  unlinkStudentFromParent(studentId: number) {
    return this.http.post(`${this.apiUrl}/parent/unlink-student`, { student_id: studentId }, {
      headers: this.getHeaders()
    });
  }

  // Consent Forms
  getConsentFormsForStudent(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/consent-forms/student/${studentId}`, { headers: this.getHeaders() });
  }

  getConsentFormDetail(formId: number, studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/consent-forms/${formId}/student/${studentId}`, { headers: this.getHeaders() });
  }

  signConsentForm(formId: number, studentId: number, signatureData: string): Observable<SignConsentResponse> {
    return this.http.post<SignConsentResponse>(`${this.apiUrl}/consent-forms/${formId}/sign`, {
      student_id: studentId,
      signature: signatureData
    }, { headers: this.getHeaders() });
  }

  getSignedConsentForms(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/consent-forms/student/${studentId}?signed=1`, { headers: this.getHeaders() });
  }

  getUnsignedConsentFormsForStudent(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/consent-forms/student/${studentId}/unsigned`, { headers: this.getHeaders() });
  }

  uploadStudentPhoto(studentId: number, base64Image: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/student/${studentId}/upload-photo`,
      { image: base64Image },
      { headers: this.getHeaders() }
    );
  }

  uploadParentPhoto(base64: string) {
    return this.http.post(`${this.apiUrl}/parent/upload-photo`, { photo: base64 }, { headers: this.getHeaders() });
  }

  updateParentAccount(parentId: number, data: { first_name: string; last_name: string; email: string; contactNo: string }) {
    return this.http.put(`${this.apiUrl}/parent/${parentId}/profile`, data, { headers: this.getHeaders() });
  }

  // getParentEventsByDate(parentId: number, date: string) {
  //   return this.http.get<{ events: any[] }>(
  //     `${this.apiUrl}/parent-events-by-date`,
  //     { params: { parent_id: parentId, date } }
  //   );
  // }

  getPendingChildren(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/pending-children`, { headers: this.getHeaders() });
  }

  // getParentEventParticipants(parentId: number) {
  //   return this.http.get<{ eventParticipants: any[] }>(
  //     `${this.apiUrl}/parent/${parentId}/event-participants`,
  //     { headers: this.getHeaders() }
  //   );
  // }

  savePushToken(parentId: number, fcmToken: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/save-fcm-token`,
      { parent_id: parentId, fcm_token: fcmToken },
      { headers: this.getHeaders() }
    );
  }

  removePushToken(fcmToken: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/remove-fcm-token`,
      { fcm_token: fcmToken },
      { headers: this.getHeaders() }
    );
  }

  setFcmToken(token: string) {
    this.fcmToken = token;
  }

  getAllUnsignedConsentFormsForParent(parentId: number): Observable<any> {
    return this.http.get<{ forms: any[] }>(
      `${this.apiUrl}/parent/${parentId}/unsigned-consent-forms`,
      { headers: this.getHeaders() }
    );
  }

}