import { Link } from 'react-router-dom'

export default function InvoiceSettings() {
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
                  <a href="apps-setting-invoices.html" className="nav-link py-6px active" aria-current="page">Invoices</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-manager.html" className="nav-link py-6px" aria-current="page">Manager</a>
              </li>
          </ul>

          <div className="card">
              <div className="card-body">
                  <div className="mb-5">
                      <h6 className="mb-1">Invoice Settings</h6>
                      <p className="text-muted mb-5">Set default invoice details and payment information used across POS and invoices.</p>
                      <div className="d-flex flex-column gap-6">
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoicePrefix" className="form-label fs-15 mb-0">Invoice Number Prefix</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="invoicePrefix" type="text" className="form-control w-56" placeholder="INV-0000" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label className="form-label fs-15 mb-0">Auto Increment Invoice Number</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div className="d-flex gap-8">
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="defaultCheck1" defaultChecked />
                                          <label className="form-check-label" htmlFor="defaultCheck1">Enabled</label>
                                      </div>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="defaultCheck2" />
                                          <label className="form-check-label" htmlFor="defaultCheck2">Disabled</label>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoiceLogo" className="form-label fs-15 mb-0">Invoice Logo</label>
                              </div>
                              <div className="col-md-6 col-lg-4 col-xxl-3">
                                  <label htmlFor="invoiceLogo" className="avatar flex-column border rounded p-5 bg-light bg-opacity-75 h-32">
                                      <i data-lucide="upload-cloud" className="text-muted fs-2"></i>
                                      <p className="mt-2 text-muted mb-0">Drag & Drop Image here or click to upload</p>
                                  </label>
                                  <input type="file" id="invoiceLogo" className="d-none" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoiceDueDays" className="form-label fs-15 mb-0">Invoice Due (Days)</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <input id="invoiceDueDays" type="number" className="form-control w-28" placeholder="10" />
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoiceCurrency" className="form-label fs-15 mb-0">Default Currency</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div id="invoiceCurrency" className="w-56"></div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoiceFormat" className="form-label fs-15 mb-0">Invoice Format</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div id="invoiceFormat" className="w-56"></div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label className="form-label fs-15 mb-0">Show Discount on Invoice</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div className="form-switch switch-light-primary">
                                      <input type="checkbox" id="switch-light-1" /><label className="label" htmlFor="switch-light-1"></label>
                                  </div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label className="form-label fs-15 mb-0">Send Invoice via Email</label>
                              </div>
                              <div className="col-md-5 col-lg-4 col-xxl-3">
                                  <div className="form-switch switch-light-primary">
                                      <input type="checkbox" id="switch-light-2" defaultChecked /><label className="label" htmlFor="switch-light-2"></label>
                                  </div>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoicePaymentTerms" className="form-label fs-15 mb-0">Payment Terms</label>
                              </div>
                              <div className="col-md-6 col-xxl-5">
                                  <textarea id="invoicePaymentTerms" className="form-control" rows="4" placeholder="Optional notes about payment terms..."></textarea>
                              </div>
                          </div>
                          <div className="row align-items-center gap-2">
                              <div className="col-md-5 col-lg-4">
                                  <label htmlFor="invoiceBankInfo" className="form-label fs-15 mb-0">Payment Information</label>
                              </div>
                              <div className="col-md-6 col-xxl-5">
                                  <textarea id="invoiceBankInfo" className="form-control" rows="4" placeholder="Optional notes about payment information..."></textarea>
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
