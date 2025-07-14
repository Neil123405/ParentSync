import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ModalController } from '@ionic/angular';

import { DashboardMenuModalComponent } from '../dashboard-menu-modal/dashboard-menu-modal.component';

@Component({
  selector: 'app-global-footer',
  templateUrl: './global-footer.component.html',
  styleUrls: ['./global-footer.component.scss'],
  standalone: false
})
export class GlobalFooterComponent implements OnInit {
  currentRoute: string = '';
  showFooter: boolean = true;

  constructor(
    private router: Router,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    // Track current route to highlight active tab
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        
        // Hide footer on login page
        this.showFooter = !['/login', '/'].includes(this.currentRoute);
      });

    // Set initial route
    this.currentRoute = this.router.url;
    this.showFooter = !['/login', '/'].includes(this.currentRoute);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  async openAccountMenu(ev: Event) {
    ev.stopPropagation();
    const modal = await this.modalController.create({
      component: DashboardMenuModalComponent,
      cssClass: 'dashboard-menu-modal'
    });
    await modal.present();
  }
}
