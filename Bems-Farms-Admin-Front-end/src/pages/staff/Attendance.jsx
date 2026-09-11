import { Link } from 'react-router-dom'

export default function Attendance() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Attendance</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Attendance</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-3">
                 <h5 className="card-title mb-0">Staff Attendance</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center justify-content-end">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search staff..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="attendanceStatus" className="w-32"></div>
                      <div id="departmentFilter" className="w-44"></div>
                      <div id="roleFilter" className="w-36"></div>
                      <div id="shiftFilter" className="w-36"></div>
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
                                  <th className="fw-medium text-muted">Staff Name</th>
                                  <th className="fw-medium text-muted">Email</th>
                                  <th className="fw-medium text-muted">Phone</th>
                                  <th className="fw-medium text-muted">Role</th>
                                  <th className="fw-medium text-muted">Department</th>
                                  <th className="fw-medium text-muted">Shift</th>
                                  <th className="fw-medium text-muted">Attendance Status</th>
                                  <th className="fw-medium text-muted">Joining Date</th>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Alice Johnson</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">alice.johnson@gotpos.com</a></td>
                                  <td>+1 234 567 890</td>
                                  <td>Manager</td>
                                  <td>Sales</td>
                                  <td>Morning</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Present</span></td>
                                  <td>2024-01-15</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-11-bzS6tHsV.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Michael Lee</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">michael.lee@gotpos.com</a></td>
                                  <td>+1 987 654 321</td>
                                  <td>Staff</td>
                                  <td>Support</td>
                                  <td>Evening</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Absent</span></td>
                                  <td>2023-11-20</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-12-CfsiEgBV.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Emma Parker</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">emma.parker@gotpos.com</a></td>
                                  <td>+1 555 234 789</td>
                                  <td>Admin</td>
                                  <td>HR</td>
                                  <td>Morning</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Present</span></td>
                                  <td>2022-08-05</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-13-NgroKY8u.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">David Brown</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">david.brown@gotpos.com</a></td>
                                  <td>+1 444 987 123</td>
                                  <td>Staff</td>
                                  <td>Logistics</td>
                                  <td>Evening</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Late</span></td>
                                  <td>2025-02-10</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-14-BWimhkHc.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Sophia White</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">sophia.white@gotpos.com</a></td>
                                  <td>+1 333 222 111</td>
                                  <td>Manager</td>
                                  <td>Marketing</td>
                                  <td>Morning</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Present</span></td>
                                  <td>2024-06-18</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-15-Bm8xnKEs.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">James Miller</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">james.miller@gotpos.com</a></td>
                                  <td>+1 111 444 555</td>
                                  <td>Staff</td>
                                  <td>Support</td>
                                  <td>Evening</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Absent</span></td>
                                  <td>2023-09-12</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-16-DwC0VZG4.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Olivia Davis</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">olivia.davis@gotpos.com</a></td>
                                  <td>+1 222 555 888</td>
                                  <td>Staff</td>
                                  <td>Logistics</td>
                                  <td>Morning</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Present</span></td>
                                  <td>2025-01-05</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-17-Y_OiPHJx.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">William Moore</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">william.moore@gotpos.com</a></td>
                                  <td>+1 333 666 999</td>
                                  <td>Manager</td>
                                  <td>Marketing</td>
                                  <td>Morning</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Late</span></td>
                                  <td>2024-03-25</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-18-C5ehJukC.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Ava Taylor</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">ava.taylor@gotpos.com</a></td>
                                  <td>+1 444 111 222</td>
                                  <td>Staff</td>
                                  <td>Support</td>
                                  <td>Evening</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Present</span></td>
                                  <td>2025-04-12</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
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
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-19-uC8d_L1u.png" className="size-8 rounded-circle img-fluid" alt="User" />
                                          <a href="#" className="text-reset fw-medium d-block">Benjamin Wilson</a>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">benjamin.wilson@gotpos.com</a></td>
                                  <td>+1 555 333 777</td>
                                  <td>Admin</td>
                                  <td>HR</td>
                                  <td>Morning</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Present</span></td>
                                  <td>2023-07-30</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#attendanceModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">27</b> Results</p>
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


          <div className="modal fade" id="attendanceModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-2xl">
                  <div className="modal-content">
                      <div className="modal-header bg-light border-0">
                          <h6 className="modal-title">Attendance History</h6>
                          <p className="text-muted ms-auto"> <i className="ri-calendar-line me-1"></i>1 Dec - 30 Dec 2025</p>
                      </div>
                      <div className="p-5 pb-7">
                          <div className="row row-cols-5 g-0">
                              <div className="col">
                                  <div className="pe-5 border-end">
                                      <h6 className="mb-1 fw-normal">Present Days</h6>
                                      <h5 className="mb-1">22</h5>
                                      <p className="text-muted fs-13">
                                          <span className="text-success">+2</span> vs last month
                                      </p>
                                  </div>
                              </div>
                              <div className="col">
                                  <div className="px-5 border-end">
                                      <h6 className="mb-1 fw-normal">Late Arrivals</h6>
                                      <h5 className="mb-1">6</h5>
                                      <p className="text-muted fs-13">
                                          <span className="text-danger">+1</span> vs last month
                                      </p>
                                  </div>
                              </div>
                              <div className="col">
                                  <div className="px-5 border-end">
                                      <h6 className="mb-1 fw-normal">Early Check-Out</h6>
                                      <h5 className="mb-1">4</h5>
                                      <p className="text-muted fs-13">
                                          <span className="text-success">-2</span> vs last month
                                      </p>
                                  </div>
                              </div>
                              <div className="col">
                                  <div className="px-5 border-end">
                                      <h6 className="mb-1 fw-normal">Absent Days</h6>
                                      <h5 className="mb-1">2</h5>
                                      <p className="text-muted fs-13">
                                          <span className="text-body">0</span> vs last month
                                      </p>
                                  </div>
                              </div>
                              <div className="col">
                                  <div className="px-5">
                                      <h6 className="mb-1 fw-normal">Overtime Hours</h6>
                                      <h5 className="mb-1">18h</h5>
                                      <p className="text-muted fs-13">
                                          <span className="text-success">+5h</span> vs last month
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="modal-body pt-0">
                          <div className="px-5 mx-n5" data-simplebar style={{height: "600px"}}>
                              <div className="d-flex flex-column gap-4 mb-2">
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">Today</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>09:00 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>05:00 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>8h 05m</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">Yesterday</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>10:15 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 late" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-danger" style={{width: "100%"}}>Late</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 late-working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>06:00 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>7h 45m</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <div className="d-flex justify-content-between align-items-center mb-1">
                                          <h6 className="fw-medium mb-0">28 December 2025</h6>
                                          <span className="fs-sm text-success"><i className="ri-check-double-fill fs-lg align-middle"></i>Approved</span>
                                      </div>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>-</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 w-100 rounded-1" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-warning" style={{width: "100%"}}>Day Off</div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>-</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1"></p>
                                              <p></p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">27 December 2025</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>09:00 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>05:00 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>8h 05m</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">26 December 2025</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>09:12 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 late" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-danger" style={{width: "100%"}}>Late</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 late-working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>05:18 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>8h 15m</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">25 December 2025</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>09:00 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>05:00 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>8h 05m</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">24 December 2025</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>09:00 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>05:00 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>8h 05m</p>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="p-3 border rounded">
                                      <h6 className="fw-medium">23 December 2025</h6>
                                      <div className="d-flex">
                                          <div className="attendance-time pe-4 border-end">
                                              <p className="text-muted mb-1">Clock-in</p>
                                              <p>09:00 AM</p>
                                          </div>
                                          <div className="attendance-timeline px-4 border-end">
                                              <div className="d-flex justify-content-between mb-2">
                                                  <p className="text-muted">09:00</p>
                                                  <p className="text-muted">11:00</p>
                                                  <p className="text-muted">13:00</p>
                                                  <p className="text-muted">15:00</p>
                                                  <p className="text-muted">16:00</p>
                                                  <p className="text-muted">17:00</p>
                                                  <p className="text-muted">18:00</p>
                                              </div>
                                              <div className="d-flex">
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-start-1 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 break" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-info" style={{width: "100%"}}>Break</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 working-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-primary" style={{width: "100%"}}>Working</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 over-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-secondary" style={{width: "100%"}}>Over</div>
                                                  </div>
                                                  <div className="progress progress-4 flex-shrink-0 rounded-0 rounded-end-1 extra-time" role="progressbar" aria-label="Example with label" aria-valuenow="66.66" aria-valuemin="0" aria-valuemax="100">
                                                      <div className="progress-bar bg-light" style={{width: "100%"}}></div>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="attendance-time px-4 mx-auto border-end">
                                              <p className="text-muted mb-1">Clock-Out</p>
                                              <p>05:00 PM</p>
                                          </div>
                                          <div className="attendance-time ps-4 mx-auto">
                                              <p className="text-muted mb-1">Duration</p>
                                              <p>8h 05m</p>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Attendance?</h5>
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
