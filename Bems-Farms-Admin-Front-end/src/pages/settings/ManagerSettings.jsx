import { Link } from 'react-router-dom'

export default function ManagerSettings() {
  return (
    <div className="container-fluid">
      <div className="mb-5">
              <h4 className="fs-xl">Settings</h4>
              <p className="text-muted">Manage overall store preferences and system configurations.</p>
          </div>
          <ul className="nav nav-underline mb-5 border-bottom nav-primary" id="settings-tab" role="tablist">
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-tax.html" className="nav-link py-6px" aria-current="page">Tax</a>
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
                  <a href="apps-setting-manager.html" className="nav-link py-6px active" aria-current="page">Manager</a>
              </li>
          </ul>

          <div className="card">
              <div className="card-body">
                  <div className="pb-6 mb-5 border-bottom">
                      <h6 className="mb-1">System Overview</h6>
                      <p className="text-muted mb-5">
                          Current operational status of key POS system components.
                      </p>
                      <div className="d-flex flex-column gap-6">
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label className="form-label fs-15 mb-0">POS System Status</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <span className="bg-success-subtle text-success border border-success-subtle badge">Active</span>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label className="form-label fs-15 mb-0">Invoice Mode</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <span className="bg-info-subtle text-info border border-info-subtle badge">Thermal</span>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label className="form-label fs-15 mb-0">Tax System</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div className="d-flex gap-6">
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="defaultCheck1" defaultChecked />
                                          <label className="form-check-label" htmlFor="defaultCheck1">
                                              Enabled
                                          </label>
                                      </div>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="defaultCheck2" />
                                          <label className="form-check-label" htmlFor="defaultCheck2">
                                              Disabled
                                          </label>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="pb-6 mb-5 border-bottom">
                      <h6 className="mb-1">Core Feature Controls</h6>
                      <p className="text-muted mb-4">
                          Enable or disable essential POS functionalities.
                      </p>
                      <div className="d-flex flex-column gap-5">
                          <div className="row align-items-center">
                              <div className="col-md-5 col-lg-4">
                                  <h6 className="mb-1 fw-medium">Enable POS System</h6>
                              </div>
                              <div className="col-md-7 col-xxl-4">
                                  <div className="form-switch switch-solid-primary mb-1">
                                      <input type="checkbox" id="enablePOS" defaultChecked />
                                      <label className="label" htmlFor="enablePOS"></label>
                                  </div>
                                  <p className="text-muted">Turn the POS system on or off globally.</p>
                              </div>
                          </div>
                          <div className="row align-items-center">
                              <div className="col-md-5 col-lg-4">
                                  <h6 className="mb-1 fw-medium">Offline POS Mode</h6>
                              </div>
                              <div className="col-md-7 col-xxl-4">
                                  <div className="form-switch switch-solid-primary">
                                      <input type="checkbox" id="offlinePOS" />
                                      <label className="label" htmlFor="offlinePOS"></label>
                                  </div>
                                  <p className="text-muted">Allow sales when internet connection is unavailable.</p>
                              </div>
                          </div>
                          <div className="row align-items-center">
                              <div className="col-md-5 col-lg-4">
                                  <h6 className="mb-1 fw-medium">Discounts & Coupons</h6>
                              </div>
                              <div className="col-md-7 col-xxl-4">
                                  <div className="form-switch switch-solid-primary">
                                      <input type="checkbox" id="discounts" />
                                      <label className="label" htmlFor="discounts"></label>
                                  </div>
                                  <p className="text-muted">Enable discount codes and promotional offers.</p>
                              </div>
                          </div>
                          <div className="row align-items-center">
                              <div className="col-md-5 col-lg-4">
                                  <h6 className="mb-1 fw-medium">Loyalty Program</h6>
                              </div>
                              <div className="col-md-7 col-xxl-4">
                                  <div className="form-switch switch-solid-primary">
                                      <input type="checkbox" id="loyaltyProgram" defaultChecked />
                                      <label className="label" htmlFor="loyaltyProgram"></label>
                                  </div>
                                  <p className="text-muted">Reward repeat customers with loyalty points.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="pb-6 mb-5 border-bottom">
                      <h6 className="mb-1">Default Manager Rules</h6>
                      <p className="text-muted mb-5">
                          System-wide defaults applied automatically.
                      </p>
                      <div className="d-flex flex-column gap-5">
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="paymentMethod" className="form-label fs-15 mb-0">Default Payment Method</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="paymentMethod" type="text" className="form-control" defaultValue="Cash" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoiceFormat" className="form-label fs-15 mb-0">Invoice Format</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="invoiceFormat" type="text" className="form-control" defaultValue="Thermal" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="roundinMethod" className="form-label fs-15 mb-0">Rounding Method</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="roundinMethod" type="text" className="form-control" defaultValue="Nearest 0.05" />
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="mb-5">
                      <h6 className="mb-1">Backup & Safety</h6>
                      <p className="text-muted mb-4">
                          Manage configuration backups and recovery.
                      </p>
                      <div className="d-flex flex-column gap-4">
                          <p className="mb-0">
                              Automatic daily backup scheduled at <strong>2:00 AM</strong>.
                          </p>
                          <div className="d-flex gap-2">
                              <button className="btn btn-outline-light border">
                                  Export Settings
                              </button>
                              <button className="btn btn-primary">
                                  Backup Now
                              </button>
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
