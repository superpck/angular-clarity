import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
  collapsed = true;

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
  }

  onLogout() {
    sessionStorage.clear();
    this.router.navigate(['login']);
  }

}
