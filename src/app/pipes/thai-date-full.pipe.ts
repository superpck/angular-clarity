import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'thaiDateFull'
})
export class ThaiDateFullPipe implements PipeTransform {
  thMonth = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

  transform(value: any, args?: any): any {
    if (moment(value, 'YYYY-MM-DD').isValid()) {
      const thaiDate = `${moment(value).get('date')} ${this.thMonth[moment(value).get('month')]} ${moment(value).get('year') + 543}`;
      return thaiDate;
    } else {
      return '-';
    }
  }

}
