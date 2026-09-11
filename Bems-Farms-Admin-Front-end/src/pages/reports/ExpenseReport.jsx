import { Link } from 'react-router-dom'

export default function ExpenseReport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Expenses</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Reports</a></li>
                  <li className="breadcrumb-item active">Expenses</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-xl-7 col-xxl-8">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-6">
                              <div className="d-flex align-items-center gap-2">
                                  <div className="avatar size-8 bg-primary-subtle text-primary rounded">
                                      <i data-lucide="wallet" className="size-4"></i>
                                  </div>
                                  <h6 className="mb-0">Expenses Overview</h6>
                              </div>
                              <span className="text-muted">Last updated: Jan, 2025</span>
                          </div>
                          <div className="row g-5">
                              <div className="col-md-6 col-lg-3 col-xl-6 col-xxl-3 border-end-md">
                                  <div className="">
                                      <p className="text-muted mb-3">Total Expenses</p>
                                      <h5 className="mb-0">$92,780<small className="text-muted fs-15 fw-normal ms-2">$110 avg / expense</small></h5>
                                  </div>
                              </div>
                              <div className="col-md-6 col-lg-3 col-xl-6 col-xxl-3 d-flex border-end-lg border-end-xl-0 border-end-xxl">
                                  <div className="px-md-10">
                                      <p className="text-muted mb-3">Paid Expenses</p>
                                      <h5 className="mb-0">$86,460<small className="text-muted fs-15 fw-normal ms-2">Completed</small></h5>
                                  </div>
                              </div>
                              <div className="col-md-6 col-lg-3 col-xl-6 col-xxl-3 d-flex border-end-md">
                                  <div className="px-lg-10 px-xl-0 px-xxl-10">
                                      <p className="text-muted mb-3">Paid Expenses</p>
                                      <h5 className="mb-0">$86,460<small className="text-muted fs-15 fw-normal ms-2">Completed</small></h5>
                                  </div>
                              </div>
                              <div className="col-md-6 col-lg-3 col-xl-6 col-xxl-3 d-flex">
                                  <div className="px-md-10">
                                      <p className="text-muted mb-3">Overdue Expenses</p>
                                      <h5 className="mb-0">$2,140<small className="text-muted fs-15 fw-normal ms-2">Past due</small></h5>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="card">
                      <div className="card-header d-flex flex-wrap justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Income vs Expense</h5>
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
                          <div id="revenueChart"></div>
                      </div>
                  </div>
                  <div className="card">
                      <div className="card-header d-flex justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Summary</h5>
                          <a href="apps-accounts-expenses.html" className="link link-custom-primary">View All <i className="ri-arrow-right-line"></i></a>
                      </div>
                      <div className="card-body pt-0">
                          <div className="table-card table-responsive">
                              <table className="table text-nowrap align-middle mb-0">
                                  <thead>
                                      <tr className="bg-light border-bottom">
                                          <th>
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" id="checkAllExpenses" />
                                              </div>
                                          </th>
                                          <th className="fw-medium text-muted">Payee</th>
                                          <th className="fw-medium text-muted">Category</th>
                                          <th className="fw-medium text-muted">Payment Method</th>
                                          <th className="fw-medium text-muted">Date</th>
                                          <th className="fw-medium text-muted">Status</th>
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
                                          <td>Office Rent</td>
                                          <td>Rent</td>
                                          <td><span className="fs-13 rounded fw-medium py-1 px-2 border text-reset">Bank</span></td>
                                          <td>24 Dec, 2025</td>
                                          <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
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
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" />
                                              </div>
                                          </td>
                                          <td>Electricity Board</td>
                                          <td>Utilities</td>
                                          <td><span className="fs-13 rounded fw-medium py-1 px-2 border text-reset">Online</span></td>
                                          <td>23 Dec, 2025</td>
                                          <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
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
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" />
                                              </div>
                                          </td>
                                          <td>Staff Salary</td>
                                          <td>Salary</td>
                                          <td><span className="fs-13 rounded fw-medium py-1 px-2 border text-reset">Bank</span></td>
                                          <td>22 Dec, 2025</td>
                                          <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
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
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" />
                                              </div>
                                          </td>
                                          <td>Courier Service</td>
                                          <td>Transportation</td>
                                          <td><span className="fs-13 rounded fw-medium py-1 px-2 border text-reset">Cash</span></td>
                                          <td>21 Dec, 2025</td>
                                          <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
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
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" />
                                              </div>
                                          </td>
                                          <td>Internet Provider</td>
                                          <td>Utilities</td>
                                          <td><span className="fs-13 rounded fw-medium py-1 px-2 border text-reset">Online</span></td>
                                          <td>20 Dec, 2025</td>
                                          <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
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
                                  <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">19</b> Results</p>
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
              <div className="col-xl-5 col-xxl-4">
                  <div className="card">
                      <div className="card-header d-flex flex-wrap justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Week Progress</h5>
                          <div className="dropdown">
                              <a href="#" className="link link-custom-primary badge d-flex align-items-center fs-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                                  Recent
                              </a>
                              <div className="dropdown-menu dropdown-menu-end">
                                  <a className="dropdown-item" href="#">Recent</a>
                                  <a className="dropdown-item" href="#">Weekly</a>
                                  <a className="dropdown-item" href="#">Monthly</a>
                                  <a className="dropdown-item" href="#">Yearly</a>
                              </div>
                          </div>
                      </div>
                      <div className="card-body">
                          <div id="weekProgress" dir="ltr"></div>
                      </div>
                  </div>
                  <div className="card">
                      <div className="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Expense Breakdown</h5>
                          <p className="text-muted">Compare to last month</p>
                      </div>
                      <div className="card-body p-0">
                          <div className="row g-0">
                              <div className="col-md-6 border-bottom border-end-md">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="wallet" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted">Office Rent</p>
                                              <h6 className="mb-0">$2,500</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">15% <i data-lucide="arrow-up" className="text-success size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="users" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Staff Salary</p>
                                              <h6 className="mb-0">$4,800</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">8% <i data-lucide="arrow-up" className="text-success size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom border-end-md">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="zap" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Utilities</p>
                                              <h6 className="mb-0">$440</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">4% <i data-lucide="arrow-down" className="text-danger size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="truck" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Transportation</p>
                                              <h6 className="mb-0">$440</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">2% <i data-lucide="arrow-up" className="text-success size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom border-end-md">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="package" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Office Supplies</p>
                                              <h6 className="mb-0">$450</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">6% <i data-lucide="arrow-down" className="text-danger size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="settings" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Maintenance</p>
                                              <h6 className="mb-0">$90</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">1% <i data-lucide="arrow-down" className="text-danger size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom border-end-md">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="fuel" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Fuel Expense</p>
                                              <h6 className="mb-0">$260</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">3% <i data-lucide="arrow-up" className="text-success size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-bottom">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="send" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Courier Service</p>
                                              <h6 className="mb-0">$180</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">2% <i data-lucide="arrow-down" className="text-danger size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6 border-end-md">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="avatar size-10 bg-light text-muted rounded">
                                              <i data-lucide="shopping-cart" className="size-5"></i>
                                          </div>
                                          <div>
                                              <p className="text-muted mb-1">Online Orders</p>
                                              <h6 className="mb-0">$320</h6>
                                          </div>
                                      </div>
                                      <p className="text-muted">5% <i data-lucide="arrow-up" className="text-success size-4"></i></p>
                                  </div>
                              </div>
                              <div className="col-md-6">
                                  <div className="p-5 d-flex justify-content-between align-items-center">
                                      <div className="d-flex justify-content-between align-items-center">
                                          <div className="d-flex align-items-center gap-3">
                                              <div className="avatar size-10 bg-light text-muted rounded">
                                                  <i data-lucide="credit-card" className="size-5"></i>
                                              </div>
                                              <div>
                                                  <p className="text-muted mb-1">Payments</p>
                                                  <h6 className="mb-0">$500</h6>
                                              </div>
                                          </div>
                                      </div>
                                      <p className="text-muted">3% <i data-lucide="arrow-up" className="text-success size-4"></i></p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
