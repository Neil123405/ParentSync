import { Injectable } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { tap } from 'rxjs/operators';

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
// environment.apiUrl ||
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://192.168.1.3:8000/api';

  // Cache for consent form details
  private consentFormDetailCache = new Map<string, any>();

  // Caches for list data
  private consentFormsCache = new Map<number, any>();
  private studentEventsCache = new Map<number, any>();
  private studentAnnouncementsCache = new Map<number, any>();

  // User management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentProfileSubject = new BehaviorSubject<ParentProfile | null>(
    null
  );

  public currentUser$ = this.currentUserSubject.asObservable();
  public currentProfile$ = this.currentProfileSubject.asObservable();
  public profileUpdated$ = new Subject<void>();
  public unreadAnnouncementCounts: { [studentId: number]: number } = {};
  public unreadEventCounts: { [studentId: number]: number } = {};
  public unreadConsentFormCounts: { [studentId: number]: number } = {};
  // consentFormSigned$ = new Subject<{ formId: number, studentId: number }>();

  private fcmToken: string | null = null;

  // Broadcast when new announcement received
  announcementReceived$ = new Subject<void>();
  // Add this near the other Subjects
  itemMarkedAsRead$ = new Subject<{ type: 'announcement' | 'event' | 'form', studentId: number }>();

  getDeviceNotificationState(parentId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/parent/${parentId}/device-notification-state`,
      { headers: this.getHeaders() }  // ✅ Wrap in options object
    );
  }

  updateDeviceNotificationState(parentId: number, notified: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/parent/${parentId}/device-notification-state`, { notified: notified }, { headers: this.getHeaders() });
  }

  setUnreadConsentFormCount(studentId: number, value: number) {
    this.unreadConsentFormCounts[studentId] = value;
  }

  markConsentFormAsRead(formId: number, studentId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/student/${studentId}/consent-forms/${formId}/read`,
      {},
      { headers: this.getHeaders() }
    );
  }
  resetNotification$ = new Subject<void>();
  clearAppState() {
    // Clear all Map caches
    this.consentFormDetailCache.clear();
    this.consentFormsCache.clear();
    this.studentEventsCache.clear();
    this.studentAnnouncementsCache.clear();

    // Reset all unread count maps
    this.unreadAnnouncementCounts = {};
    this.unreadEventCounts = {};
    this.unreadConsentFormCounts = {};

    // Reset the Subject to prevent stale subscriptions
    this.announcementReceived$ = new Subject<void>();
    this.resetNotification$.next();
    this.resetNotification$ = new Subject<void>();

    // Also clear BehaviorSubjects
    this.currentUserSubject.next(null);
    this.currentProfileSubject.next(null);
  }

  // Method to trigger the broadcast
  notifyNewAnnouncement() {
    this.announcementReceived$.next();
  }
  setUnreadAnnouncementCount(studentId: number, value: number) {
    this.unreadAnnouncementCounts[studentId] = value;
  }

  // decrementUnreadAnnouncementCount(studentId: number) {
  //   const current = this.unreadAnnouncementCounts[studentId] || 0;
  //   this.unreadAnnouncementCounts[studentId] = Math.max(0, current - 1);
  // }

  setUnreadEventCount(studentId: number, value: number) {
    this.unreadEventCounts[studentId] = value;
  }


  constructor(private http: HttpClient) {
    // Load stored user data on service initialization
    this.loadStoredUser();
  }

  private storeValue(key: string, value: string, remember: boolean) {
    if (remember) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  }

  private getToken(): string | null {
    // Prefer sessionStorage first (non-remembered), then localStorage (remembered)
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  private getHeaders() {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  setToken(token: string, remember: boolean) {
    this.storeValue('token', token, remember);
  }

  // Authentication Methods
  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials, {
      headers: this.getHeaders(),
      withCredentials: true,
    });
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData, {
      headers: this.getHeaders(),
    });
  }

  // User Management Methods
  setCurrentUser(user: User, profile?: ParentProfile, remember: boolean = false): void {
    const storage = remember ? localStorage : sessionStorage;

    storage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);

    if (profile) {
      storage.setItem('currentProfile', JSON.stringify(profile));
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
    // if ((window as any).Capacitor?.isNativePlatform && this.fcmToken) {
    //   this.removePushToken(this.fcmToken).subscribe();
    //   // {
    //   //   next: () => console.log('FCM token removed on logout'),
    //   //   error: (err) => console.error('Failed to remove FCM token on logout:', err)
    //   // }
    // }

    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentProfile');
    sessionStorage.removeItem('currentProfile');
    localStorage.clear();
    sessionStorage.clear();
    this.fcmToken = null;
    this.currentUserSubject.next(null);
    this.currentProfileSubject.next(null);
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  private loadStoredUser(): void {
    const storedUser =
      sessionStorage.getItem('currentUser') ||
      localStorage.getItem('currentUser');
    const storedProfile =
      sessionStorage.getItem('currentProfile') ||
      localStorage.getItem('currentProfile');

    if (storedUser) this.currentUserSubject.next(JSON.parse(storedUser));
    if (storedProfile)
      this.currentProfileSubject.next(JSON.parse(storedProfile));
  }

  // Parent APIs
  getParentProfile(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/profile`, {
      headers: this.getHeaders(),
    });
  }

  getParentChildren(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/children`, {
      headers: this.getHeaders(),
    });
  }

  updateParentProfile(parentId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/parent/${parentId}/profile`, data, {
      headers: this.getHeaders(),
    });
  }

  // Announcements
  getParentAnnouncements(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/announcements`, {
      headers: this.getHeaders(),
    });
  }

  getParentEvents(parentId: number, date?: string): Observable<any> {
    const options: any = { headers: this.getHeaders() };
    if (date) {
      options.params = { date };
    }
    return this.http.get(`${this.apiUrl}/parent/${parentId}/events`, options);
  }

  uploadParentPhoto(base64: string) {
    return this.http.post(
      `${this.apiUrl}/parent/upload-photo`,
      { photo: base64 },
      { headers: this.getHeaders() }
    );
  }

  updateParentAccount(
    parentId: number,
    data: {
      first_name: string;
      last_name: string;
      email: string;
      contactNo: string;
    }
  ) {
    return this.http.put(`${this.apiUrl}/parent/${parentId}/profile`, data, {
      headers: this.getHeaders(),
    });
  }

  getAllUnsignedConsentFormsForParent(
    parentId: number,
    date?: string
  ): Observable<any> {
    let url = `${this.apiUrl}/parent/${parentId}/unsigned-consent-forms`;
    if (date) {
      url += `?date=${date}`;
    }
    return this.http.get<{ forms: any[] }>(url, { headers: this.getHeaders() });
  }

  getStudentAnnouncements(studentId: number): Observable<any> {
    const cached = this.studentAnnouncementsCache.get(studentId);
    if (cached) return of(cached);

    return this.http.get(`${this.apiUrl}/student/${studentId}/announcements`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(res => this.studentAnnouncementsCache.set(studentId, res))
    );
  }

  markAnnouncementAsRead(announcementId: number, studentId: number) {
    return this.http.post(
      `${this.apiUrl}/student/${studentId}/announcements/${announcementId}/read`,
      { student_id: studentId }, // optional if route is authoritative
      { headers: this.getHeaders() }
    );
  }

  markEventAsRead(eventId: number, studentId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/student/${studentId}/events/${eventId}/read`,
      { student_id: studentId },
      { headers: this.getHeaders() }
    );
  }
  getAnnouncementDetail(announcementId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/announcements/${announcementId}`, {
      headers: this.getHeaders(),
    });
  }

  // Events
  // getParentEvents(parentId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/parent/${parentId}/events`, { headers: this.getHeaders() });
  // }

  getStudentEvents(studentId: number): Observable<any> {
    const cached = this.studentEventsCache.get(studentId);
    if (cached) return of(cached);

    return this.http.get(`${this.apiUrl}/student/${studentId}/events`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(res => this.studentEventsCache.set(studentId, res))
    );
  }

  // participateInEvent(eventId: number, studentId: number): Observable<any> {
  //   return this.http.post(`${this.apiUrl}/events/${eventId}/participate`,
  //     { student_id: studentId },
  //     { headers: this.getHeaders() });
  // }

  getEventDetail(eventId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/events/${eventId}`, {
      headers: this.getHeaders(),
    });
  }

  // Consent Forms
  getConsentFormsForStudent(studentId: number): Observable<any> {
    const cached = this.consentFormsCache.get(studentId);
    if (cached) return of(cached);

    return this.http.get(`${this.apiUrl}/consent-forms/student/${studentId}`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(res => this.consentFormsCache.set(studentId, res))
    );
  }

  // Clear caches for list data (called on refresh)
  clearConsentFormsCache(studentId?: number) {
    if (studentId) {
      this.consentFormsCache.delete(studentId);
    } else {
      this.consentFormsCache.clear();
    }
  }

  clearStudentEventsCache(studentId?: number) {
    if (studentId) {
      this.studentEventsCache.delete(studentId);
    } else {
      this.studentEventsCache.clear();
    }
  }

  clearStudentAnnouncementsCache(studentId?: number) {
    if (studentId) {
      this.studentAnnouncementsCache.delete(studentId);
    } else {
      this.studentAnnouncementsCache.clear();
    }
  }

  getConsentFormDetail(formId: number, studentId: number): Observable<any> {
    const cacheKey = `${formId}-${studentId}`;
    const cached = this.consentFormDetailCache.get(cacheKey);

    // If cache exists, return it as observable
    if (cached) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    // Otherwise fetch from API and cache the result
    return new Observable(observer => {
      this.http.get(
        `${this.apiUrl}/consent-forms/${formId}/student/${studentId}`,
        { headers: this.getHeaders() }
      ).subscribe({
        next: (res) => {
          this.consentFormDetailCache.set(cacheKey, res);
          observer.next(res);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  // Clear cache for a specific consent form (called after signing/declining)
  clearConsentFormCache(formId: number, studentId: number) {
    const cacheKey = `${formId}-${studentId}`;
    this.consentFormDetailCache.delete(cacheKey);
  }

  getStudentProfile(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${studentId}/profile`, {
      headers: this.getHeaders(),
    });
  }

  // getAllEvents() {
  //   return this.http.get<{ events: any[] }>(`${this.apiUrl}/events`, { headers: this.getHeaders() });
  // }

  // Attendance
  getStudentAttendance(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${studentId}/attendance`, {
      headers: this.getHeaders(),
    });
  }

  // getAttendanceSummary(studentId: number): Observable<any> {
  //   return this.http.get(`${this.apiUrl}/attendance/student/${studentId}/summary`, { headers: this.getHeaders() });
  // }

  linkStudentToParent(
    parentId: number,
    studentId: number,
    firstName: string,
    lastName: string,
    birthdate: string
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/parent/link-student`,
      {
        parent_id: parentId,
        student_id: studentId,
        first_name: firstName,
        last_name: lastName,
        birthdate: birthdate,
      },
      { headers: this.getHeaders() }
    );
  }

  getStudentMilestones(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/student/${studentId}/milestones`, {
      headers: this.getHeaders(),
    });
  }

  getSectionMilestones(sectionId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/student/section/${sectionId}/milestones`,
      { headers: this.getHeaders() }
    );
  }

  unlinkStudentFromParent(studentId: number) {
    return this.http.post(
      `${this.apiUrl}/parent/unlink-student`,
      { student_id: studentId },
      {
        headers: this.getHeaders(),
      }
    );
  }

  signConsentForm(
    formId: number,
    studentId: number,
    signatureData: string | null,
    declined: boolean = false
  ): Observable<SignConsentResponse> {
    return this.http.post<SignConsentResponse>(
      `${this.apiUrl}/consent-forms/${formId}/sign`,
      {
        student_id: studentId,
        signature: signatureData,
        declined,
      },
      { headers: this.getHeaders() }
    );
  }

  getSignedConsentForms(studentId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/consent-forms/student/${studentId}?signed=1`,
      { headers: this.getHeaders() }
    );
  }

  getUnsignedConsentFormsForStudent(studentId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/consent-forms/student/${studentId}/unsigned`,
      { headers: this.getHeaders() }
    );
  }

  uploadStudentPhoto(studentId: number, base64Image: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/student/${studentId}/upload-photo`,
      { image: base64Image },
      { headers: this.getHeaders() }
    );
  }

  // getParentEventsByDate(parentId: number, date: string) {
  //   return this.http.get<{ events: any[] }>(
  //     `${this.apiUrl}/parent-events-by-date`,
  //     { params: { parent_id: parentId, date } }
  //   );
  // }

  getPendingChildren(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/parent/${parentId}/pending-children`, {
      headers: this.getHeaders(),
    });
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

  public getFcmToken(): string {
    return this.fcmToken ?? '';
  }

  // getAllUnsignedConsentFormsForParent(parentId: number, date?: string): Observable<any> {
  //   return this.http.get<{ forms: any[] }>(
  //     `${this.apiUrl}/parent/${parentId}/unsigned-consent-forms`,
  //     { headers: this.getHeaders() }
  //   );
  // }
}
