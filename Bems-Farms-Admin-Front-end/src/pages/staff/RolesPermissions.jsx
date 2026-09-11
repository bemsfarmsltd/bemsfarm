import { Link } from 'react-router-dom'

export default function RolesPermissions() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Role Permission</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Role Permission</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="row justify-content-between g-3 g-xxl-0">
                      <div className="col-md-6 col-lg-4 col-xxl-3 position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search role, permission, staff,..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div className="col-xxl-8">
                          <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
                              <div id="filterStatus" className="w-48"></div>
                              <div id="filterPermission" className="w-44"></div>
                              <div id="filterAssigned" className="w-40"></div>
                              <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addRoleModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Role</button>
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
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Role Name</th>
                                  <th className="fw-medium text-muted">Description</th>
                                  <th className="fw-medium text-muted">Permissions</th>
                                  <th className="fw-medium text-muted">Staff Assigned</th>
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
                                  <td className="fw-medium">Admin</td>
                                  <td className="text-muted">Full access to system settings and data</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-success"></span>Dashboard</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Staff</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-warning"></span>Orders</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-danger"></span>Settings</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" aria-label="avatar-link" data-bs-toggle="tooltip" data-bs-title="Ina Payne">
                                              <img src="../assets/user-20-BaxQ31Jt.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" aria-label="avatar-link" data-bs-toggle="tooltip" data-bs-title="Robert Freeman">
                                              <img src="../assets/user-18-C5ehJukC.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" aria-label="avatar-link" data-bs-toggle="tooltip" data-bs-title="Michelle Wile">
                                              <img src="../assets/user-8-BAGm131G.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Manager</td>
                                  <td className="text-muted">Manages daily operations and team workflow</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-success"></span>Dashboard</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-warning"></span>Orders</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Products</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-secondary"></span>Reports</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Alex Morgan">
                                              <img src="../assets/user-5-BsT8d_Co.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="John Smith">
                                              <img src="../assets/user-6-BIO7_TUU.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Staff</td>
                                  <td className="text-muted">Handles assigned operational tasks only</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-warning"></span>Orders</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Inventory</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Sarah Lee">
                                              <img src="../assets/user-9-DB-6OyMr.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="David Clark">
                                              <img src="../assets/user-10-CzpspsdB.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Accountant</td>
                                  <td className="text-muted">Manages financial records and reports</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-secondary"></span>Reports</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-success"></span>Invoices</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Payments</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Daniel Scott">
                                              <img src="../assets/user-12-CfsiEgBV.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Daniel Scott">
                                              <img src="../assets/user-5-BsT8d_Co.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Daniel Scott">
                                              <img src="../assets/user-4-7l52E1Lo.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">HR</td>
                                  <td className="text-muted">Manages staff records, attendance and payroll</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Staff</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-warning"></span>Attendance</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-success"></span>Payroll</span>
                                      </div>
                                  </td>
                                  <td>-</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">HR</td>
                                  <td className="text-muted">Manages staff records, attendance and payroll</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Staff</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-warning"></span>Attendance</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-success"></span>Payroll</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Emma Watson">
                                              <img src="../assets/user-14-BWimhkHc.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Emma Watson">
                                              <img src="../assets/user-60-CjNhc-1e.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Emma Watson">
                                              <img src="../assets/user-61-c4NE_g1h.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Support Agent</td>
                                  <td className="text-muted">Responds to customer queries and tickets</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Tickets</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-secondary"></span>FAQ</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Sophia Brown">
                                              <img src="../assets/user-18-C5ehJukC.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Inventory Manager</td>
                                  <td className="text-muted">Controls stock levels and warehouse items</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-warning"></span>Inventory</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Suppliers</span>
                                      </div>
                                  </td>
                                  <td>-</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Auditor</td>
                                  <td className="text-muted">Reviews system data with read-only access</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-secondary"></span>Reports</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-info"></span>Logs</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Olivia Green">
                                              <img src="../assets/user-19-uC8d_L1u.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="Olivia Green">
                                              <img src="../assets/user-54-BgoCiuFl.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                          <ul className="dropdown-menu dropdown-menu-end">
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
                                  <td className="fw-medium">Viewer</td>
                                  <td className="text-muted">View-only access to dashboards and reports</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-success"></span>Dashboard</span>
                                          <span className="fs-13 border rounded d-flex align-items-center gap-2 px-3 py-1"><span className="size-1-5 rounded-circle d-block bg-secondary"></span>Reports</span>
                                      </div>
                                  </td>
                                  <td>
                                      <div className="avatar-group">
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="No Assigned User">
                                              <img src="../assets/user-1-xhBXJtq9.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                          <a href="#" className="avatar-group-item" data-bs-toggle="tooltip" data-bs-title="No Assigned User">
                                              <img src="../assets/user-57-BgWfHmFH.png" loading="lazy" alt="Avatar" className="size-8" />
                                          </a>
                                      </div>
                                  </td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> Overview</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">36</b> Results</p>
                      </div>
                      <div className="col-md-6">
                          <nav aria-label="Page navigation example">
                              <ul className="pagination justify-content-center justify-content-md-end mb-0 products-pagination">
                                  <li className="page-item disabled"><a className="page-link" href="#"><i data-lucide="chevron-left" className="size-4"></i>Previous</a></li>
                                  <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                  <li className="page-item"><a className="page-link" href="#">2</a></li>
                                  <li className="page-item"><a className="page-link" href="#">3</a></li>
                                  <li className="page-item"><a className="page-link" href="#">4</a></li>
                                  <li className="page-item"><a className="page-link" href="#">Next<i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addRoleModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Role</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <form id="addRoleForm">
                              <div className="row g-4">
                                  <div className="col-12">
                                      <label htmlFor="roleName" className="form-label">Role Name <span className="text-danger">*</span></label>
                                      <input type="text" id="roleName" className="form-control" placeholder="e.g. Sales Manager" required />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="roleDescription" className="form-label">Description</label>
                                      <textarea id="roleDescription" className="form-control" rows="3" placeholder="Brief description of role responsibilities..."></textarea>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="roleStatus" className="form-label">Status <span className="text-danger">*</span></label>
                                      <div id="roleStatus"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="roleType" className="form-label">Role Type <span className="text-danger">*</span></label>
                                      <div id="roleType"></div>
                                  </div>
                                  <div className="col-12">
                                      <label className="form-label">Assign Permissions <span className="text-danger">*</span></label>
                                      <div id="rolePermissions"></div>
                                  </div>
                                  <div className="col-12">
                                      <label className="form-label">Assign Staff (Optional)</label>
                                      <div className="d-flex align-items-center gap-2">
                                          <input type="file" className="filepond size-10 mb-0 flex-shrink-0" id="squareUpload" name="filepond" accept="image/png, image/jpeg, image/gif" />
                                          <input type="text" id="roleName" className="form-control" placeholder="e.g. Sales Manager" required />
                                      </div>
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-7">
                                  <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" className="btn btn-primary w-50">Save Role</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Role?</h5>
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
