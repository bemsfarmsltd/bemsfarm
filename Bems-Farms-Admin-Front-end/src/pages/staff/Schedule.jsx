import { Link } from 'react-router-dom'

export default function Schedule() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Schedule</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Schedule</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-md-6 col-lg-8 col-xxl-9">
                  <h6 className="fw-medium">Today (4)</h6>
                  <div className="row">
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      09:10 AM - 10:15 AM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-1-xhBXJtq9.png" alt="Avatar" className="img-fluid size-10 rounded" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Johnathan Alexander</h6>
                                          <p className="text-muted mb-0 text-truncate">Inventory Management</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Follow up with supplier and update inventory.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      10:30 AM - 11:45 AM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-2-CroG7YJ0.png" alt="Avatar" className="img-fluid size-10 rounded" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Emily Robertson</h6>
                                          <p className="text-muted mb-0 text-truncate">Sales Operations</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Review daily sales report and verify POS entries.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      12:00 PM - 01:00 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-3-Bz6g7hsE.png" alt="Avatar" className="img-fluid size-10 rounded" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Michael Thompson</h6>
                                          <p className="text-muted mb-0 text-truncate">Cashier & Billing</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Reconcile cash drawer and close billing session.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      02:15 PM - 03:30 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-4-7l52E1Lo.png" alt="Avatar" className="img-fluid size-10 rounded" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Sophia Martinez</h6>
                                          <p className="text-muted mb-0 text-truncate">Store Operations</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Inspect store layout and ensure shelf restocking is complete.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <h6 className="fw-medium">Yesterday (8)</h6>
                  <div className="row">
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      07:15 PM - 08:15 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-9-DB-6OyMr.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Noah Anderson</h6>
                                          <p className="text-muted mb-0 text-truncate">Night Shift Lead</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Coordinate night staff and closing tasks.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      08:30 PM - 09:30 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-10-CzpspsdB.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Ava Johnson</h6>
                                          <p className="text-muted mb-0 text-truncate">Accounts Assistant</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Verify invoices and daily expense entries.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      09:45 PM - 10:45 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-11-bzS6tHsV.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Liam Wilson</h6>
                                          <p className="text-muted mb-0 text-truncate">IT Support</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">System check and POS backup verification.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      11:00 PM - 12:00 AM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-12-CfsiEgBV.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Mia Rodriguez</h6>
                                          <p className="text-muted mb-0 text-truncate">Maintenance</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Clean equipment and prepare store for next day.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      02:15 PM - 03:15 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-5-BsT8d_Co.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Daniel Carter</h6>
                                          <p className="text-muted mb-0 text-truncate">Warehouse Staff</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Arrange incoming stock in storage area.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      03:30 PM - 04:30 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-6-BIO7_TUU.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Olivia Bennett</h6>
                                          <p className="text-muted mb-0 text-truncate">Customer Support</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Handle customer complaints and returns.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      04:45 PM - 05:45 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-7-BMyy-xCq.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Ethan Walker</h6>
                                          <p className="text-muted mb-0 text-truncate">Security</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Monitor store entry and closing procedures.</p>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-6 col-xl-4 col-xxl-3">
                          <div className="card card-h-100">
                              <div className="card-body">
                                  <p className="fw-medium mb-6">
                                      <i data-lucide="clock" className="size-4 me-2 align-middle text-muted"></i>
                                      06:00 PM - 07:00 PM
                                  </p>
                                  <div className="d-flex align-items-center gap-3 mb-6">
                                      <img src="../assets/user-8-BAGm131G.png" className="img-fluid size-10 rounded" alt="Avatar" />
                                      <div className="min-w-0">
                                          <h6 className="mb-0 fw-medium text-truncate">Isabella Moore</h6>
                                          <p className="text-muted mb-0 text-truncate">Evening Supervisor</p>
                                      </div>
                                  </div>
                                  <p className="text-muted fs-sm mb-1">Notes:</p>
                                  <p className="mb-0 min-h-11 line-clamp-2">Oversee evening shift and handover report.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="row align-items-center g-3 mb-5">
                      <div className="col-lg-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">28</b> Results</p>
                      </div>
                      <div className="col-lg-6">
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
              <div className="col-md-6 col-lg-4 col-xxl-3">
                  <div className="card position-sticky top-20">
                      <div className="p-5 pb-3 border-bottom">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex gap-2 align-items-center">
                                  <i data-lucide="calendar" className="size-4 text-muted"></i>
                                  <h5 className="fw-medium card-title text-muted mb-0">Schedule a Task</h5>
                              </div>
                              <a href="#" className="link" data-bs-toggle="modal" data-bs-target="#addRoleModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Staff</a>
                          </div>
                          <div data-datepicker data-date-format="yyyy-MM-dd" data-inline="true" className="staff-schedule-calendar"></div>
                      </div>
                      <div className="p-5">
                          <div className="pb-5 g-5 row">
                              <div className="col-6">
                                  <label htmlFor="startTime" className="form-label">Start Time</label>
                                  <input id="startTime" type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" data-timepicker="true" data-time-format="hh:mm AA" defaultValue="9:10 AM" placeholder="Choose time" />
                              </div>
                              <div className="col-6">
                                  <label htmlFor="endTime" className="form-label">End Time</label>
                                  <input id="endTime" type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" data-timepicker="true" data-time-format="hh:mm AA" defaultValue="10:15 AM" placeholder="Choose time" />
                              </div>
                              <div className="col-12">
                                  <label htmlFor="Notes" className="form-label">Notes</label>
                                  <textarea id="Notes" className="form-control" rows="3" placeholder="Payment notes...">Follow up with supplier and update inventory.</textarea>
                              </div>
                          </div>
                          <p className="text-muted mb-2">Task: <span className="text-body fw-medium ps-1">14-01-2026, from 09:10 AM to 10:15 AM</span></p>
                          <div className="d-flex justify-content-end gap-2 mt-7">
                              <button type="button" className="btn btn-outline-light border">Cancel</button>
                              <button type="submit" className="btn btn-primary">Schedule</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addRoleModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-sm">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Staff</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <form id="addRoleForm">
                              <div className="row g-4">
                                  <div className="col-12">
                                      <label className="form-label">Assign Staff (Optional)</label>
                                      <div className="d-flex align-items-center gap-2">
                                          <input type="file" className="filepond size-10 mb-0 flex-shrink-0" id="squareUpload" name="filepond" accept="image/png, image/jpeg, image/gif" />
                                          <input type="text" id="roleName" className="form-control" placeholder="e.g. Sales Manager" required />
                                      </div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="roleName" className="form-label">Role Name <span className="text-danger">*</span></label>
                                      <input type="text" id="roleName" className="form-control" placeholder="e.g. Sales Manager" required />
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-7">
                                  <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" className="btn btn-primary w-50">Save Staff</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
