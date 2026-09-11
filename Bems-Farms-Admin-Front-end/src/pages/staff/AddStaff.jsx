import { Link } from 'react-router-dom'

export default function AddStaff() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Add Staff</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Staff</a></li>
                  <li className="breadcrumb-item active">Add Staff</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-xxl-7">
                  <div className="card">
                      <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                          <div>
                              <h5 className="card-title mb-1">Add Staff</h5>
                              <p className="text-muted">Enter staff details to add a new employee.</p>
                          </div>
                          <div className="position-relative flex-shrink-0 w-56">
                              <input type="text" className="form-control ps-10" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Today date" />
                              <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                      </div>
                      <div className="card-body">
                          <form>
                              <div className="row g-5">
                                  <div className="col-12">
                                      <input type="file" className="filepond w-56 mx-auto" id="squareUpload" name="filepond" accept="image/png, image/jpeg, image/gif" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="fullName" className="form-label">Full Name</label>
                                      <input type="text" id="fullName" className="form-control" placeholder="John Doe" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="email" className="form-label">Email</label>
                                      <input type="email" id="email" className="form-control" placeholder="john@example.com" required />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="phone" className="form-label">Phone Number</label>
                                      <input type="tel" id="phone" className="form-control" placeholder="+91 1234567890" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="employeeId" className="form-label">Employee ID</label>
                                      <input type="text" id="employeeId" className="form-control" placeholder="EMP001" />
                                  </div>
                                  <div className="col-md-4">
                                      <label className="form-label">Gender</label>
                                      <div className="d-flex gap-3">
                                          <div className="form-check">
                                              <input className="form-check-input" type="radio" name="gender" id="male" defaultValue="Male" />
                                              <label className="form-check-label" htmlFor="male">Male</label>
                                          </div>
                                          <div className="form-check">
                                              <input className="form-check-input" type="radio" name="gender" id="female" defaultValue="Female" />
                                              <label className="form-check-label" htmlFor="female">Female</label>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="address" className="form-label">Address</label>
                                      <textarea id="address" className="form-control" rows="3" placeholder="Enter full address"></textarea>
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="department" className="form-label">Department</label>
                                      <div id="department" required></div>
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="role" className="form-label">Role</label>
                                      <div id="role" required></div>
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="joiningDate" className="form-label">Joining Date</label>
                                      <input type="text" id="joiningDate" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Joining Date" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="staffStatus" className="form-label">Role</label>
                                      <div id="staffStatus" required></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="shift" className="form-label">Shift Timing</label>
                                      <div id="shift"></div>
                                  </div>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-5">
                  <div className="card">
                      <div className="card-header">
                          <h5 className="mb-0 card-title">Education</h5>
                      </div>
                      <div className="card-body">
                          <form>
                              <div className="row g-5">
                                  <div className="col-md-6">
                                      <label htmlFor="highestQualification" className="form-label">Highest Qualification</label>
                                      <div id="highestQualification"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="university" className="form-label">University / College</label>
                                      <input type="text" id="university" className="form-control" placeholder="Enter institution name" />
                                  </div>
                                  <div className="col-md-5">
                                      <label htmlFor="fieldOfStudy" className="form-label">Field of Study</label>
                                      <input type="text" id="fieldOfStudy" className="form-control" placeholder="e.g., Computer Science" />
                                  </div>
                                  <div className="col-md-3">
                                      <label htmlFor="passingYear" className="form-label">Year of Passing</label>
                                      <input type="number" id="passingYear" className="form-control" placeholder="YYYY" min="1900" max="2100" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="grade" className="form-label">Grade / Percentage</label>
                                      <input type="text" id="grade" className="form-control" placeholder="e.g., 8.5" />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="uploadDocument" className="form-label">Upload Document</label>
                                      <label htmlFor="uploadDocument" className="avatar flex-column border border-dashed rounded p-5 h-36">
                                          <i data-lucide="upload-cloud" className="text-muted fs-2"></i>
                                          <p className="mt-2 text-muted text-center mb-0">
                                              <span className="text-body">Drag & Drop</span> Document here or click to upload
                                          </p>
                                      </label>
                                      <input type="file" id="uploadDocument" className="d-none" />
                                  </div>
                              </div>
                          </form>
                      </div>
                  </div>
                  <div className="card">
                      <div className="card-header">
                          <h5 className="mb-0 card-title">Experience</h5>
                      </div>
                      <div className="card-body">
                          <form>
                              <div className="row g-5">
                                  <div className="col-md-6">
                                      <label htmlFor="prevCompany" className="form-label">Previous Company</label>
                                      <input type="text" id="prevCompany" className="form-control" placeholder="Enter company name" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="jobTitle" className="form-label">Job Title</label>
                                      <input type="text" id="jobTitle" className="form-control" placeholder="Enter job title" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="startDate" className="form-label">Start Date</label>
                                      <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Start date" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="endDate" className="form-label">End Date</label>
                                      <input type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="End date" />
                                  </div>
                                  <div className="col-md-12">
                                      <label htmlFor="responsibilities" className="form-label">Responsibilities / Achievements</label>
                                      <textarea id="responsibilities" className="form-control" rows="4" placeholder="Describe key responsibilities or achievements"></textarea>
                                  </div>
                              </div>
                              <div className="mt-7 d-flex justify-content-end">
                                  <button type="button" className="btn btn-active-secondary"><i className="ri-close-line me-1 align-middle"></i>Cancel</button>
                                  <button type="submit" className="btn btn-primary ms-2">Save Product</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
