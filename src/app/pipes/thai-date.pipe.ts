import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'thaiDate'
})
export class ThaiDatePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    if (moment(value, 'YYYY-MM-DD').isValid()) {
      const thaiDate = `${moment(value).get('date')}/${moment(value).get('month') + 1}/${moment(value).get('year') + 543}`;
      return thaiDate;
    } else {
      return '-';
    }
  }

}
