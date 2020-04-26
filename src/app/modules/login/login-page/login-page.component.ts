import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss']
})
export class LoginPageComponent implements OnInit {
  username = 'admin';
  password = '';
  isError = false;

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
  }

  onLogin() {
    // tslint:disable-next-line:max-line-length
    sessionStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjEsIm5hbWUiOiJKb2huIERvZSIsImxldmVsIjoyLCJpYXQiOjE1MzYyMzkwMjJ9.DEY5VNuDqMBcoNdis1asgHwHV5opwqF0C1sPXsB0DeY');
    this.router.navigate(['main']);
  }
}
