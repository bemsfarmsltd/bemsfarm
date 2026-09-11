import { Link } from 'react-router-dom'

export default function SalesReport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Sales</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Reports</a></li>
                  <li className="breadcrumb-item active">Sales</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-md-4 col-xxl-2">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between mb-7">
                              <div className="avatar size-10 bg-primary text-white rounded-circle">
                                  <i data-lucide="dollar-sign" className="size-5"></i>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-success" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item">View</a></li>
                                      <li><a className="dropdown-item">Export</a></li>
                                  </ul>
                              </div>
                          </div>
                          <p className="fw-medium mb-4 fs-17">Net Sales</p>
                          <h4 className="mb-4 fs-22">$74,820 <span className="text-success fs-sm fw-medium ms-1">+8.3%</span></h4>
                          <p className="text-muted">After discounts & returns</p>
                      </div>
                  </div>
              </div>
              <div className="col-md-4 col-xxl-2">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between mb-7">
                              <div className="avatar size-10 bg-secondary text-white rounded-circle">
                                  <i data-lucide="check-check" className="size-5"></i>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item">View</a></li>
                                      <li><a className="dropdown-item">Export</a></li>
                                  </ul>
                              </div>
                          </div>
                          <p className="fw-medium mb-4 fs-17">Completed Orders</p>
                          <h4 className="mb-4 fs-22">1,120 <span className="text-success fs-sm fw-medium ms-1">+4.9%</span></h4>
                          <p className="text-muted">Successfully delivered</p>
                      </div>
                  </div>
              </div>
              <div className="col-md-4 col-xxl-2">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between mb-7">
                              <div className="avatar size-10 bg-danger text-white rounded-circle">
                                  <i data-lucide="x" className="size-5"></i>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-danger" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item">View</a></li>
                                      <li><a className="dropdown-item">Export</a></li>
                                  </ul>
                              </div>
                          </div>
                          <p className="fw-medium mb-4 fs-17">Cancelled Orders</p>
                          <h4 className="mb-4 fs-22">125 <span className="text-success fs-sm fw-medium ms-1">+2.1%</span></h4>
                          <p className="text-muted">Order cancellations</p>
                      </div>
                  </div>
              </div>
              <div className="col-md-4 col-xxl-2">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between mb-7">
                              <div className="avatar size-10 bg-warning text-white rounded-circle">
                                  <i data-lucide="percent" className="size-5"></i>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-warning" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item">View</a></li>
                                      <li><a className="dropdown-item">Export</a></li>
                                  </ul>
                              </div>
                          </div>
                          <p className="fw-medium mb-4 fs-17">Discount Given</p>
                          <h4 className="mb-4 fs-22">$4,260 <span className="text-danger fs-sm fw-medium ms-1">-1.4%</span></h4>
                          <p className="text-muted">Total discounts applied</p>
                      </div>
                  </div>
              </div>
              <div className="col-md-4 col-xxl-2">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between mb-7">
                              <div className="avatar size-10 bg-info text-white rounded-circle">
                                  <i data-lucide="receipt-text" className="size-5"></i>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-info" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item">View</a></li>
                                      <li><a className="dropdown-item">Export</a></li>
                                  </ul>
                              </div>
                          </div>
                          <p className="fw-medium mb-4 fs-17">Tax Collected</p>
                          <h4 className="mb-4 fs-22">$6,840 <span className="text-success fs-sm fw-medium ms-1">+3.2%</span></h4>
                          <p className="text-muted">GST / VAT collected</p>
                      </div>
                  </div>
              </div>
              <div className="col-md-4 col-xxl-2">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between mb-7">
                              <div className="avatar size-10 bg-success text-white rounded-circle">
                                  <i data-lucide="store" className="size-5"></i>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-success" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item">View</a></li>
                                      <li><a className="dropdown-item">Export</a></li>
                                  </ul>
                              </div>
                          </div>
                          <p className="fw-medium mb-4 fs-17">Active Stores</p>
                          <h4 className="mb-4 fs-22">18<span className="text-success fs-sm fw-medium ms-1">+2.3%</span></h4>
                          <p className="text-muted">Currently operating outlets</p>
                      </div>
                  </div>
              </div>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="row justify-content-between g-3 g-xxl-0">
                      <div className="col-md-6 col-lg-4 col-xxl-3 position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search invoice, product, customer..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div className="col-xxl-8">
                          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
                              <div className="position-relative flex-shrink-0 w-56">
                                  <input type="text" id="filterDate" className="form-control ps-10" data-datepicker data-timepicker="true" data-time-format="hh:mm AA" data-date-format="dd-MM-yyyy" placeholder="Choose date & time" />
                                  <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                              </div>
                              <div id="salesCategory" className="w-48"></div>
                              <div id="salesPaymentMethod" className="w-36"></div>
                              <div id="salesStatus" className="w-40"></div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table table-borderless text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSales" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Invoice ID</th>
                                  <th className="fw-medium text-muted">Product</th>
                                  <th className="fw-medium text-muted">Customer</th>
                                  <th className="fw-medium text-muted">Date</th>
                                  <th className="fw-medium text-muted">Payment</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Total</th>
                                  <th className="fw-medium text-muted">Qty</th>
                                  <th className="fw-medium text-muted">Action</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0012</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-01-BBWp8t8E.png" loading="lazy" alt="Image" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">iPhone 12 Pro Max</a>
                                              <p className="text-muted d-block fs-sm">Electronics</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-9 rounded img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Emma White</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 11:45 AM</td>
                                  <td>Cash</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                                          Completed
                                      </span>
                                  </td>
                                  <td>$100.00</td>
                                  <td>2</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon" title="View Invoice">
                                              <i className="ri-eye-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" title="Edit Sale">
                                              <i className="ri-edit-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal" title="Delete">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0013</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-02-ClVfz9I5.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Samsung Galaxy S23</a>
                                              <p className="text-muted d-block fs-sm">Electronics</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium d-block">John Carter</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 12:10 PM</td>
                                  <td>UPI</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                                  <td>$899.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0014</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-03-oTTY_McP.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Sony Headphones</a>
                                              <p className="text-muted fs-sm">Accessories</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-3-Bz6g7hsE.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Sophia Lee</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 01:05 PM</td>
                                  <td>Card</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                                  <td>$150.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0015</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-04-DZ4OtBxS.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Apple Watch Series 9</a>
                                              <p className="text-muted fs-sm">Wearables</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-4-7l52E1Lo.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Michael Brown</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 02:20 PM</td>
                                  <td>Cash</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>$399.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0016</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-05-DPzi-ptA.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">HP Pavilion Laptop</a>
                                              <p className="text-muted fs-sm">Computers</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Daniel Smith</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 03:30 PM</td>
                                  <td>Card</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                                  <td>$1,200.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0017</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-06-DdkuSG6a.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Logitech Mouse</a>
                                              <p className="text-muted fs-sm">Accessories</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Olivia Green</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 04:15 PM</td>
                                  <td>UPI</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Cancelled</span></td>
                                  <td>$25.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0018</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-07-9mjzrP7h.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Bluetooth Speaker</a>
                                              <p className="text-muted fs-sm">Audio</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">William Scott</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 05:40 PM</td>
                                  <td>Cash</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                                  <td>$75.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0019</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-08-BXmGY-HZ.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Dell Monitor 27"</a>
                                              <p className="text-muted fs-sm">Computers</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Lucas Martin</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 06:10 PM</td>
                                  <td>Card</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                                  <td>$320.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0020</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-09-CqG2QIp1.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Canon DSLR Camera</a>
                                              <p className="text-muted fs-sm">Photography</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Isabella Moore</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 06:45 PM</td>
                                  <td>UPI</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>$650.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">INV-0021</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 border rounded-1 p-1">
                                              <img src="../assets/img-10-DqnuMbAd.png" className="img-fluid" alt="Image" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Gaming Keyboard</a>
                                              <p className="text-muted fs-sm">Accessories</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-11-bzS6tHsV.png" className="size-9 rounded img-fluid" alt="Image" />
                                          <a href="#" className="text-reset fw-medium">Ethan Wilson</a>
                                      </div>
                                  </td>
                                  <td>24 Dec, 2025 at 07:20 PM</td>
                                  <td>Cash</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                                  <td>$85.00</td>
                                  <td>1</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">23</b> Results</p>
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


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs">
                  <div className="modal-content p-7 text-center">
                      <div className="d-flex justify-content-center mb-4">
                          <div className="size-14 bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center size-16">
                              <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                          </div>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Sales?</h5>
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
