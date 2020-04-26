import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'thaiDateAbbr'
})
export class ThaiDateAbbrPipe implements PipeTransform {
  thMonthAbbr = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  transform(value: any, args?: any): any {
    if (moment(value, 'YYYY-MM-DD').isValid()) {
      const thaiDate = `${moment(value).get('date')} ${this.thMonthAbbr[moment(value).get('month')]} ${moment(value).get('year') + 543}`;
      return thaiDate;
    } else {
      return '-';
    }
  }

}
