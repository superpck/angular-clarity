import { Injectable } from '@angular/core';
import { default as swal, SweetAlertOptions } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  constructor() { }

  error(text = 'เกิดข้อผิดพลาด', title = '') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      icon: 'error',
      confirmButtonText: 'ตกลง'
    };
    return swal.fire(option);

  }

  success(text = '', title = 'ดำเนินการเรียบร้อย') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      icon: 'success',
      confirmButtonText: 'ตกลง'
    };
    return swal.fire(option);

  }

  serverError(text = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', title = 'เกิดข้อผิดพลาด') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      icon: 'error',
      confirmButtonText: 'ตกลง'
    };
    return swal.fire(option);

  }

  confirm(text = 'คุณต้องการดำเนินการนี้ ใช่หรือไม่?', title = 'Are you sure?') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    };
    return swal.fire(option);
  }

  convertToText(text) {
    if (text && text.message) {
      return text.message
    } else if (text && text.error) {
      return text.error
    } else if (text && text.code) {
      return text.code
    } else {
      return text ? JSON.stringify(text) : '';
    }
  }


}
