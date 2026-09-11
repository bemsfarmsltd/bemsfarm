import { Link } from 'react-router-dom'

export default function PurchaseReport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Purchases</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Reports</a></li>
                  <li className="breadcrumb-item active">Purchases</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-lg-6 col-xxl-4">
                  <div className="card card-h-100">
                      <div className="card-body">
                          <div className="d-flex justify-content-between gap-2 mb-8">
                              <h6 className="mb-0">Purchase Overview</h6>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-success" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item" href="#">Weekly</a></li>
                                      <li><a className="dropdown-item" href="#">Monthly</a></li>
                                      <li><a className="dropdown-item" href="#">Yearly</a></li>
                                  </ul>
                              </div>
                          </div>
                          <div className="row g-5 align-items-center">
                              <div className="col-md-6">
                                  <div id="purchaseOverview" dir="ltr"></div>
                              </div>
                              <div className="col-md-6">
                                  <div className="d-flex h-100 flex-column gap-6 ps-6">
                                      <div className="d-flex align-items-center justify-content-between">
                                          <div className="d-flex align-items-center gap-2">
                                              <span className="d-block h-5 w-1 bg-primary rounded-pill"></span>
                                              <h6 className="mb-0">60%</h6>
                                          </div>
                                          <p className="text-muted">Paid Orders</p>
                                      </div>
                                      <div className="d-flex align-items-center justify-content-between">
                                          <div className="d-flex align-items-center gap-2">
                                              <span className="d-block h-5 w-1 bg-secondary rounded-pill"></span>
                                              <h6 className="mb-0">25%</h6>
                                          </div>
                                          <p className="text-muted">Pending Orders</p>
                                      </div>
                                      <div className="d-flex align-items-center justify-content-between">
                                          <div className="d-flex align-items-center gap-2">
                                              <span className="d-block h-5 w-1 bg-success rounded-pill"></span>
                                              <h6 className="mb-0">15%</h6>
                                          </div>
                                          <p className="text-muted">Overdue Orders</p>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-lg-6 col-xxl-4">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex justify-content-between gap-2">
                              <div>
                                  <p className="text-muted mb-2">Overall Purchase Growth Rate in Last 6 Months</p>
                                  <div className="d-flex align-items-center gap-3">
                                      <h4 className="font-base mb-0">$12,459.06</h4>
                                      <span className="bg-success-subtle text-success border border-success-subtle badge"><i data-lucide="trending-up" className="size-3 me-1"></i>5.2%</span>
                                  </div>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-success" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <a className="dropdown-item" href="#">Weekly</a>
                                      <a className="dropdown-item" href="#">Monthly</a>
                                      <a className="dropdown-item" href="#">Yearly</a>
                                  </ul>
                              </div>
                          </div>
                          <div id="purchaseGrowth"></div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-4">
                  <div className="card card-h-100">
                      <div className="card-body">
                          <div className="d-flex justify-content-between gap-2 mb-8">
                              <div>
                                  <h6 className="mb-2">On-time Payments Rate</h6>
                                  <p className="text-muted">Most supplier payments were completed within the agreed payment terms.</p>
                              </div>
                              <div className="dropdown">
                                  <a href="#" className="link link-custom-success" data-bs-toggle="dropdown">
                                      <i className="ri-more-2-fill fs-lg"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end">
                                      <li><a className="dropdown-item" href="#">Weekly</a></li>
                                      <li><a className="dropdown-item" href="#">Monthly</a></li>
                                      <li><a className="dropdown-item" href="#">Yearly</a></li>
                                  </ul>
                              </div>
                          </div>
                          <div className="d-flex justify-content-between gap-2 mb-5">
                              <h4 className="mb-0">90%</h4>
                              <p className="text-muted fs-sm mb-0">
                                  <span className="text-success me-1 fw-medium">
                                      <i data-lucide="arrow-up-right" className="size-4"></i> 8%
                                  </span>
                                  Compared to last month
                              </p>
                          </div>
                          <div className="d-flex gap-1 mb-5">
                              <div className="progress progress-1 flex-shrink-0 paid-progress" role="progressbar">
                                  <div className="progress-bar bg-primary" style={{width: "100%"}}></div>
                              </div>
                              <div className="progress progress-1 flex-shrink-0 due-progress" role="progressbar">
                                  <div className="progress-bar bg-secondary" style={{width: "100%"}}></div>
                              </div>
                              <div className="progress progress-1 flex-shrink-0 unpaid-progress" role="progressbar">
                                  <div className="progress-bar bg-success" style={{width: "100%"}}></div>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4">
                              <div className="d-flex align-items-center gap-2">
                                  <i data-lucide="diamond" className="text-primary size-3"></i>
                                  <span className="text-muted">On-time</span>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                  <i data-lucide="diamond" className="text-secondary size-3"></i>
                                  <span className="text-muted">Delayed</span>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                  <i data-lucide="diamond" className="text-success size-3"></i>
                                  <span className="text-muted">Overdue</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-7">
                  <div className="card">
                      <div className="card-header d-flex flex-wrap justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Purchase Chart</h5>
                          <div className="dropdown">
                              <a href="#" className="link link-custom-primary badge d-flex align-items-center fs-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                  Monthly
                              </a>
                              <div className="dropdown-menu dropdown-menu-end">
                                  <a className="dropdown-item" href="#">Weekly</a>
                                  <a className="dropdown-item" href="#">Monthly</a>
                                  <a className="dropdown-item" href="#">Yearly</a>
                              </div>
                          </div>
                      </div>
                      <div className="card-body">
                          <div id="basicColumnChart" dir="ltr"></div>
                      </div>
                  </div>
              </div>
              <div className="col-lg-6 col-xxl-5">
                  <div className="card card-h-100">
                      <div className="card-header d-flex flex-wrap justify-content-between align-items-center">
                          <h6 className="card-title mb-0">Purchase Distribution</h6>
                          <div className="dropdown">
                              <a href="#" className="link link-custom-primary badge d-flex align-items-center fs-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                  Weekly
                              </a>
                              <div className="dropdown-menu dropdown-menu-end">
                                  <a className="dropdown-item" href="#">Weekly</a>
                                  <a className="dropdown-item" href="#">Monthly</a>
                                  <a className="dropdown-item" href="#">Yearly</a>
                              </div>
                          </div>
                      </div>
                      <div className="card-body">
                          <div id="purchaseDistribution"></div>
                      </div>
                  </div>
              </div>
              <div className="col-lg-6 col-xl-6 col-xxl-3">
                  <div className="card">
                      <div className="card-header">
                          <h5 className="card-title mb-0">Top Suppliers</h5>
                      </div>
                      <div className="card-body">
                          <div className="px-5 mx-n5" style={{height: "406px"}} data-simplebar>
                              <div className="d-flex flex-column gap-3">
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Sunrise Wholesale</h6>
                                              <p className="text-muted">12 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$128,450</h6>
                                  </div>
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Global Traders</h6>
                                              <p className="text-muted">9 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$96,300</h6>
                                  </div>
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-3-Bz6g7hsE.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Prime Supplies</h6>
                                              <p className="text-muted">7 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$74,890</h6>
                                  </div>
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-4-7l52E1Lo.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Elite Distributors</h6>
                                              <p className="text-muted">6 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$62,500</h6>
                                  </div>
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Oceanic Imports</h6>
                                              <p className="text-muted">5 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$41,200</h6>
                                  </div>

                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Metro Supply Co.</h6>
                                              <p className="text-muted mb-0">6 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$65,240</h6>
                                  </div>
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-26-Chn9LYhC.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Nova Enterprises</h6>
                                              <p className="text-muted mb-0">5 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$52,880</h6>
                                  </div>
                                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-3">
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-10 rounded" alt="Supplier" />
                                          <div>
                                              <h6 className="mb-0 fw-medium">Vertex Traders</h6>
                                              <p className="text-muted mb-0">4 Orders</p>
                                          </div>
                                      </div>
                                      <h6 className="mb-0 ms-auto">$44,190</h6>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-9">
                  <div className="card">
                      <div className="card-header d-flex justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Summary</h5>
                          <a href="apps-purchase.html" className="link link-custom-primary">View All <i className="ri-arrow-right-line"></i></a>
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
                                          <th className="fw-medium text-muted">Supplier</th>
                                          <th className="fw-medium text-muted">Items</th>
                                          <th className="fw-medium text-muted">Total Amount</th>
                                          <th className="fw-medium text-muted">Payment Status</th>
                                          <th className="fw-medium text-muted">Date</th>
                                          <th className="fw-medium text-muted">Actions</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      <tr>
                                          <td>
                                              <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                          </td>
                                          <td>
                                              <div className="d-flex align-items-center gap-2">
                                                  <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                                  <a href="#" className="text-reset fw-medium d-block">Sunrise Wholesale</a>
                                              </div>
                                          </td>
                                          <td>25 Items</td>
                                          <td>$42,380.00</td>
                                          <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
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
                                              <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                          </td>
                                          <td>
                                              <div className="d-flex align-items-center gap-2">
                                                  <img src="../assets/user-2-CroG7YJ0.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                                  <a href="#" className="text-reset fw-medium d-block">Global Traders</a>
                                              </div>
                                          </td>
                                          <td>40 Items</td>
                                          <td>$28,500.00</td>
                                          <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
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
                                              <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                          </td>
                                          <td>
                                              <div className="d-flex align-items-center gap-2">
                                                  <img src="../assets/user-3-Bz6g7hsE.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                                  <a href="#" className="text-reset fw-medium d-block">Prime Supplies</a>
                                              </div>
                                          </td>
                                          <td>15 Items</td>
                                          <td>$18,750.00</td>
                                          <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Overdue</span></td>
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
                                              <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                          </td>
                                          <td>
                                              <div className="d-flex align-items-center gap-2">
                                                  <img src="../assets/user-4-7l52E1Lo.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                                  <a href="#" className="text-reset fw-medium d-block">Elite Distributors</a>
                                              </div>
                                          </td>
                                          <td>30 Items</td>
                                          <td>$35,600.00</td>
                                          <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                          <td>15 Dec, 2025</td>
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
                                              <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                          </td>
                                          <td>
                                              <div className="d-flex align-items-center gap-2">
                                                  <img src="../assets/user-5-BsT8d_Co.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                                  <a href="#" className="text-reset fw-medium d-block">Oceanic Imports</a>
                                              </div>
                                          </td>
                                          <td>10 Items</td>
                                          <td>$12,450.00</td>
                                          <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                          <td>12 Dec, 2025</td>
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
              </div>
          </div>
    </div>
  )
}
