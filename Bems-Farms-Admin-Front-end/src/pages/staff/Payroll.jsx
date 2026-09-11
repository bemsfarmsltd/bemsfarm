import { Link } from 'react-router-dom'

export default function Payroll() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Payroll</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Payroll</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <h5 className="card-title mb-0">Payroll</h5>
                  <div className="d-flex flex-wrap gap-2 ">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search payroll..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="staffFilter" className="w-40"></div>
                      <div id="departmentFilter" className="w-44"></div>
                      <div id="statusFilter" className="w-32"></div>
                      <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addPayrollStep1" title="Finance Details"><i data-lucide="plus" className="size-4 me-1"></i>Add Finance</button>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSales" />
                                      </div>
                                  </th>
                                  <th className="text-muted fw-medium">Staff</th>
                                  <th className="text-muted fw-medium">Employee ID</th>
                                  <th className="text-muted fw-medium">Department</th>
                                  <th className="text-muted fw-medium">Pay Day</th>
                                  <th className="text-muted fw-medium">Payment Status</th>
                                  <th className="text-muted fw-medium">Basic Amount</th>
                                  <th className="text-muted fw-medium">Total Amount</th>
                                  <th className="text-muted fw-medium">Action</th>
                              </tr>
                          </thead>
                          <tbody className="accordion" id="payrollAccordion">
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-1-xhBXJtq9.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Alice Johnson</div>
                                              <p className="text-muted fs-sm">Manager</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1021</a></td>
                                  <td>Sales</td>
                                  <td>1 December 2025</td>
                                  <td><span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1"><i className="ri-check-line fs-sm align-middle me-1"></i>Paid</span></td>
                                  <td>$159,45.36</td>
                                  <td>$160,49.36</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll1" aria-expanded="false">View</button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3"><i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download</button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll1" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$3,000</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$300</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$3,450</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8"><i data-lucide="arrow-down-to-line" className="size-4"></i></button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8"><i data-lucide="printer" className="size-4"></i></button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$250</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$120</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$30</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$400</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8"><i data-lucide="arrow-down-to-line" className="size-4"></i></button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8"><i data-lucide="printer" className="size-4"></i></button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$3,050</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Bank Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">31 Dec 2025</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8"><i data-lucide="arrow-down-to-line" className="size-4"></i></button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8"><i data-lucide="printer" className="size-4"></i></button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Robert Smith</div>
                                              <p className="text-muted fs-sm">Senior Accountant</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1045</a></td>
                                  <td>Finance</td>
                                  <td>1 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-warning-subtle bg-warning-subtle text-warning rounded px-2 py-1">
                                          <i className="ri-time-line fs-sm align-middle me-1"></i>Pending
                                      </span>
                                  </td>
                                  <td>$128,75.00</td>
                                  <td>$132,40.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll2" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll2" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$2,800</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$350</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$180</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$3,330</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$220</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$140</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$25</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$385</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$2,945</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Bank Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">05 Jan 2026</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Pending</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-3-Bz6g7hsE.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Priya Patel</div>
                                              <p className="text-muted fs-sm">HR Executive</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1072</a></td>
                                  <td>Human Resources</td>
                                  <td>1 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$98,20.00</td>
                                  <td>$101,75.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll3" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll3" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$2,200</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$280</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$120</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$2,600</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$160</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$110</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$20</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$290</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$2,310</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">UPI Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">02 Dec 2025</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-4-7l52E1Lo.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Rajesh Kumar</div>
                                              <p className="text-muted fs-sm">Finance Manager</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1085</a></td>
                                  <td>Finance</td>
                                  <td>15 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$120,50.00</td>
                                  <td>$123,75.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll4" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll4" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$3,000</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$400</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$3,550</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$250</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$30</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$430</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$3,120</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Bank Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">16 Dec 2025</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Sneha Mehta</div>
                                              <p className="text-muted fs-sm">Marketing Lead</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1098</a></td>
                                  <td>Marketing</td>
                                  <td>22 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$110,00.00</td>
                                  <td>$112,50.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll5" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll5" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$2,500</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$350</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$130</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$2,980</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$180</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$120</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$25</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$325</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$2,655</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Cheque</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">23 Dec 2025</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Amit Shah</div>
                                              <p className="text-muted fs-sm">IT Specialist</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1104</a></td>
                                  <td>IT Department</td>
                                  <td>28 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$105,75.00</td>
                                  <td>$108,20.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll6" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll6" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$2,300</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$300</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$100</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$2,700</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$200</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$120</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$25</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$345</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$2,355</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">UPI Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">29 Dec 2025</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Neha Joshi</div>
                                              <p className="text-muted fs-sm">Content Writer</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1112</a></td>
                                  <td>Content Team</td>
                                  <td>30 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-warning-subtle bg-warning-subtle text-warning rounded px-2 py-1">
                                          <i className="ri-time-line fs-sm align-middle me-1"></i>Pending
                                      </span>
                                  </td>
                                  <td>$95,00.00</td>
                                  <td>$97,50.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll7" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll7" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$1,800</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$250</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$100</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$2,150</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$140</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$90</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$15</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$245</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$1,905</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Pending</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">--</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Pending</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-8-BAGm131G.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Karan Verma</div>
                                              <p className="text-muted fs-sm">Operations Manager</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1120</a></td>
                                  <td>Operations</td>
                                  <td>31 December 2025</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$125,00.00</td>
                                  <td>$128,50.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll8" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll8" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$3,200</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$400</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$3,750</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$300</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$20</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$470</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$3,280</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Bank Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">01 Jan 2026</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>

                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Ritika Singh</div>
                                              <p className="text-muted fs-sm">Sales Executive</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1128</a></td>
                                  <td>Sales</td>
                                  <td>05 January 2026</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$98,50.00</td>
                                  <td>$101,00.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll9" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll9" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$2,000</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$300</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$100</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$2,400</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$100</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$20</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$270</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$2,130</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Bank Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">06 Jan 2026</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-10-CzpspsdB.png" className="img-fluid size-9 rounded-1" alt="Avatar" />
                                          <div>
                                              <div className="fw-medium">Vikram Desai</div>
                                              <p className="text-muted fs-sm">Finance Analyst</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">EMP-1135</a></td>
                                  <td>Finance</td>
                                  <td>08 January 2026</td>
                                  <td>
                                      <span className="fs-12 fw-medium border border-success-subtle bg-success-subtle text-success rounded px-2 py-1">
                                          <i className="ri-check-line fs-sm align-middle me-1"></i>Paid
                                      </span>
                                  </td>
                                  <td>$115,00.00</td>
                                  <td>$118,50.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2 w-auto">
                                          <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 view-btn" type="button" data-bs-toggle="collapse" data-bs-target="#payroll10" aria-expanded="false">
                                              View
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary fs-sm py-1 h-8 delete-btn px-3">
                                              <i data-lucide="arrow-down-to-line" className="size-3 me-1"></i>Download
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="payroll10" className="accordion-collapse collapse" data-bs-parent="#payrollAccordion">
                                          <div className="accordion-body">
                                              <table className="table align-middle table-borderless mb-0">
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Salary Breakdown :</td>
                                                      <td><span className="text-muted">Basic Salary: <span className="text-body fw-medium ms-1">$2,800</span></span></td>
                                                      <td><span className="text-muted">House Allowance: <span className="text-body fw-medium ms-1">$400</span></span></td>
                                                      <td><span className="text-muted">Transport Allowance: <span className="text-body fw-medium ms-1">$150</span></span></td>
                                                      <td><span className="text-muted">Gross Salary: <span className="text-body fw-medium ms-1">$3,350</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Deductions :</td>
                                                      <td><span className="text-muted">Tax: <span className="text-body fw-medium ms-1">$250</span></span></td>
                                                      <td><span className="text-muted">PF Contribution: <span className="text-body fw-medium ms-1">$130</span></span></td>
                                                      <td><span className="text-muted">Late Penalty: <span className="text-body fw-medium ms-1">$30</span></span></td>
                                                      <td><span className="text-muted">Total Deduction: <span className="text-body fw-medium ms-1">$410</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                                  <tr>
                                                      <td className="w-12"></td>
                                                      <td className="w-96 fw-semibold">Payment Info :</td>
                                                      <td><span className="text-muted">Net Pay: <span className="text-body fw-medium ms-1">$2,940</span></span></td>
                                                      <td><span className="text-muted">Method: <span className="text-body fw-medium ms-1">Bank Transfer</span></span></td>
                                                      <td><span className="text-muted">Date: <span className="text-body fw-medium ms-1">09 Jan 2026</span></span></td>
                                                      <td><span className="text-muted">Status: <span className="text-body fw-medium ms-1">Paid</span></span></td>
                                                      <td>
                                                          <div className="d-flex">
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="arrow-down-to-line" className="size-4"></i>
                                                              </button>
                                                              <button type="button" className="btn btn-active-dark text-muted btn-icon size-8">
                                                                  <i data-lucide="printer" className="size-4"></i>
                                                              </button>
                                                          </div>
                                                      </td>
                                                  </tr>
                                              </table>
                                          </div>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">25</b> Results</p>
                      </div>
                      <div className="col-md-6">
                          <nav aria-label="Page navigation example">
                              <ul className="pagination justify-content-center justify-content-md-end mb-0 products-pagination">
                                  <li className="page-item disabled"><a className="page-link" href="#"><i data-lucide="chevron-left" className="size-4"></i>Previous</a></li>
                                  <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                  <li className="page-item"><a className="page-link" href="#">2</a></li>
                                  <li className="page-item"><a className="page-link" href="#">3</a></li>
                                  <li className="page-item"><a className="page-link" href="#">Next<i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addPayrollStep1" tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Payroll – Employee Info</h6>
                          <button className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <div className="row g-5">
                              <div className="col-12">
                                  <label className="form-label" htmlFor="staffName">Staff Image & Name</label>
                                  <div className="d-flex align-items-center gap-2">
                                      <input type="file" className="filepond size-10 mb-0 flex-shrink-0" id="squareUpload" name="filepond" accept="image/png, image/jpeg, image/gif" />
                                      <input type="text" id="staffName" className="form-control" placeholder="e.g. Sales Manager" required />
                                  </div>
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="employeeId">Employee ID</label>
                                  <input type="text" id="employeeId" className="form-control" placeholder="EMP-1021" readOnly />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="role">Role</label>
                                  <input type="text" id="role" className="form-control" placeholder="Manager" />
                              </div>
                              <div className="col-12">
                                  <label className="form-label" htmlFor="department">Department</label>
                                  <input type="text" id="department" className="form-control" placeholder="Sales" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="payrollMonth">Payroll Day</label>
                                  <input type="text" className="form-control" data-datepicker data-date-format="yyyy-MM-dd" placeholder="Choose date" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="paymentStatus">Payment Status</label>
                                  <div id="statusFilter"></div>
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="netAmount">Basic Amount</label>
                                  <input type="text" id="netAmount" className="form-control" placeholder="$0.00" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="netAmount">Total Amount</label>
                                  <input type="text" id="netAmount" className="form-control" placeholder="$0.00" />
                              </div>
                          </div>
                          <div className="d-flex gap-3 mt-7">
                              <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                              <button type="button" className="btn btn-primary w-50" data-bs-toggle="modal" data-bs-target="#addPayrollStep2" data-bs-dismiss="modal">Next</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addPayrollStep2" tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Payroll – Salary Details</h6>
                          <button className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <div className="row g-5">
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="basicSalary">Basic Salary</label>
                                  <input type="text" id="basicSalary" className="form-control" placeholder="e.g. 3000" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="houseAllowance">House Allowance</label>
                                  <input type="text" id="houseAllowance" className="form-control" placeholder="e.g. 300" />
                              </div>
                              <div className="col-md-5">
                                  <label className="form-label" htmlFor="transportAllowance">Transport Allowance</label>
                                  <input type="text" id="transportAllowance" className="form-control" placeholder="e.g. 150" />
                              </div>
                              <div className="col-md-4">
                                  <label className="form-label" htmlFor="grossSalary">Gross Salary</label>
                                  <input type="text" id="grossSalary" className="form-control" placeholder="Auto" />
                              </div>
                              <div className="col-md-3">
                                  <label className="form-label" htmlFor="tax">Tax</label>
                                  <input type="text" id="tax" className="form-control" placeholder="e.g. 250" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="pfContribution">PF Contribution</label>
                                  <input type="text" id="pfContribution" className="form-control" placeholder="e.g. 120" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="latePenalty">Late Penalty</label>
                                  <input type="text" id="latePenalty" className="form-control" placeholder="e.g. 30" />
                              </div>
                              <div className="col-md-5">
                                  <label className="form-label" htmlFor="totalDeduction">Total Deduction</label>
                                  <input type="text" id="totalDeduction" className="form-control" placeholder="Auto calculated" />
                              </div>
                              <div className="col-md-7">
                                  <label className="form-label" htmlFor="netPay">Net Pay</label>
                                  <input type="text" id="netPay" className="form-control" placeholder="Final payable amount" />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="paymentMethod">Payment Method</label>
                                  <div id="paymentMethod"></div>
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label" htmlFor="paymentDate">Payment Date</label>
                                  <input type="text" id="paymentDate" className="form-control" data-datepicker data-date-format="yyyy-MM-dd" placeholder="Choose date" />
                              </div>
                              <div className="col-md-12">
                                  <label className="form-label" htmlFor="statusFilter">Status</label>
                                  <div id="statusFilter"></div>
                              </div>
                          </div>
                          <div className="d-flex gap-3 mt-7">
                              <button type="button" className="btn btn-light w-50" data-bs-toggle="modal" data-bs-target="#addPayrollStep1" data-bs-dismiss="modal">Back</button>
                              <button type="submit" className="btn btn-primary w-50" data-bs-dismiss="modal">Save Payroll</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
