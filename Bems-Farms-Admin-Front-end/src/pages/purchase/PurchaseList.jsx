import { Link } from 'react-router-dom'

export default function PurchaseList() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Purchase</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Purchase</a></li>
                  <li className="breadcrumb-item active">Purchase</li>
              </ul>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xxl-5">
              <div className="col">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex align-items-start justify-content-between mb-7">
                              <h6 className="mb-1 fs-17 fw-medium">Total Purchases</h6>
                              <div className="icon bg-primary-subtle text-primary rounded size-10 d-flex align-items-center justify-content-center">
                                  <i className="ri-shopping-bag-3-line fs-5"></i>
                              </div>
                          </div>
                          <h3 className="mb-3 font-base">$128,750</h3>
                          <div className="d-flex align-items-start justify-content-between">
                              <span><span className="text-success fw-medium me-1"><i data-lucide="trending-up" className="size-4 me-1"></i>5.2%</span> vs last month</span>
                              <a href="#" className="link link-custom-primary">View more<i data-lucide="arrow-up-right" className="size-4 ms-1"></i></a>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex align-items-start justify-content-between mb-7">
                              <h6 className="mb-1 fs-17 fw-medium">Total Orders</h6>
                              <div className="icon bg-warning-subtle text-warning rounded size-10 d-flex align-items-center justify-content-center">
                                  <i className="ri-file-list-3-line fs-5"></i>
                              </div>
                          </div>
                          <h3 className="mb-3 font-base">1,245</h3>
                          <div className="d-flex align-items-start justify-content-between">
                              <span><span className="text-success fw-medium me-1"><i data-lucide="trending-up" className="size-4 me-1"></i>3.8%</span> vs last month</span>
                              <a href="#" className="link link-custom-primary">View more<i data-lucide="arrow-up-right" className="size-4 ms-1"></i></a>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex align-items-start justify-content-between mb-7">
                              <h6 className="mb-1 fs-17 fw-medium">Pending Orders</h6>
                              <div className="icon bg-info-subtle text-info rounded size-10 d-flex align-items-center justify-content-center">
                                  <i className="ri-time-line fs-5"></i>
                              </div>
                          </div>
                          <h3 className="mb-3 font-base">78</h3>
                          <div className="d-flex align-items-start justify-content-between">
                              <span><span className="text-danger fw-medium me-1"><i data-lucide="trending-down" className="size-4 me-1"></i>1.2%</span> vs last month</span>
                              <a href="#" className="link link-custom-primary">View more<i data-lucide="arrow-up-right" className="size-4 ms-1"></i></a>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex align-items-start justify-content-between mb-7">
                              <h6 className="mb-1 fs-17 fw-medium">Returned Items</h6>
                              <div className="icon bg-danger-subtle text-danger rounded size-10 d-flex align-items-center justify-content-center">
                                  <i className="ri-refresh-line fs-5"></i>
                              </div>
                          </div>
                          <h3 className="mb-3 font-base">34</h3>
                          <div className="d-flex align-items-start justify-content-between">
                              <span><span className="text-danger fw-medium me-1"><i data-lucide="trending-down" className="size-4 me-1"></i>0.8%</span> vs last month</span>
                              <a href="#" className="link link-custom-primary">View more<i data-lucide="arrow-up-right" className="size-4 ms-1"></i></a>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col">
                  <div className="card">
                      <div className="card-body">
                          <div className="d-flex align-items-start justify-content-between mb-7">
                              <h6 className="mb-1 fs-17 fw-medium">Total Revenue</h6>
                              <div className="icon bg-success-subtle text-success rounded size-10 d-flex align-items-center justify-content-center">
                                  <i className="ri-wallet-line fs-5"></i>
                              </div>
                          </div>
                          <h3 className="mb-3 font-base">$97,450</h3>
                          <div className="d-flex align-items-start justify-content-between">
                              <span><span className="text-success fw-medium me-1"><i data-lucide="trending-up" className="size-4 me-1"></i>4.5%</span> vs last month</span>
                              <a href="#" className="link link-custom-primary">View more<i data-lucide="arrow-up-right" className="size-4 ms-1"></i></a>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between mb-5">
                      <div>
                          <h5 className="card-title mb-1">Purchases List</h5>
                          <p className="text-muted">View and manage all purchase records including suppliers and items.</p>
                      </div>
                      <a href="apps-purchase-add.html" className="btn btn-primary"><i data-lucide="plus" className="size-4 me-1"></i>Add Purchase</a>
                  </div>
                  <div className="d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                          <div id="filterPaymentStatus" className="w-56"></div>
                          <div id="filterPurchaseStatus" className="w-56"></div>
                          <div className="position-relative flex-shrink-0">
                              <input type="text" className="form-control ps-10" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                              <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                          <div className="dropdown">
                              <button type="button" className="btn btn-outline-light btn-icon border" data-bs-toggle="dropdown" aria-expanded="false"><i data-lucide="funnel" className="size-4"></i></button>
                              <ul className="dropdown-menu dropdown-menu-end p-3 w-80" aria-labelledby="filterDropdownButton">
                                  <h6 className="mb-4">Filter Options</h6>
                                  <form action="#!" id="filterForm">
                                      <div className="mb-3">
                                          <label className="form-label small">Purchase Date</label>
                                          <div className="d-flex gap-2">
                                              <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="From date" />
                                              <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="To date" />
                                          </div>
                                      </div>
                                      <label className="mb-3 form-label">Price Range</label>
                                      <div id="slider"></div>
                                      <div className="d-flex align-items-center justify-content-end gap-2 mt-7">
                                          <button type="reset" className="btn-sm btn btn-light h-8 px-4">Reset</button>
                                          <button type="submit" className="btn-sm btn btn-primary h-8 px-4">Apply</button>
                                      </div>
                                  </form>
                              </ul>
                          </div>
                      </div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                          <div className="position-relative">
                              <input type="text" id="lostItemSearch" className="form-control ps-10" placeholder="Search Purchases..." />
                              <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                          <button type="button" className="btn btn-outline-light border flex-shrink-0"><i className="ri-file-pdf-line me-1"></i>Export PDF</button>
                          <button type="button" className="btn btn-outline-light border flex-shrink-0"><i className="ri-file-excel-line me-1"></i>Export Excel</button>
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
                                  <th className="fw-medium text-muted">Purchase Status</th>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0001</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Sunrise Wholesale</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-2" defaultChecked /><label className="label" htmlFor="switch-light-2"></label>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0002</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Global Traders</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-3" defaultChecked /><label className="label" htmlFor="switch-light-3"></label>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0003</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-3-Bz6g7hsE.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Prime Supplies</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-4" defaultChecked /><label className="label" htmlFor="switch-light-4"></label>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0004</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-4-7l52E1Lo.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Elite Distributors</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-5" /><label className="label" htmlFor="switch-light-5"></label>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0005</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Oceanic Imports</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-6" defaultChecked /><label className="label" htmlFor="switch-light-6"></label>
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
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#PUR-0006</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Continental Supply</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-7" /><label className="label" htmlFor="switch-light-7"></label>
                                      </div>
                                  </td>
                                  <td>50 Items</td>
                                  <td>$55,000.00</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                  <td>10 Dec, 2025</td>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0007</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Nova Traders</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-8" defaultChecked /><label className="label" htmlFor="switch-light-8"></label>
                                      </div>
                                  </td>
                                  <td>20 Items</td>
                                  <td>$22,900.00</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>08 Dec, 2025</td>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0008</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-1-xhBXJtq9.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Vertex Supplies</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-9" defaultChecked /><label className="label" htmlFor="switch-light-9"></label>
                                      </div>
                                  </td>
                                  <td>35 Items</td>
                                  <td>$30,450.00</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Overdue</span></td>
                                  <td>05 Dec, 2025</td>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0009</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Aurora Wholesale</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-10" /><label className="label" htmlFor="switch-light-10"></label>
                                      </div>
                                  </td>
                                  <td>18 Items</td>
                                  <td>$21,600.00</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Paid</span></td>
                                  <td>03 Dec, 2025</td>
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
                                  <td><a href="#" className="link link-custom-primary">#PUR-0010</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Atlas Imports</a>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch-light-11" defaultChecked /><label className="label" htmlFor="switch-light-11"></label>
                                      </div>
                                  </td>
                                  <td>28 Items</td>
                                  <td>$32,200.00</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>01 Dec, 2025</td>
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


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs">
                  <div className="modal-content p-7 text-center">
                      <div className="d-flex justify-content-center mb-4">
                          <div className="size-14 bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center size-16">
                              <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                          </div>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Purchase?</h5>
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
