import { Link } from 'react-router-dom'

export default function StaffList() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Staff List</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Staff List</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <h5 className="card-title mb-0">Staff List</h5>
                  <div className="d-flex flex-wrap gap-2 ">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search products..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="staffRole" className="w-56"></div>
                      <div id="staffStatus" className="w-40"></div>
                      <a href="apps-staff-add.html" className="btn btn-primary"><i data-lucide="plus" className="size-4 me-1"></i>Add Staff</a>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSales" />
                                      </div>
                                  </th>
                                  <th className="text-muted fw-medium">Staff</th>
                                  <th className="text-muted fw-medium">Role</th>
                                  <th className="text-muted fw-medium">Email</th>
                                  <th className="text-muted fw-medium">Phone</th>
                                  <th className="text-muted fw-medium">Status</th>
                                  <th className="text-muted fw-medium">Last Login</th>
                                  <th className="text-muted fw-medium">Total Sales</th>
                                  <th className="text-muted fw-medium">Action</th>
                              </tr>
                          </thead>
                          <tbody className="accordion" id="staffAccordion">
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-1-xhBXJtq9.png" loading="lazy" alt="John Doe" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">John Doe</a>
                                              <p className="text-muted fs-sm">Joined: 12 Jan 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Manager</td>
                                  <td>john.doe@example.com</td>
                                  <td>+91 9876543210</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>28 Dec 2025</td>
                                  <td>$12,500</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff1" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff1" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-1-xhBXJtq9.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Manager" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="John Doe" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="john.doe@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" defaultValue="12-01-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9876543210" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" defaultValue="25-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$12,500" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Sales" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="123 Main St, Brooklyn, NY" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Brooklyn" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="USA" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-2-CroG7YJ0.png" loading="lazy" alt="Sarah Smith" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Sarah Smith</a>
                                              <p className="text-muted fs-sm">Joined: 05 Feb 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Sales Executive</td>
                                  <td>sarah.smith@example.com</td>
                                  <td>+91 9123456780</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span>
                                  </td>
                                  <td>22 Dec 2025</td>
                                  <td>$8,300</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff2" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff2" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-2-CroG7YJ0.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Sales Executive" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Sarah Smith" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="sarah.smith@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="05-02-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9123456780" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="22-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$8,300" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Sales" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="45 Market Road, Andheri" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Mumbai" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-3-Bz6g7hsE.png" loading="lazy" alt="Amit Patel" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Amit Patel</a>
                                              <p className="text-muted fs-sm">Joined: 18 Mar 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Account Executive</td>
                                  <td>amit.patel@example.com</td>
                                  <td>+91 9988776655</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span>
                                  </td>
                                  <td>20 Dec 2025</td>
                                  <td>$6,750</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff3" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff3" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-3-Bz6g7hsE.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Account Executive" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Amit Patel" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="amit.patel@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="18-03-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9988776655" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="20-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$6,750" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Accounts" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="72 Business Park, SG Highway" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Ahmedabad" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-4-7l52E1Lo.png" loading="lazy" alt="Priya Sharma" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Priya Sharma</a>
                                              <p className="text-muted fs-sm">Joined: 09 Apr 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>HR Executive</td>
                                  <td>priya.sharma@example.com</td>
                                  <td>+91 9012345678</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>18 Dec 2025</td>
                                  <td>$5,200</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff4" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff4" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-4-7l52E1Lo.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="HR Executive" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Priya Sharma" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="priya.sharma@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="09-04-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9012345678" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="18-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$5,200" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Human Resources" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="14 Corporate Avenue, Powai" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Mumbai" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-5-BsT8d_Co.png" loading="lazy" alt="Rahul Mehta" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Rahul Mehta</a>
                                              <p className="text-muted fs-sm">Joined: 21 May 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Finance Officer</td>
                                  <td>rahul.mehta@example.com</td>
                                  <td>+91 8899776655</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span>
                                  </td>
                                  <td>16 Dec 2025</td>
                                  <td>$9,450</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff5" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff5" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-5-BsT8d_Co.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Finance Officer" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Rahul Mehta" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="rahul.mehta@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="21-05-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 8899776655" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="16-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$9,450" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Finance" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="88 Corporate Plaza, BKC" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Mumbai" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-6-BIO7_TUU.png" loading="lazy" alt="Neha Verma" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Neha Verma</a>
                                              <p className="text-muted fs-sm">Joined: 02 Jun 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Operations Manager</td>
                                  <td>neha.verma@example.com</td>
                                  <td>+91 8877665544</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>27 Dec 2025</td>
                                  <td>$14,800</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff6" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff6" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-6-BIO7_TUU.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Operations Manager" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Neha Verma" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="neha.verma@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="02-06-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 8877665544" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="27-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$14,800" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Operations" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="301 Business Hub, Sector 62" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Noida" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                      <div className="d-flex align-items-center gap-3">
                                          <img src="../assets/user-7-BMyy-xCq.png" loading="lazy" alt="Karan Singh" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Karan Singh</a>
                                              <p className="text-muted fs-sm">Joined: 15 Jul 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>IT Administrator</td>
                                  <td>karan.singh@example.com</td>
                                  <td>+91 8765432109</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>29 Dec 2025</td>
                                  <td>$11,200</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff7" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff7" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-7-BMyy-xCq.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="IT Administrator" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Karan Singh" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="karan.singh@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="15-07-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 8765432109" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="29-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$11,200" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="IT" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="512 Tech Park, Whitefield" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Bengaluru" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                          <img src="../assets/user-8-BAGm131G.png" loading="lazy" alt="Vikas Rao" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Vikas Rao</a>
                                              <p className="text-muted fs-sm">Joined: 03 Aug 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Warehouse Supervisor</td>
                                  <td>vikas.rao@example.com</td>
                                  <td>+91 9345678120</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span>
                                  </td>
                                  <td>14 Dec 2025</td>
                                  <td>$4,980</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff8" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff8" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-8-BAGm131G.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Warehouse Supervisor" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Vikas Rao" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="vikas.rao@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="03-08-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9345678120" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="14-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$4,980" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Warehouse" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="Plot 19, Industrial Area" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Pune" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                          <img src="../assets/user-9-DB-6OyMr.png" loading="lazy" alt="Ankit Kumar" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Ankit Kumar</a>
                                              <p className="text-muted fs-sm">Joined: 26 Aug 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Customer Support Lead</td>
                                  <td>ankit.kumar@example.com</td>
                                  <td>+91 9955443322</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>28 Dec 2025</td>
                                  <td>$7,650</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff9" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff9" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-9-DB-6OyMr.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Customer Support Lead" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Ankit Kumar" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="ankit.kumar@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="26-08-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9955443322" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="28-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$7,650" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Customer Support" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="Block C, Tech Residency" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Gurugram" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                          <img src="../assets/user-10-CzpspsdB.png" loading="lazy" alt="Riya Patel" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Riya Patel</a>
                                              <p className="text-muted fs-sm">Joined: 12 Sep 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Marketing Executive</td>
                                  <td>riya.patel@example.com</td>
                                  <td>+91 9988776655</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>29 Dec 2025</td>
                                  <td>$6,750</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff10" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff10" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-10-CzpspsdB.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Marketing Executive" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Riya Patel" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="riya.patel@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="12-09-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9988776655" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="29-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$6,750" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Marketing" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="45 Garden Street, Andheri" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Mumbai" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
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
                                          <img src="../assets/user-10-CzpspsdB.png" loading="lazy" alt="Riya Patel" className="img-fluid size-9 rounded-1" />
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Riya Patel</a>
                                              <p className="text-muted fs-sm">Joined: 12 Sep 2025</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td>Marketing Executive</td>
                                  <td>riya.patel@example.com</td>
                                  <td>+91 9988776655</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                                  </td>
                                  <td>29 Dec 2025</td>
                                  <td>$6,750</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#staff10" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="staff10" className="accordion-collapse collapse" data-bs-parent="#staffAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <img src="../assets/user-10-CzpspsdB.png" className="img-fluid mb-6 size-40 rounded" alt="Staff Image" />
                                                          <div className="w-48">
                                                              <label className="form-label" htmlFor="role">Role</label>
                                                              <input type="text" className="form-control" id="role" defaultValue="Marketing Executive" />
                                                          </div>
                                                      </div>
                                                      <div className="col-9 col-md-10">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="name">Name</label>
                                                                  <input type="text" className="form-control" id="name" defaultValue="Riya Patel" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Email</label>
                                                                  <input type="email" className="form-control" id="email" defaultValue="riya.patel@example.com" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="email">Joined Date</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="12-09-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="phone">Phone</label>
                                                                  <input type="text" className="form-control" id="phone" defaultValue="+91 9988776655" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="lastLogin">Last Login</label>
                                                                  <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" defaultValue="29-12-2025" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="staffStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalSales">Total Sales</label>
                                                                  <input type="text" className="form-control" id="totalSales" defaultValue="$6,750" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="department">Department</label>
                                                                  <input type="text" className="form-control" id="department" defaultValue="Marketing" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="address">Address</label>
                                                                  <input type="text" className="form-control" id="address" defaultValue="45 Garden Street, Andheri" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="city">City</label>
                                                                  <input type="text" className="form-control" id="city" defaultValue="Mumbai" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="country">Country</label>
                                                                  <input type="text" className="form-control" id="country" defaultValue="India" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">25</b> Results</p>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Staff?</h5>
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
