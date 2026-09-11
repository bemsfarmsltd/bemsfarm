import { Link } from 'react-router-dom'

export default function TaxSettings() {
  return (
    <div className="container-fluid">
      <div className="mb-5">
              <h4 className="fs-xl">Settings</h4>
              <p className="text-muted">Manage overall store preferences and system configurations.</p>
          </div>
          <ul className="nav nav-underline mb-5 border-bottom nav-primary" id="settings-tab" role="tablist">
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-tax.html" className="nav-link py-6px active" aria-current="page">Tax</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-coupons.html" className="nav-link py-6px" aria-current="page">Coupons</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-general.html" className="nav-link py-6px" aria-current="page">General</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-pos.html" className="nav-link py-6px" aria-current="page">POS</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-payment-gateway.html" className="nav-link py-6px" aria-current="page">Payment Gateway</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-currencies.html" className="nav-link py-6px" aria-current="page">Currencies</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-invoices.html" className="nav-link py-6px" aria-current="page">Invoices</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-manager.html" className="nav-link py-6px" aria-current="page">Manager</a>
              </li>
          </ul>

          <div className="card">
              <div className="card-body">
                  <div className="alert alert-sub-warning alert-dismissible mb-5">
                      <span><span className="fw-medium">Note:</span> Make sure the <span className="fw-medium">"Enable Tax System"</span> toggle is turned on; otherwise, all tax configurations including default tax rate, category-specific taxes, and auto-apply tax will not be applied to POS transactions or invoices.</span>
                      <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                  </div>
                  <div className="pb-6 mb-5 border-bottom">
                      <h6 className="mb-1">Tax Information</h6>
                      <p className="text-muted mb-5">Configure default tax details used across POS and invoices.</p>
                      <div className="d-flex flex-column gap-5">
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="taxRegistrationNumber" className="form-label fs-15 mb-0">Tax Registration Number (GSTIN)</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="taxRegistrationNumber" type="text" className="form-control" placeholder="22AAAAA0000A1Z5" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="taxRegistrationName" className="form-label fs-15 mb-0">Registered Business Name</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="taxRegistrationName" type="text" className="form-control" placeholder="ABC Company" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="taxDisplayName" className="form-label fs-15 mb-0">Tax Display Name</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="taxDisplayName" type="text" className="form-control" defaultValue="GST" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="taxRate" className="form-label fs-15 mb-0">Default Tax Rate (%)</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="taxRate" type="number" className="form-control" placeholder="18" />
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="pb-6 mb-5 border-bottom">
                      <h6 className="mb-1">Tax Controls</h6>
                      <p className="text-muted mb-4">Manage how tax is applied and displayed in your POS system.</p>
                      <div className="d-flex flex-column gap-5">
                          <div className="row align-items-center">
                              <div className="col-md-5 col-lg-4">
                                  <h6 className="mb-1 fw-medium">Enable Tax System</h6>
                              </div>
                              <div className="col-md-7 col-xxl-4">
                                  <div className="form-switch switch-solid-primary mb-1">
                                      <input type="checkbox" id="enableTax" defaultChecked /><label className="label" htmlFor="enableTax"></label>
                                  </div>
                                  <p className="text-muted">Turn tax calculation on or off for all POS transactions.</p>
                              </div>
                          </div>
                          <div className="row align-items-center">
                              <div className="col-md-5 col-lg-4">
                                  <h6 className="mb-1 fw-medium">Auto Apply Tax</h6>
                              </div>
                              <div className="col-md-7 col-xxl-4">
                                  <div className="form-switch switch-solid-primary">
                                      <input type="checkbox" id="autoApplyTax" defaultChecked /><label className="label" htmlFor="autoApplyTax"></label>
                                  </div>
                                  <p className="text-muted">Automatically apply tax when products are added to the cart.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="pb-6 mb-5 border-bottom">
                      <h6 className="mb-1">Category Tax Mapping</h6>
                      <p className="text-muted mb-5">Assign specific tax rates to different product categories for accurate billing.</p>
                      <div className="d-flex flex-column gap-5">
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="productCategory" className="form-label fs-15 mb-0">Product Category</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div id="productCategory"></div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="applyTax" className="form-label fs-15 mb-0">Apply Tax</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div id="applyTax"></div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="Country" className="form-label fs-15 mb-0">Country</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="Country" type="text" className="form-control" placeholder="Enter country" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="State" className="form-label fs-15 mb-0">State</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="State" type="text" className="form-control" placeholder="Enter state" />
                              </div>
                          </div>
                          <div className="row mt-3 g-3">
                              <div className="col-md-5 col-lg-4">
                                  <div className="form-check">
                                      <input className="form-check-input" type="checkbox" id="showTaxInvoice" defaultChecked />
                                      <label className="form-check-label" htmlFor="showTaxInvoice">Show tax amount on invoice</label>
                                  </div>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div className="form-check">
                                      <input className="form-check-input" type="checkbox" id="showTaxBreakdown" defaultChecked />
                                      <label className="form-check-label" htmlFor="showTaxBreakdown">Show tax breakup (CGST / SGST)</label>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="mb-5">
                      <h6 className="mb-1">Tax Configuration</h6>
                      <p className="text-muted mb-5">Assign specific tax rates to different product categories for accurate billing.</p>
                      <div className="d-flex flex-column gap-5">
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="taxType" className="form-label fs-15 mb-0">Tax Type</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div id="taxType"></div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="calculationMethod" className="form-label fs-15 mb-0">Tax Calculation Method</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div id="calculationMethod"></div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="text-end">
                      <button className="btn btn-outline-light border me-1">Cancel</button>
                      <button className="btn btn-primary">Save</button>
                  </div>
              </div>
          </div>
    </div>
  )
}
