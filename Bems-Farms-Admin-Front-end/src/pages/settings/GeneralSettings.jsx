import { Link } from 'react-router-dom'

export default function GeneralSettings() {
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
                  <a href="apps-setting-general.html" className="nav-link py-6px active" aria-current="page">General</a>
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

          <div className="accordion accordion-boxed accordion-solid-secondary mb-5" id="accordionSecondary">
              <div className="accordion-item">
                  <h2 className="accordion-header">
                      <button className="accordion-button bg-body-secondary shadow-none border rounded-0 p-5 text-body fw-medium" type="button" data-bs-toggle="collapse" data-bs-target="#storeInfo" aria-expanded="true">
                          Store & Business Information
                      </button>
                  </h2>
                  <div id="storeInfo" className="accordion-collapse collapse show" data-bs-parent="#accordionSecondary">
                      <div className="accordion-body border border-top-0 p-5">
                          <div className="row g-5 g-md-6 align-items-center justify-content-between">
                              <div className="col-md-8 col-lg-6">
                                  <h6 className="mb-1 fw-medium">Store Name</h6>
                                  <p className="text-muted">Displayed on invoices, receipts, and other customer-facing documents.</p>
                              </div>
                              <div className="col-md-4 col-lg-3 col-xxl-2">
                                  <input type="text" className="form-control" placeholder="My POS Store" />
                              </div>
                              <div className="col-md-8 col-lg-6">
                                  <h6 className="mb-1 fw-medium">Contact Number</h6>
                                  <p className="text-muted">Used for customer support and store communication.</p>
                              </div>
                              <div className="col-md-4 col-lg-3 col-xxl-2">
                                  <input type="text" className="form-control" placeholder="+91 00000 00000" />
                              </div>
                              <div className="col-md-8 col-lg-6">
                                  <h6 className="mb-1 fw-medium">Email Address</h6>
                                  <p className="text-muted">Receives system alerts and important notifications.</p>
                              </div>
                              <div className="col-md-4 col-lg-3 col-xxl-2">
                                  <input type="email" className="form-control" placeholder="store@email.com" />
                              </div>
                              <div className="col-md-8 col-lg-6">
                                  <h6 className="mb-1 fw-medium">Default Currency</h6>
                                  <p className="text-muted">Applied to pricing and billing calculations.</p>
                              </div>
                              <div className="col-md-4 col-lg-3 col-xxl-2">
                                  <div id="defaultCurrency"></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div className="accordion accordion-boxed accordion-solid-secondary mb-5" id="accordionSecondary">
              <div className="accordion-item">
                  <h2 className="accordion-header">
                      <button className="accordion-button collapsed bg-body-secondary shadow-none border rounded-0 p-5 text-body fw-medium" type="button" data-bs-toggle="collapse" data-bs-target="#posBehavior" aria-expanded="true">
                          POS Behavior & Billing Flow
                      </button>
                  </h2>
                  <div id="posBehavior" className="accordion-collapse collapse show" data-bs-parent="#accordionSecondary">
                      <div className="accordion-body border border-top-0 p-5">
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Enable Quick Sale Mode</h6>
                                  <p className="text-muted">Enable faster checkout by skipping optional billing steps.</p>
                              </div>
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-1" defaultChecked /><label className="label" htmlFor="switch-light-1"></label>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Default Product Visibility</h6>
                                  <p className="text-muted">Control who can view products by default in the POS.</p>
                              </div>
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-2" /><label className="label" htmlFor="switch-light-2"></label>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Default Tax Percentage</h6>
                                  <p className="text-muted">Applied automatically to taxable items during billing.</p>
                              </div>
                              <div className="d-flex align-items-center gap-2">
                                  <input type="number" className="form-control w-36" placeholder="0" />
                                  <span className="text-muted">%</span>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center">
                              <div>
                                  <h6 className="mb-1 fw-medium">Enable VAT Calculation</h6>
                                  <p className="text-muted mb-0">Turn on VAT and apply the entered percentage to sales.</p>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                  <input type="number" className="form-control w-36" placeholder="0" />
                                  <span className="text-muted">%</span>
                                  <div className="form-switch switch-light-primary">
                                      <input type="checkbox" id="switch-light-3" /><label className="label" htmlFor="switch-light-3"></label>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div className="accordion accordion-boxed accordion-solid-secondary mb-5" id="accordionSecondary">
              <div className="accordion-item">
                  <h2 className="accordion-header">
                      <button className="accordion-button collapsed bg-body-secondary shadow-none border rounded-0 p-5 text-body fw-medium" type="button" data-bs-toggle="collapse" data-bs-target="#pricingRules">Pricing, Tax & Rounding Rules</button>
                  </h2>
                  <div id="pricingRules" className="accordion-collapse collapse show" data-bs-parent="#accordionSecondary">
                      <div className="accordion-body border border-top-0 p-5">
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Prices Include Tax</h6>
                                  <p className="text-muted mb-0">Define whether product prices are entered inclusive of tax.</p>
                              </div>
                              <div>
                                  <div id="includeTax"></div>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Rounding Method</h6>
                                  <p className="text-muted mb-0">Choose how totals are rounded during checkout.</p>
                              </div>
                              <div>
                                  <div id="roundingMethod"></div>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Decimal Precision</h6>
                                  <p className="text-muted mb-0">Number of decimal places shown in prices and totals.</p>
                              </div>
                              <div>
                                  <input type="number" className="form-control w-28" defaultValue="2" />
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center">
                              <div>
                                  <h6 className="mb-1 fw-medium">Allow Manual Price Edit</h6>
                                  <p className="text-muted mb-0">Permit staff to change prices during billing.</p>
                              </div>
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-3" defaultChecked /><label className="label" htmlFor="switch-light-3"></label>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div className="accordion accordion-boxed accordion-solid-secondary mb-5" id="accordionSecondary">
              <div className="accordion-item">
                  <h2 className="accordion-header">
                      <button className="accordion-button collapsed bg-body-secondary shadow-none border rounded-0 p-5 text-body fw-medium" type="button" data-bs-toggle="collapse" data-bs-target="#inventoryRules">
                          Inventory & Stock Behavior
                      </button>
                  </h2>
                  <div id="inventoryRules" className="accordion-collapse collapse show" data-bs-parent="#accordionSecondary">
                      <div className="accordion-body border border-top-0 p-5">
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center mb-5 mb-md-6">
                              <div>
                                  <h6 className="mb-1 fw-medium">Auto Deduct Stock After Sale</h6>
                                  <p className="text-muted mb-0">
                                      Automatically reduce inventory when a sale is completed.
                                  </p>
                              </div>
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="autoStock" defaultChecked />
                                  <label className="label" htmlFor="autoStock"></label>
                              </div>
                          </div>
                          <div className="d-flex flex-wrap gap-4 justify-content-between align-items-center">
                              <div>
                                  <h6 className="mb-1 fw-medium">Allow Negative Stock</h6>
                                  <p className="text-muted mb-0">
                                      Continue selling even when available stock is insufficient.
                                  </p>
                              </div>
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="negativeStock" />
                                  <label className="label" htmlFor="negativeStock"></label>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
