import { Link } from 'react-router-dom'

export default function Holidays() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Holidays</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Holidays</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <h5 className="card-title mb-0">Holidays</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search holidays..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="holidayTypeFilter" className="w-48"></div>
                      <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addHolidayModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Holidays</button>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap table-borderless align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Holiday Name</th>
                                  <th className="fw-medium text-muted">Date</th>
                                  <th className="fw-medium text-muted">Day</th>
                                  <th className="fw-medium text-muted">Type</th>
                                  <th className="fw-medium text-muted">Applicable Staff</th>
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
                                  <td className="fw-medium">New Year</td>
                                  <td>01 Jan 2026</td>
                                  <td>Thursday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Republic Day</td>
                                  <td>26 Jan 2026</td>
                                  <td>Monday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Holi</td>
                                  <td>04 Mar 2026</td>
                                  <td>Wednesday</td>
                                  <td><span className="badge bg-info-subtle text-info border border-info-subtle">Optional</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">Selected Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Good Friday</td>
                                  <td>03 Apr 2026</td>
                                  <td>Friday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Labour Day</td>
                                  <td>01 May 2026</td>
                                  <td>Friday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Eid al-Fitr</td>
                                  <td>22 May 2026</td>
                                  <td>Friday</td>
                                  <td><span className="badge bg-info-subtle text-info border border-info-subtle">Optional</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">Department Wise</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Independence Day</td>
                                  <td>15 Aug 2026</td>
                                  <td>Saturday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Ganesh Chaturthi</td>
                                  <td>11 Sep 2026</td>
                                  <td>Friday</td>
                                  <td><span className="badge bg-info-subtle text-info border border-info-subtle">Optional</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">Selected Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Diwali</td>
                                  <td>08 Nov 2026</td>
                                  <td>Sunday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i> Edit</a></li>
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i> Delete</a></li>
                                          </ul>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td className="fw-medium">Christmas</td>
                                  <td>25 Dec 2026</td>
                                  <td>Friday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
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
                                  <td className="fw-medium">Makar Sankranti</td>
                                  <td>14 Jan 2026</td>
                                  <td>Wednesday</td>
                                  <td><span className="badge bg-info-subtle text-info border border-info-subtle">Optional</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">Selected Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
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
                                  <td className="fw-medium">Raksha Bandhan</td>
                                  <td>29 Aug 2026</td>
                                  <td>Saturday</td>
                                  <td><span className="badge bg-info-subtle text-info border border-info-subtle">Optional</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">Department Wise</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
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
                                  <td className="fw-medium">Gandhi Jayanti</td>
                                  <td>02 Oct 2026</td>
                                  <td>Friday</td>
                                  <td><span className="badge bg-primary-subtle text-primary border border-primary-subtle">Public</span></td>
                                  <td><span className="fs-13 border rounded px-3 py-1">All Staff</span></td>
                                  <td>
                                      <div className="dropdown">
                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                              <i className="ri-more-2-fill"></i>
                                          </a>
                                          <ul className="dropdown-menu dropdown-menu-end">
                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i> View</a></li>
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


          <div className="modal fade" id="addHolidayModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Holiday</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <form id="addHolidayForm">
                              <div className="row g-4">
                                  <div className="col-12">
                                      <label htmlFor="holidayName" className="form-label">Holiday Name <span className="text-danger">*</span></label>
                                      <input type="text" id="holidayName" className="form-control" placeholder="e.g. Independence Day" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="holidayDate" className="form-label">Date <span className="text-danger">*</span></label>
                                      <input type="text" className="form-control" data-datepicker data-date-format="yyyy-MM-dd" placeholder="Choose date" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="holidayDay" className="form-label">Day</label>
                                      <input type="text" id="holidayDay" className="form-control" placeholder="Auto calculated" readOnly />
                                  </div>
                                  <div className="col-md-6">
                                      <label className="form-label">Status <span className="text-danger">*</span></label>
                                      <div id="holidayStatus"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label className="form-label">Applicable Staff <span className="text-danger">*</span></label>
                                      <div id="applicableStaff"></div>
                                  </div>
                                  <div className="col-12">
                                      <label className="form-label">Holiday Type <span className="text-danger">*</span></label>
                                      <div id="holidayType"></div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="holidayDescription" className="form-label">Description</label>
                                      <textarea id="holidayDescription" className="form-control" rows="3" placeholder="Optional notes about this holiday..."></textarea>
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-7">
                                  <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" className="btn btn-primary w-50">Save Holiday</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Holiday?</h5>
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
