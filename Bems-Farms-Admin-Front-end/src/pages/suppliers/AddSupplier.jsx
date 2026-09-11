import { Link } from 'react-router-dom'

export default function AddSupplier() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Add Supplier</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
                  <li className="breadcrumb-item active">Add Supplier</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-xxl-8">
                  <div className="card">
                      <div className="card-header">
                          <h6 className="card-title mb-0">Supplier Information</h6>
                      </div>
                      <div className="card-body">
                          <div className="row g-5">
                              <div className="col-12">
                                  <label htmlFor="supplierImage" className="form-label">Supplier Image</label>
                                  <label htmlFor="supplierImage" className="avatar flex-column border rounded p-5 bg-light bg-opacity-75 h-44">
                                      <i data-lucide="upload-cloud" className="text-muted fs-2"></i>
                                      <p className="mt-2 text-muted mb-0">
                                          <span className="fw-medium text-body">Drag & Drop</span> Image here or click to upload
                                      </p>
                                  </label>
                                  <input type="file" id="supplierImage" className="d-none" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="supplierName" className="form-label">Supplier Name <span className="text-danger">*</span></label>
                                  <input type="text" className="form-control" id="supplierName" placeholder="Enter supplier name" required />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="email" className="form-label">Email <span className="text-danger">*</span></label>
                                  <input type="email" className="form-control" id="email" placeholder="Enter email" required />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="contact" className="form-label">Phone / Contact <span className="text-danger">*</span></label>
                                  <input type="text" className="form-control" id="contact" placeholder="+1 234 567 890" required />
                              </div>
                              <div className="col-md-6">
                                  <label className="form-label d-block mb-5">Supplier Type</label>
                                  <div className="form-check form-check-inline">
                                      <input className="form-check-input" type="radio" name="supplierType" id="localSupplier" defaultValue="local" defaultChecked />
                                      <label className="form-check-label" htmlFor="localSupplier">Local</label>
                                  </div>
                                  <div className="form-check form-check-inline">
                                      <input className="form-check-input" type="radio" name="supplierType" id="internationalSupplier" defaultValue="international" />
                                      <label className="form-check-label" htmlFor="internationalSupplier">International</label>
                                  </div>
                              </div>
                              <div className="col-md-4">
                                  <label htmlFor="country" className="form-label">Country</label>
                                  <div id="country"></div>
                              </div>
                              <div className="col-md-4">
                                  <label htmlFor="city" className="form-label">City</label>
                                  <input type="text" className="form-control" id="city" placeholder="Enter city" />
                              </div>
                              <div className="col-md-4">
                                  <label htmlFor="paymentTerms" className="form-label">Payment Terms</label>
                                  <div id="paymentTerms"></div>
                              </div>
                              <div className="col-12">
                                  <label htmlFor="address" className="form-label">Address</label>
                                  <textarea className="form-control" id="address" rows="3" placeholder="Enter full address"></textarea>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="card">
                      <div className="card-header">
                          <h6 className="card-title mb-0">Company Details</h6>
                      </div>
                      <div className="card-body">
                          <div className="row g-5">
                              <div className="col-12">
                                  <label htmlFor="companyImage" className="form-label">Company Image</label>
                                  <label htmlFor="companyImage" className="avatar flex-column border rounded p-5 bg-light bg-opacity-75 h-44">
                                      <i data-lucide="upload-cloud" className="text-muted fs-2"></i>
                                      <p className="mt-2 text-muted mb-0">
                                          <span className="fw-medium text-body">Drag & Drop</span> Image here or click to upload
                                      </p>
                                  </label>
                                  <input type="file" id="companyImage" className="d-none" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="companyName" className="form-label">Company Name <span className="text-danger">*</span></label>
                                  <input type="text" className="form-control" id="companyName" placeholder="Enter company name" required />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="companyEmail" className="form-label">Company Email</label>
                                  <input type="email" className="form-control" id="companyEmail" placeholder="Enter company email" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="companyPhone" className="form-label">Company Phone</label>
                                  <input type="text" className="form-control" id="companyPhone" placeholder="+1 234 567 890" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="companyWebsite" className="form-label">Website</label>
                                  <input type="text" className="form-control" id="companyWebsite" placeholder="https://example.com" />
                              </div>
                              <div className="col-12">
                                  <label htmlFor="companyAddress" className="form-label">Address</label>
                                  <textarea className="form-control" id="companyAddress" rows="4" placeholder="Company address"></textarea>
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="taxNumber" className="form-label">Tax / VAT Number</label>
                                  <input type="text" className="form-control" id="taxNumber" placeholder="Tax or VAT number" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="industryType" className="form-label">Industry Type</label>
                                  <input type="text" className="form-control" id="industryType" placeholder="e.g., Manufacturing, Retail" />
                              </div>
                              <div className="col-12 d-flex justify-content-end gap-2">
                                  <button type="reset" className="btn btn-outline-light border">Cancel</button>
                                  <button type="submit" className="btn btn-primary">Add Supplier</button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-4">
                  <div className="card">
                      <div className="card-header">
                          <h6 className="card-title mb-0">Bank Details</h6>
                      </div>
                      <div className="card-body">
                          <div className="row g-5">
                              <div className="col-12">
                                  <label htmlFor="bankName" className="form-label">Bank Name</label>
                                  <input type="text" className="form-control" id="bankName" placeholder="Bank Name" />
                              </div>
                              <div className="col-12">
                                  <label htmlFor="accountName" className="form-label">Account Name</label>
                                  <input type="text" className="form-control" id="accountName" placeholder="Account Name" />
                              </div>
                              <div className="col-12">
                                  <label className="form-label d-block">Account Type</label>
                                  <div className="form-check form-check-inline">
                                      <input className="form-check-input" type="radio" name="accountType" id="savings" defaultValue="savings" defaultChecked />
                                      <label className="form-check-label" htmlFor="savings">Savings</label>
                                  </div>
                                  <div className="form-check form-check-inline">
                                      <input className="form-check-input" type="radio" name="accountType" id="current" defaultValue="current" />
                                      <label className="form-check-label" htmlFor="current">Current</label>
                                  </div>
                                  <div className="form-check form-check-inline">
                                      <input className="form-check-input" type="radio" name="accountType" id="other" defaultValue="other" />
                                      <label className="form-check-label" htmlFor="other">Other</label>
                                  </div>
                              </div>
                              <div className="col-12">
                                  <label htmlFor="accountNumber" className="form-label">Account Number</label>
                                  <input type="text" className="form-control" id="accountNumber" placeholder="Account Number" />
                              </div>
                              <div className="col-12">
                                  <label htmlFor="swiftIban" className="form-label">Swift / IBAN</label>
                                  <input type="text" className="form-control" id="swiftIban" placeholder="Swift / IBAN" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="branchCode" className="form-label">Branch Code</label>
                                  <input type="text" className="form-control" id="branchCode" placeholder="Branch Code" />
                              </div>
                              <div className="col-md-6">
                                  <label htmlFor="bankCity" className="form-label">Bank City</label>
                                  <input type="text" className="form-control" id="bankCity" placeholder="City" />
                              </div>
                              <div className="col-12">
                                  <div className="form-check mb-3">
                                      <input className="form-check-input" type="checkbox" id="primaryAccount" />
                                      <label className="form-check-label" htmlFor="primaryAccount">
                                          Set as Primary Account
                                      </label>
                                  </div>
                                  <div className="form-check">
                                      <input className="form-check-input" type="checkbox" id="defaultPayment" />
                                      <label className="form-check-label" htmlFor="defaultPayment">
                                          Default for Payments
                                      </label>
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
