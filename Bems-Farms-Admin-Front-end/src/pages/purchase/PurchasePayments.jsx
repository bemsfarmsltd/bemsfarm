import { Link } from 'react-router-dom'

export default function PurchasePayments() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Payments</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Purchase</a></li>
                  <li className="breadcrumb-item active">Payments</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
                      <h5 className="card-title mb-1">Payments</h5>
                      <div className="d-flex flex-wrap gap-2">
                          <div className="position-relative">
                              <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search payments..." />
                              <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                          <div id="filterPaymentStatus" className="w-44"></div>
                          <div id="filterPaymentMethod" className="w-44"></div>
                          <div className="position-relative flex-shrink-0 w-48">
                              <input type="text" id="filterDate" className="form-control ps-10" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                              <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                          <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addPaymentModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Payments</button>
                          <div className="dropdown">
                              <button type="button" className="btn btn-light btn-icon" data-bs-toggle="dropdown" aria-expanded="false"><i data-lucide="ellipsis-vertical" className="size-4"></i></button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                  <li><a className="dropdown-item" href="#" id="exportPrint"><i data-lucide="printer" className="size-4 me-2"></i>Print PDF</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportJSON"><i data-lucide="file-text" className="size-4 me-2"></i>Export CSV</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportXML"><i data-lucide="file-spreadsheet" className="size-4 me-2"></i>Export XML</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportZIP"> <i data-lucide="folder" className="size-4 me-2"></i>Export ZIP</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportPaymentStatement"><i data-lucide="file-bar-chart-2" className="size-4 me-2"></i>Statement</a></li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllPurchases" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Purchase ID</th>
                                  <th className="fw-medium text-muted">Supplier</th>
                                  <th className="fw-medium text-muted">Total</th>
                                  <th className="fw-medium text-muted">Paid</th>
                                  <th className="fw-medium text-muted">Due</th>
                                  <th className="fw-medium text-muted">Payment Method</th>
                                  <th className="fw-medium text-muted">Payment Status</th>
                                  <th className="fw-medium text-muted">Last Payment</th>
                                  <th className="fw-medium text-muted">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0001</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Sunrise Wholesale</a>
                                              <a href="#" className="link link-custom-primary">sunrise@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$42,380.00</td>
                                  <td>$30,000.00</td>
                                  <td>$12,380.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/mastercard-CH_EB252.png" alt="Visa" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **18</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Partial</span></td>
                                  <td>21 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0002</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-3-Bz6g7hsE.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Global Trade Co.</a>
                                              <a href="#" className="link link-custom-primary">globaltrade@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$18,750.00</td>
                                  <td>$18,750.00</td>
                                  <td>$0.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/visa-Xmp1xRly.png" alt="Visa" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **50</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                  <td>22 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0003</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Metro Supplies</a>
                                              <a href="#" className="link link-custom-primary">metro@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$26,420.00</td>
                                  <td>$10,000.00</td>
                                  <td>$16,420.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/mastercard-CH_EB252.png" alt="Mastercard" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **99</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Partial</span></td>
                                  <td>20 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0004</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Elite Distributors</a>
                                              <a href="#" className="link link-custom-primary">elite@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$9,850.00</td>
                                  <td>$0.00</td>
                                  <td>$9,850.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/visa-Xmp1xRly.png" alt="Visa" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **28</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Unpaid</span></td>
                                  <td>18 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0005</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Bright Star Traders</a>
                                              <a href="#" className="link link-custom-primary">brightstar@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$14,600.00</td>
                                  <td>$14,600.00</td>
                                  <td>$0.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/visa-Xmp1xRly.png" alt="Mastercard" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **14</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                  <td>24 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0006</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Nova Importers</a>
                                              <a href="#" className="link link-custom-primary">nova@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$33,250.00</td>
                                  <td>$20,000.00</td>
                                  <td>$13,250.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/visa-Xmp1xRly.png" alt="Visa" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **80</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Partial</span></td>
                                  <td>23 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0007</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Urban Wholesale</a>
                                              <a href="#" className="link link-custom-primary">urban@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$7,920.00</td>
                                  <td>$0.00</td>
                                  <td>$7,920.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/mastercard-CH_EB252.png" alt="Mastercard" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **96</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Unpaid</span></td>
                                  <td>22 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0008</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-4-7l52E1Lo.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Prime Stock House</a>
                                              <a href="#" className="link link-custom-primary">prime@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$21,480.00</td>
                                  <td>$21,480.00</td>
                                  <td>$0.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/mastercard-CH_EB252.png" alt="Visa" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **28</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                  <td>21 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0009</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-1-xhBXJtq9.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Silverline Exports</a>
                                              <a href="#" className="link link-custom-primary">silverline@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$29,900.00</td>
                                  <td>$15,000.00</td>
                                  <td>$14,900.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/visa-Xmp1xRly.png" alt="Visa" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **32</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Partial</span></td>
                                  <td>25 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0010</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-10 rounded-circle img-fluid" alt="Supplier" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium d-block">Atlas Supply Hub</a>
                                              <a href="#" className="link link-custom-primary">atlas@gmail.com</a>
                                          </div>
                                      </div>
                                  </td>
                                  <td>$11,340.00</td>
                                  <td>$11,340.00</td>
                                  <td>$0.00</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/mastercard-CH_EB252.png" alt="Mastercard" className="h-7 p-6px border rounded" />
                                          <span className="fw-medium">Ends in **** **61</span>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                  <td>26 Dec, 2025</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">16</b> Results</p>
                      </div>
                      <div className="col-md-6">
                          <nav aria-label="Page navigation example">
                              <ul className="pagination justify-content-center justify-content-md-end mb-0 products-pagination">
                                  <li className="page-item disabled"><a className="page-link" href="#"><i data-lucide="chevron-left" className="size-4"></i>Previous</a></li>
                                  <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                  <li className="page-item"><a className="page-link" href="#">2</a></li>
                                  <li className="page-item"><a className="page-link" href="#">Next<i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addPaymentModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header border-bottom-0 pb-2">
                          <h6 className="modal-title">Add Purchase Payment</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <form id="addPaymentForm">
                              <div className="row g-5">
                                  <div className="col-12">
                                      <ul className="nav nav-pills nav-light gap-3 mb-7" id="paymentMethodTabs" role="tablist">
                                          <li className="nav-item">
                                              <button className="nav-link border text-start w-32 active" data-bs-toggle="pill" data-bs-target="#visa" type="button">
                                                  <img src="../assets/visa-Xmp1xRly.png" alt="Visa" className="h-4 mb-1" />
                                                  <p>Visa</p>
                                              </button>
                                          </li>
                                          <li className="nav-item">
                                              <button className="nav-link border text-start w-32" data-bs-toggle="pill" data-bs-target="#mastercard" type="button">
                                                  <img src="../assets/mastercard-CH_EB252.png" alt="mastercard" className="h-4 mb-1" />
                                                  <p>Mastercard</p>
                                              </button>
                                          </li>
                                      </ul>
                                      <div className="tab-content">
                                          <div className="tab-pane fade show active" id="visa">
                                              <div className="row g-5">
                                                  <div className="col-md-6">
                                                      <label className="form-label" htmlFor="visaCardNumber">Card Number</label>
                                                      <input type="text" className="form-control" id="visaCardNumber" placeholder="XXXX XXXX XXXX 1234" />
                                                  </div>
                                                  <div className="col-md-3">
                                                      <label className="form-label" htmlFor="visaExpiry">Expiry</label>
                                                      <input type="text" className="form-control" id="visaExpiry" placeholder="MM/YY" />
                                                  </div>
                                                  <div className="col-md-3">
                                                      <label className="form-label" htmlFor="visaCvv">Cvv</label>
                                                      <input type="password" className="form-control" id="visaCvv" placeholder="***" />
                                                  </div>
                                                  <div className="col-md-4">
                                                      <label className="form-label" htmlFor="visaAmount">Amount</label>
                                                      <input type="number" className="form-control" id="visaAmount" placeholder="0.00" />
                                                  </div>
                                                  <div className="col-md-4">
                                                      <label className="form-label" htmlFor="visaPaidAmount">Paid Amount</label>
                                                      <input type="number" className="form-control" id="visaPaidAmount" placeholder="0.00" />
                                                  </div>
                                                  <div className="col-md-4">
                                                      <label className="form-label" htmlFor="visaDueAmount">Due Amount</label>
                                                      <input type="number" className="form-control" id="visaDueAmount" placeholder="0.00" />
                                                  </div>
                                                  <div className="col-md-6">
                                                      <label className="form-label" htmlFor="visaTransactionId">Transaction Id</label>
                                                      <input type="text" className="form-control" id="visaTransactionId" placeholder="TXN-000123" />
                                                  </div>
                                                  <div className="col-md-6">
                                                      <label className="form-label" htmlFor="visaPaymentDate">Payment Date</label>
                                                      <input type="text" className="form-control" id="visaPaymentDate" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Payment date" />
                                                  </div>
                                                  <div className="col-12">
                                                      <label className="form-label" htmlFor="visaPaymentNote">Payment Note</label>
                                                      <textarea className="form-control" id="visaPaymentNote" rows="3" placeholder="Optional note..."></textarea>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="tab-pane fade" id="mastercard">
                                              <div className="row g-5">
                                                  <div className="col-md-6">
                                                      <label className="form-label" htmlFor="masterCardNumber">Card Number</label>
                                                      <input type="text" className="form-control" id="masterCardNumber" placeholder="XXXX XXXX XXXX 5678" />
                                                  </div>
                                                  <div className="col-md-3">
                                                      <label className="form-label" htmlFor="masterExpiry">Expiry</label>
                                                      <input type="text" className="form-control" id="masterExpiry" placeholder="MM/YY" />
                                                  </div>
                                                  <div className="col-md-3">
                                                      <label className="form-label" htmlFor="masterCvv">Cvv</label>
                                                      <input type="password" className="form-control" id="masterCvv" placeholder="***" />
                                                  </div>
                                                  <div className="col-md-4">
                                                      <label className="form-label" htmlFor="masterAmount">Amount</label>
                                                      <input type="number" className="form-control" id="masterAmount" placeholder="0.00" />
                                                  </div>
                                                  <div className="col-md-4">
                                                      <label className="form-label" htmlFor="masterPaidAmount">Paid Amount</label>
                                                      <input type="number" className="form-control" id="masterPaidAmount" placeholder="0.00" />
                                                  </div>
                                                  <div className="col-md-4">
                                                      <label className="form-label" htmlFor="masterDueAmount">Due Amount</label>
                                                      <input type="number" className="form-control" id="masterDueAmount" placeholder="0.00" />
                                                  </div>
                                                  <div className="col-md-6">
                                                      <label className="form-label" htmlFor="masterTransactionId">Transaction Id</label>
                                                      <input type="text" className="form-control" id="masterTransactionId" placeholder="TXN-000123" />
                                                  </div>
                                                  <div className="col-md-6">
                                                      <label className="form-label" htmlFor="masterPaymentDate">Payment Date</label>
                                                      <input type="text" className="form-control" id="masterPaymentDate" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Payment date" />
                                                  </div>
                                                  <div className="col-12">
                                                      <label className="form-label" htmlFor="masterPaymentNote">Payment Note</label>
                                                      <textarea className="form-control" id="masterPaymentNote" rows="3" placeholder="Optional note..."></textarea>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-5">
                                  <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                                  <button type="button" className="btn btn-primary w-50" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#addSupplierModal">Next</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>

          <div className="modal fade" id="addSupplierModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="h-24 rounded-top-2 pattern-bg"></div>
                      <div className="modal-body">
                          <form id="addSupplierForm">
                              <input type="hidden" id="stockOutId" />
                              <div className="text-center mb-2">
                                  <label className="avatar border bg-body-secondary size-24 rounded p-3 mt-n20 cursor-pointer position-relative d-inline-block overflow-hidden" htmlFor="customerLogoInput" id="logoPreviewLabel">
                                      <img id="customerLogoPreview" src="#" className="w-100 h-100 object-fit-cover rounded d-none" />
                                      <div id="uploadIcon" className="d-flex align-items-center justify-content-center w-100 h-100 position-absolute top-0 start-0">
                                          <i className="ri-upload-cloud-2-line fs-2xl text-muted"></i>
                                      </div>
                                      <input type="file" id="customerLogoInput" className="d-none" accept="image/*" />
                                  </label>
                              </div>
                              <div className="row g-5">
                                  <div className="col-12">
                                      <label className="form-label" htmlFor="supplierName">Supplier Name</label>
                                      <input type="text" className="form-control" id="supplierName" placeholder="Enter supplier name" />
                                  </div>
                                  <div className="col-12">
                                      <label className="form-label" htmlFor="supplierEmail">Email</label>
                                      <input type="email" className="form-control" id="supplierEmail" placeholder="Enter email" />
                                  </div>
                                  <div className="col-md-6">
                                      <label className="form-label" htmlFor="purchaseId">Purchase ID</label>
                                      <input type="text" className="form-control" id="purchaseId" placeholder="#PUR-0001" />
                                  </div>
                                  <div className="col-md-6">
                                      <label className="form-label" htmlFor="totalAmount">Total Amount</label>
                                      <input type="number" className="form-control" id="totalAmount" placeholder="0.00" />
                                  </div>
                                  <div className="col-md-6">
                                      <label className="form-label" htmlFor="paidAmount">Paid Amount</label>
                                      <input type="number" className="form-control" id="paidAmount" placeholder="0.00" />
                                  </div>
                                  <div className="col-md-6">
                                      <label className="form-label" htmlFor="dueAmount">Due Amount</label>
                                      <input type="number" className="form-control" id="dueAmount" placeholder="0.00" />
                                  </div>
                                  <div className="col-12">
                                      <label className="form-label" htmlFor="paymentStatus">Payment Status</label>
                                      <div id="paymentStatus"></div>
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-5">
                                  <button type="button" className="btn btn-light w-50" data-bs-toggle="modal" data-bs-target="#addPaymentModal" data-bs-dismiss="modal">Back</button>
                                  <button type="submit" className="btn btn-primary w-50">Save Payments</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs">
                  <div className="modal-content p-7 text-center">
                      <div className="d-flex justify-content-center mb-4">
                          <div className="size-14 bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center size-16">
                              <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                          </div>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Payment?</h5>
                      <div className="d-flex justify-content-center align-items-center gap-2">
                          <button type="button" className="btn btn-danger" data-bs-dismiss="modal">Delete</button>
                          <button type="button" className="btn btn-link text-reset" data-bs-dismiss="modal">Cancel</button>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
