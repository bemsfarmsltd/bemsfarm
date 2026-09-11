import { Link } from 'react-router-dom'

export default function SuppliersList() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Suppliers List</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
                  <li className="breadcrumb-item active">Suppliers List</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
                  <div className="position-relative">
                      <input type="text" id="lostItemSearch" className="form-control ps-10" placeholder="Search Suppliers..." />
                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                      <div id="spplierStatus" className="w-44"></div>
                      <div className="dropdown">
                          <button type="button" className="btn btn-outline-light border" data-bs-toggle="dropdown" aria-expanded="false"><i data-lucide="arrow-down-to-line" className="size-4 me-1"></i>Export As</button>
                          <ul className="dropdown-menu dropdown-menu-end">
                              <li><a className="dropdown-item" href="#" id="exportPrint">Print PDF</a></li>
                              <li><a className="dropdown-item" href="#" id="exportJSON">Export CSV</a></li>
                              <li><a className="dropdown-item" href="#" id="exportXML">Export XML</a></li>
                          </ul>
                      </div>
                      <a href="apps-suppliers-add.html" className="btn btn-primary"><i data-lucide="plus" className="size-4 me-1"></i>Add Supplier</a>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table table-striped-even text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSuppliers" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Supplier ID</th>
                                  <th className="fw-medium text-muted">Supplier</th>
                                  <th className="fw-medium text-muted">Company Name</th>
                                  <th className="fw-medium text-muted">Total Purchase</th>
                                  <th className="fw-medium text-muted">Contact</th>
                                  <th className="fw-medium text-muted">Email</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Country</th>
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
                                  <td><a href="#" className="link link-custom-primary">#SUP-0001</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Sunrise Wholesale</a>
                                      </div>
                                  </td>
                                  <td>Sunrise Wholesale</td>
                                  <td>$42,380.00</td>
                                  <td>+1 889 456 1230</td>
                                  <td><a href="#" className="text-reset">accounts@sunrise.com</a></td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>United States</td>
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
                                  <td><a href="#" className="link link-custom-primary">#SUP-0002</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Fresh Valley Traders</a>
                                      </div>
                                  </td>
                                  <td>Fresh Valley Traders</td>
                                  <td>$18,920.00</td>
                                  <td>+1 778 904 5512</td>
                                  <td><a href="#" className="text-reset">sales@freshvalley.com</a></td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>United States</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0003</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Global Foods Ltd.</a>
                                      </div>
                                  </td>
                                  <td>Global Foods Ltd.</td>
                                  <td>$30,500.00</td>
                                  <td>+1 901 234 5678</td>
                                  <td><a href="#" className="text-reset">info@globalfoods.com</a></td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>United Kingdom</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0004</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">EcoMart Suppliers</a>
                                      </div>
                                  </td>
                                  <td>EcoMart Suppliers</td>
                                  <td>$25,700.00</td>
                                  <td>+1 832 555 9988</td>
                                  <td><a href="#" className="text-reset">contact@ecomart.com</a></td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>Canada</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0005</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">FreshMart Co.</a>
                                      </div>
                                  </td>
                                  <td>FreshMart Co.</td>
                                  <td>$12,800.00</td>
                                  <td>+1 775 444 3322</td>
                                  <td><a href="#" className="text-reset">sales@freshmart.com</a></td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>Australia</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0006</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-11-bzS6tHsV.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">GreenLeaf Traders</a>
                                      </div>
                                  </td>
                                  <td>GreenLeaf Traders</td>
                                  <td>$8,450.00</td>
                                  <td>+1 712 333 4455</td>
                                  <td><a href="#" className="text-reset">info@greenleaf.com</a></td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>United States</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0007</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-12-CfsiEgBV.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Oceanic Suppliers</a>
                                      </div>
                                  </td>
                                  <td>Oceanic Suppliers</td>
                                  <td>$21,900.00</td>
                                  <td>+1 654 789 2233</td>
                                  <td><a href="#" className="text-reset">info@oceanic.com</a></td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>New Zealand</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0008</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-13-NgroKY8u.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">GreenFields Co.</a>
                                      </div>
                                  </td>
                                  <td>GreenFields Co.</td>
                                  <td>$15,600.00</td>
                                  <td>+1 712 555 9901</td>
                                  <td><a href="#" className="text-reset">contact@greenfields.com</a></td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>United States</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0009</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-14-BWimhkHc.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Harvest Traders</a>
                                      </div>
                                  </td>
                                  <td>Harvest Traders</td>
                                  <td>$9,750.00</td>
                                  <td>+1 701 334 6677</td>
                                  <td><a href="#" className="text-reset">info@harvest.com</a></td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>Canada</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0010</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-15-Bm8xnKEs.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Evergreen Suppliers</a>
                                      </div>
                                  </td>
                                  <td>Evergreen Suppliers</td>
                                  <td>$28,400.00</td>
                                  <td>+1 720 888 1122</td>
                                  <td><a href="#" className="text-reset">sales@evergreen.com</a></td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>United States</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon"><i className="ri-delete-bin-line"></i></button>
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


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs">
                  <div className="modal-content p-7 text-center">
                      <div className="d-flex justify-content-center mb-4">
                          <div className="size-14 bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center size-16">
                              <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                          </div>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Supplier?</h5>
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
