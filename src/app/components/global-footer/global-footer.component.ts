import { Component, OnInit } from '@angular/core';

import { Router, NavigationEnd } from '@angular/router';

import { ModalController } from '@ionic/angular';

import { filter } from 'rxjs/operators';

import { MenuController } from '@ionic/angular';

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
  parent: any;

  constructor(
    private router: Router,
    private modalController: ModalController,
    private menu: MenuController
  ) { }

  ngOnInit() {
    // Set initial route and footer visibility, showing footer on all routes except '/login'
    this.currentRoute = this.router.url;
    this.showFooter = !this.currentRoute.startsWith('/login');

    // Listen for route changes, so to show the footer only on specific routes like Home, Dashboard, etc.
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
        this.showFooter = !this.currentRoute.startsWith('/login');
      });
  }

  openAccountMenu(event: Event) {
    this.menu.open('accountMenu');
  }

  closeAccountMenu() {
    this.menu.close('accountMenu');
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.currentRoute === route;
  }

  // async openAccountMenu(ev: Event) {
  //   ev.stopPropagation();
  //   const modal = await this.modalController.create({
  //     component: DashboardMenuModalComponent,
  //     cssClass: 'dashboard-menu-modal'
  //   });
  //   await modal.present();
  //   await modal.onDidDismiss();
  //   // You need to get a reference to HomePage and call loadAnnouncementsAndEvents()
  //   // Or, use an event or shared service to notify HomePage to reload
  // }
}
