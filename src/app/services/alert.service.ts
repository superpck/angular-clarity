import { Injectable } from '@angular/core';
import { default as swal, SweetAlertType, SweetAlertOptions } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  constructor() { }

  error(text = 'เกิดข้อผิดพลาด', title = '') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      type: 'error',
      confirmButtonText: 'ตกลง'
    };
    return swal(option);

  }

  success(text = '', title = 'ดำเนินการเรียบร้อย') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      type: 'success',
      confirmButtonText: 'ตกลง'
    };
    return swal(option);

  }

  serverError(text = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', title = 'เกิดข้อผิดพลาด') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      type: 'error',
      confirmButtonText: 'ตกลง'
    };
    return swal(option);

  }

  confirm(text = 'คุณต้องการดำเนินการนี้ ใช่หรือไม่?', title = 'Are you sure?') {
    const option: SweetAlertOptions = {
      title: title,
      text: this.convertToText(text),
      type: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    };
    return swal(option);
  }

  convertToText (text) {
    if (Array.isArray (text) || (typeof text === 'object')) {
      let txt = (typeof text['error'] === 'string') ? text['error'] : JSON.stringify(text);
      txt = (text['error'] && text['error'].sqlMessage) ? text['error'].sqlMessage : txt;
      txt = (typeof text['code'] === 'string') ? text['code'] : txt;

      const newText = text['error'] ? ('error: ' + text['error']) : JSON.stringify(text);
      return txt;
    } else {
      return text.trim();
    }
  }


}
