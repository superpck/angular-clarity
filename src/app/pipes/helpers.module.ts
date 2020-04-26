import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThaiDateAbbrPipe } from './thai-date-abbr.pipe';
import { ThaiDateFullPipe } from './thai-date-full.pipe';
import { ThaiDatePipe } from './thai-date.pipe';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    ThaiDatePipe,
    ThaiDateAbbrPipe,
    ThaiDateFullPipe
  ],
  exports: [
    ThaiDatePipe,
    ThaiDateAbbrPipe,
    ThaiDateFullPipe
  ]
})
export class HelperModule { }
