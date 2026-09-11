import { Link } from 'react-router-dom'

export default function POSSettings() {
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
                  <a href="apps-setting-pos.html" className="nav-link py-6px active" aria-current="page">POS</a>
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
                  <h6 className="mb-1">POS Configuration Settings</h6>
                  <p className="text-muted mb-5">Manage POS receipts, printers, customer types, stock alerts, and payment options.</p>
                  <div className="d-flex flex-column gap-6">
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxRegistrationNumber" className="form-label mb-0 fs-15">Receipt Format</label>
                          </div>
                          <div className="col-md-8">
                              <div id="receiptFormate" className="w-56"></div>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxRegistrationNumber" className="form-label mb-0 fs-15">POS Printer Settings</label>
                          </div>
                          <div className="col-md-8">
                              <div id="posPrinter" className="w-56"></div>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxRegistrationName" className="form-label mb-0 fs-15">Auto Print Receipt</label>
                          </div>
                          <div className="col-md-8">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-1" defaultChecked /><label className="label" htmlFor="switch-light-1"></label>
                              </div>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxDisplayName" className="form-label mb-0 fs-15">Default Customer Type</label>
                          </div>
                          <div className="col-md-8">
                              <div className="d-flex flex-wrap align-items-center gap-6">
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck1" />
                                      <label className="form-check-label" htmlFor="defaultCheck1">
                                          Regular
                                      </label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck2" />
                                      <label className="form-check-label" htmlFor="defaultCheck2">
                                          Member
                                      </label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck3" />
                                      <label className="form-check-label" htmlFor="defaultCheck3">
                                          Wholesale
                                      </label>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxRate" className="form-label mb-0 fs-15">Low Stock Alert</label>
                          </div>
                          <div className="col-md-8">
                              <input type="number" className="form-control w-28" id="lowStock" placeholder="Enter threshold" defaultValue="5" />
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxRate" className="form-label mb-0 fs-15">Enable Barcode Scanning</label>
                          </div>
                          <div className="col-md-8">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-2" defaultChecked /><label className="label" htmlFor="switch-light-2"></label>
                              </div>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxDisplayName" className="form-label mb-0 fs-15">Payment Methods</label>
                          </div>
                          <div className="col-md-8">
                              <div className="d-flex flex-wrap align-items-center gap-6">
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck4" />
                                      <label className="form-check-label" htmlFor="defaultCheck4">
                                          Cash
                                      </label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck5" />
                                      <label className="form-check-label" htmlFor="defaultCheck5">
                                          Card
                                      </label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck6" />
                                      <label className="form-check-label" htmlFor="defaultCheck6">
                                          UPI
                                      </label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck7" />
                                      <label className="form-check-label" htmlFor="defaultCheck7">
                                          Wallet
                                      </label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="defaultCheck8" />
                                      <label className="form-check-label" htmlFor="defaultCheck8">
                                          COD
                                      </label>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-4">
                              <label htmlFor="taxRate" className="form-label mb-0 fs-15">Enable Order Notes</label>
                          </div>
                          <div className="col-md-8">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-2" /><label className="label" htmlFor="switch-light-2"></label>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="text-end mt-5">
                      <button className="btn btn-outline-light border me-1">Cancel</button>
                      <button className="btn btn-primary">Save</button>
                  </div>
              </div>
          </div>
    </div>
  )
}
