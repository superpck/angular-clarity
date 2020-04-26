import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MainService {
  token = sessionStorage.getItem('token');
  jwtHelper: JwtHelperService = new JwtHelperService();

  constructor(private http: HttpClient) { }

  getIP() {
    return this.http.get(`https://api.ipify.org?format=json`)
      .toPromise()
      .then(result => result)
      .catch(error => error);
  }

  getUser() {
    // return this.http.get(`${this.url}/get-annouce/${month}/${year}`)
    return this.http.get(`https://randomuser.me/api/?results=100`)
      .toPromise()
      .then(result => result)
      .catch(error => error);
  }

  getUserTest() {
    return this.http.get(`https://randomuser.me/api/?results=100`)
      .toPromise()
      .then(result => result)
      .catch(error => error);
  }

}
