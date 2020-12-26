import { Component, OnInit } from '@angular/core';
import { AlertService } from 'src/app/services/alert.service';
import { ToastrService } from 'ngx-toastr';
import { ExcelService } from './../../../services/excel.service';
import { MainService } from './../../../services/main.service';
import * as moment from 'moment';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  users: any[] = [];
  rowSelected: any = {};
  loading = false;
  modalEdit = false;

  constructor(
    private mainService: MainService,
    private alertService: AlertService,
    private toastr: ToastrService,
    private excel: ExcelService
  ) { }

  ngOnInit() {
    this.getUser();
  }

  async getUser() {
    this.loading = true;
    const result = await this.mainService.getUserTest();
    if (result.results) {
      this.users = result.results;
    }
    this.loading = false;
  }

  onEdit(row) {
    this.rowSelected = row;
    this.modalEdit = true;
  }

  async onDelete(row) {
    const confirmed: any = await this.alertService.confirm('', 'Delete confirm?');
    if (confirmed.value) {
      this.toastr.success('ลบเรียบร้อยแล้ว');
      // ....
    }
  }

  async onSave() {
    const confirmed: any = await this.alertService.confirm('', 'Save confirm?');
    if (confirmed.value) {
      this.toastr.success('บันทึกเรียบร้อยแล้ว');
      // ....
      this.modalEdit = false;
    }
  }

  onExport() {
    this.excel.exportAsExcelFile(this.users, 'user_',
      moment().format('YYYYMMDD_HHmmss'))
  }
}

