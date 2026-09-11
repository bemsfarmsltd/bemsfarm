import { Link } from 'react-router-dom'

export default function AddStore() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Add Store</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Multi Store</a></li>
                  <li className="breadcrumb-item active">Add Store</li>
              </ul>
          </div>
          <form>
              <div className="card">
                  <div className="card-header">
                      <h5 className="card-title mb-0">Basic Store Information</h5>
                  </div>
                  <div className="card-body">
                      <div className="row align-items-center g-5">
                          <div className="col-md-6">
                              <label htmlFor="storeId" className="form-label">Store ID <span className="text-danger">*</span></label>
                              <input type="text" id="storeId" className="form-control" placeholder="STR-009" required />
                          </div>
                          <div className="col-md-6">
                              <label htmlFor="storeName" className="form-label">Store Name <span className="text-danger">*</span></label>
                              <input type="text" id="storeName" className="form-control" placeholder="Main City Store" required />
                          </div>
                          <div className="col-lg-4">
                              <div className="mb-5">
                                  <label className="form-label">Store Type</label>
                                  <div id="storeType"></div>
                              </div>
                              <div>
                                  <label className="form-label">Store Status</label>
                                  <div id="storeStatus"></div>
                              </div>
                          </div>
                          <div className="col-lg-8">
                              <label htmlFor="location" className="form-label">Location <span className="text-danger">*</span></label>
                              <textarea className="form-control" id="refundReason" rows="5" placeholder="Enter Location Details here..." required></textarea>
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="city" className="form-label">City</label>
                              <input type="text" id="city" className="form-control" placeholder="City" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="state" className="form-label">State</label>
                              <input type="text" id="state" className="form-control" placeholder="State" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="zip" className="form-label">ZIP / Postal Code</label>
                              <input type="text" id="zip" className="form-control" placeholder="10001" />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card">
                  <div className="card-header">
                      <h5 className="card-title mb-0">Manager Information</h5>
                  </div>
                  <div className="card-body">
                      <div className="row align-items-center g-5">
                          <div className="col-lg-6">
                              <label htmlFor="uploadDocument" className="form-label">Upload Document</label>
                              <label htmlFor="uploadDocument" className="avatar flex-column border bg-light bg-opacity-50 border-dashed rounded p-5 h-36">
                                  <i data-lucide="upload-cloud" className="text-muted fs-2"></i>
                                  <p className="mt-2 text-muted text-center mb-0">
                                      <span className="text-body">Drag & Drop</span> Image here or click to upload
                                  </p>
                              </label>
                              <input type="file" id="uploadDocument" className="d-none" />
                          </div>
                          <div className="col-lg-6">
                              <div className="mb-6">
                                  <label htmlFor="managerName" className="form-label">Manager Name <span className="text-danger">*</span></label>
                                  <input type="text" id="managerName" className="form-control" placeholder="John Doe" required />
                              </div>
                              <div>
                                  <label htmlFor="managerRole" className="form-label">Manager Role <span className="text-danger">*</span></label>
                                  <input type="text" id="managerRole" className="form-control" placeholder="Manager" required />
                              </div>
                          </div>
                          <div className="col-md-5">
                              <label htmlFor="department" className="form-label">Department</label>
                              <input type="text" id="department" className="form-control" placeholder="Sales / Operations" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="dateOfJoining" className="form-label">Date of Joining</label>
                              <input type="text" id="dateOfJoining" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Select date" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="managerEmail" className="form-label">Manager Email</label>
                              <input type="email" id="managerEmail" className="form-control" placeholder="john.doe@store.com" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="managerPhone" className="form-label">Manager Phone</label>
                              <input type="text" id="managerPhone" className="form-control" placeholder="+1 212 555 0123" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="alternatePhone" className="form-label">Alternate Phone</label>
                              <input type="text" id="alternatePhone" className="form-control" placeholder="+1 212 555 0456" />
                          </div>
                          <div className="col-md-6">
                              <label htmlFor="managerAddress" className="form-label">Address</label>
                              <input type="text" id="managerAddress" className="form-control" placeholder="123 Main Street, City" />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card">
                  <div className="card-header">
                      <h5 className="card-title mb-0">Operational Details</h5>
                  </div>
                  <div className="card-body">
                      <div className="row align-items-center g-5">
                          <div className="col-md-4">
                              <label htmlFor="openingDate" className="form-label">Opening Date</label>
                              <input type="text" id="openingDate" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Select date" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="storeHours" className="form-label">Store Hours</label>
                              <input type="text" id="storeHours" className="form-control" placeholder="9:00 AM - 9:00 PM" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="staffCount" className="form-label">Number of Staff</label>
                              <input type="number" id="staffCount" className="form-control" placeholder="5" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="posDevices" className="form-label">POS Terminals</label>
                              <input type="number" id="posDevices" className="form-control" placeholder="2" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="dailyTarget" className="form-label">Daily Sales Target</label>
                              <input type="number" id="dailyTarget" className="form-control" placeholder="5000" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="monthlyTarget" className="form-label">Monthly Sales Target</label>
                              <input type="number" id="monthlyTarget" className="form-control" placeholder="150000" />
                          </div>
                          <div className="col-md-3">
                              <label htmlFor="customerTarget" className="form-label">Customer Engagement Goal</label>
                              <input type="number" id="customerTarget" className="form-control" placeholder="300" />
                          </div>
                      </div>
                      <div className="d-flex justify-content-end gap-3 mt-7">
                          <button type="button" className="btn btn-active-secondary"><i className="ri-close-line me-1 align-middle"></i>Cancel</button>
                          <button type="submit" className="btn btn-primary">Add Store</button>
                      </div>
                  </div>
              </div>
          </form>
    </div>
  )
}
