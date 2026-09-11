import { Link } from 'react-router-dom'

export default function PurchaseReturns() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Returns</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Purchase</a></li>
                  <li className="breadcrumb-item active">Returns</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between mb-5">
                      <h5 className="card-title mb-1">Returns List</h5>
                      <div className="d-flex align-items-center gap-2">
                          <div className="dropdown">
                              <button type="button" className="btn btn-outline-light border" data-bs-toggle="dropdown" aria-expanded="false"><i data-lucide="arrow-down-to-line" className="size-4 me-1"></i>Export As</button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                  <li><a className="dropdown-item" href="#" id="exportPrint">Print PDF</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportJSON">Export CSV</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportXML">Export XML</a></li>
                              </ul>
                          </div>
                          <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addReturnModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Return</button>
                      </div>
                  </div>
                  <div className="d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
                      <div className="position-relative">
                          <input type="text" id="returnSearch" className="form-control ps-10" placeholder="Search Returns..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                          <div className="position-relative flex-shrink-0">
                              <input type="text" className="form-control ps-10" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose Return Date" />
                              <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                          <div id="filterReturnStatus" className="w-52"></div>
                          <div id="filterSupplier" className="w-52"></div>
                          <div id="filterWarehouse" className="w-52"></div>
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
                                          <input className="form-check-input" type="checkbox" id="checkAllReturns" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Return ID</th>
                                  <th className="fw-medium text-muted">Purchase ID</th>
                                  <th className="fw-medium text-muted">Supplier</th>
                                  <th className="fw-medium text-muted">Return Items</th>
                                  <th className="fw-medium text-muted">Return Amount</th>
                                  <th className="fw-medium text-muted">Return Status</th>
                                  <th className="fw-medium text-muted">Created Date</th>
                                  <th className="fw-medium text-muted">Warehouse</th>
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
                                  <td><a href="#">#RET-0001</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0001</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Sunrise Wholesale</span>
                                      </div>
                                  </td>
                                  <td>5 Items</td>
                                  <td>$3,450.00</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>24 Dec, 2025</td>
                                  <td>Secondary Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown" aria-expanded="false">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="apps-products-add.html" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0002</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0003</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Global Traders</span>
                                      </div>
                                  </td>
                                  <td>2 Items</td>
                                  <td>$1,280.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                                          Approved
                                      </span>
                                  </td>
                                  <td>23 Dec, 2025</td>
                                  <td>Main Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0003</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0005</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Oceanic Imports</span>
                                      </div>
                                  </td>
                                  <td>7 Items</td>
                                  <td>$4,750.00</td>
                                  <td>
                                      <span className="badge bg-info-subtle text-info border border-info-subtle">
                                          Refunded
                                      </span>
                                  </td>
                                  <td>22 Dec, 2025</td>
                                  <td>Secondary Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0004</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0007</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Nova Traders</span>
                                      </div>
                                  </td>
                                  <td>3 Items</td>
                                  <td>$2,100.00</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                          Rejected
                                      </span>
                                  </td>
                                  <td>21 Dec, 2025</td>
                                  <td>Main Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0005</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0009</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Aurora Wholesale</span>
                                      </div>
                                  </td>
                                  <td>4 Items</td>
                                  <td>$3,980.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">
                                          Approved
                                      </span>
                                  </td>
                                  <td>20 Dec, 2025</td>
                                  <td>Secondary Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0006</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0006</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Evergreen Traders</span>
                                      </div>
                                  </td>
                                  <td>6 Items</td>
                                  <td>$4,320.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Approved</span>
                                  </td>
                                  <td>29 Dec, 2025</td>
                                  <td>Central Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0007</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0007</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Rapid Imports</span>
                                      </div>
                                  </td>
                                  <td>3 Items</td>
                                  <td>$1,150.00</td>
                                  <td>
                                      <span className="badge bg-info-subtle text-info border border-info-subtle">Refunded</span>
                                  </td>
                                  <td>30 Dec, 2025</td>
                                  <td>Secondary Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0008</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0008</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Starline Exports</span>
                                      </div>
                                  </td>
                                  <td>8 Items</td>
                                  <td>$6,780.00</td>
                                  <td>
                                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span>
                                  </td>
                                  <td>31 Dec, 2025</td>
                                  <td>Main Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0009</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0009</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Global Distributors</span>
                                      </div>
                                  </td>
                                  <td>2 Items</td>
                                  <td>$820.00</td>
                                  <td>
                                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span>
                                  </td>
                                  <td>02 Jan, 2026</td>
                                  <td>Central Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#">#RET-0010</a></td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0010</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <span className="fw-medium">Prime Wholesale</span>
                                      </div>
                                  </td>
                                  <td>7 Items</td>
                                  <td>$5,940.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Approved</span>
                                  </td>
                                  <td>03 Jan, 2026</td>
                                  <td>Main Warehouse</td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">24</b> Results</p>
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


          <div className="modal fade" id="addReturnModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Purchase Return</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <form id="addReturnForm">
                              <div className="row g-4">
                                  <div className="col-12">
                                      <label htmlFor="returnId" className="form-label">Return ID <span className="text-danger">*</span></label>
                                      <input type="text" id="returnId" className="form-control" placeholder="#RET-0013" required />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="purchaseId" className="form-label">Purchase ID <span className="text-danger">*</span></label>
                                      <input type="text" id="purchaseId" className="form-control" placeholder="#PUR-0010" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="supplier" className="form-label">Supplier <span className="text-danger">*</span></label>
                                      <input type="text" id="supplier" className="form-control" placeholder="Sunrise Wholesale" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="warehouse" className="form-label">Warehouse <span className="text-danger">*</span></label>
                                      <div id="warehouse"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="returnQuantity" className="form-label">Return Quantity <span className="text-danger">*</span></label>
                                      <input type="number" id="returnQuantity" className="form-control" placeholder="1" min="1" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="returnAmount" className="form-label">Return Amount ($) <span className="text-danger">*</span></label>
                                      <input type="number" id="returnAmount" className="form-control" step="0.01" placeholder="250.00" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="returnStatus" className="form-label">Return Status <span className="text-danger">*</span></label>
                                      <div id="returnStatus"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="returnDate" className="form-label">Return Date <span className="text-danger">*</span></label>
                                      <input type="text" id="returnDate" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose Date" required />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="returnNotes" className="form-label">Return Notes</label>
                                      <textarea id="returnNotes" className="form-control" rows="3" placeholder="Add short return description..."></textarea>
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-4">
                                  <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" className="btn btn-primary w-50">Save Return</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Return?</h5>
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
