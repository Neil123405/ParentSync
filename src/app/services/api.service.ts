// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

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
}

export interface AuthResponse {
  message: string;
  user: User;
  profile?: ParentProfile;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000/api';
  
  // User management
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentProfileSubject = new BehaviorSubject<ParentProfile | null>(null);
  
  public currentUser$ = this.currentUserSubject.asObservable();
  public currentProfile$ = this.currentProfileSubject.asObservable();

  constructor(private http: HttpClient) {
    // Load stored user data on service initialization
    this.loadStoredUser();
  }

  private getHeaders() {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
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
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentProfile(): ParentProfile | null {
    return this.currentProfileSubject.value;
  }

  logout(): void {
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
    return this.http.get(`${this.apiUrl}/announcements/parent/${parentId}`, { headers: this.getHeaders() });
  }

  getStudentAnnouncements(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/announcements/student/${studentId}`, { headers: this.getHeaders() });
  }

  // Events
  getParentEvents(parentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/events/parent/${parentId}`, { headers: this.getHeaders() });
  }

  getStudentEvents(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/events/student/${studentId}`, { headers: this.getHeaders() });
  }

  participateInEvent(eventId: number, studentId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/events/${eventId}/participate`, 
      { student_id: studentId }, 
      { headers: this.getHeaders() });
  }

  // Attendance
  getStudentAttendance(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/attendance/student/${studentId}`, { headers: this.getHeaders() });
  }

  getAttendanceSummary(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/attendance/student/${studentId}/summary`, { headers: this.getHeaders() });
  }
}