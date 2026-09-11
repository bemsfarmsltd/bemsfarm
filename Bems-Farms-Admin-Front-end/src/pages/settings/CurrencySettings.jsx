import { Link } from 'react-router-dom'

export default function CurrencySettings() {
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
                  <a href="apps-setting-currencies.html" className="nav-link py-6px active" aria-current="page">Currencies</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-invoices.html" className="nav-link py-6px" aria-current="page">Invoices</a>
              </li>
              <li className="nav-item" role="presentation">
                  <a href="apps-setting-manager.html" className="nav-link py-6px" aria-current="page">Manager</a>
              </li>
          </ul>

          <div className="card">
              <div className="card-header d-flex flex-wrap gap-4 align-items-center justify-content-between">
                  <h5 className="card-title mb-1">Currencies</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search currency..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addCurrencyModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Currency</button>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table table-borderless text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllCurrencies" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Currency Name</th>
                                  <th className="fw-medium text-muted">Code</th>
                                  <th className="fw-medium text-muted">Symbol</th>
                                  <th className="fw-medium text-muted">Exchange Rate</th>
                                  <th className="fw-medium text-muted">Created On</th>
                                  <th className="fw-medium text-muted">Last Updated</th>
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
                                  <td>Indian Rupee</td>
                                  <td>INR</td>
                                  <td>₹</td>
                                  <td>Base Currency</td>
                                  <td>2025-12-01</td>
                                  <td>2026-01-01</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>US Dollar</td>
                                  <td>USD</td>
                                  <td>$</td>
                                  <td>1 USD = 83.25 INR</td>
                                  <td>2025-12-10</td>
                                  <td>2026-01-01</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>Euro</td>
                                  <td>EUR</td>
                                  <td>€</td>
                                  <td>1 EUR = 90.10 INR</td>
                                  <td>2025-12-15</td>
                                  <td>2025-12-28</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>British Pound</td>
                                  <td>GBP</td>
                                  <td>£</td>
                                  <td>1 GBP = 104.75 INR</td>
                                  <td>2025-12-18</td>
                                  <td>2026-01-01</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon">
                                              <i className="ri-edit-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>Australian Dollar</td>
                                  <td>AUD</td>
                                  <td>A$</td>
                                  <td>1 AUD = 55.20 INR</td>
                                  <td>2025-12-20</td>
                                  <td>2026-01-01</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon">
                                              <i className="ri-edit-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>Canadian Dollar</td>
                                  <td>CAD</td>
                                  <td>C$</td>
                                  <td>1 CAD = 61.85 INR</td>
                                  <td>2025-12-22</td>
                                  <td>2025-12-30</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon">
                                              <i className="ri-edit-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>Singapore Dollar</td>
                                  <td>SGD</td>
                                  <td>S$</td>
                                  <td>1 SGD = 62.40 INR</td>
                                  <td>2025-12-25</td>
                                  <td>2026-01-01</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon">
                                              <i className="ri-edit-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td>Japanese Yen</td>
                                  <td>JPY</td>
                                  <td>¥</td>
                                  <td>1 JPY = 0.56 INR</td>
                                  <td>2025-12-26</td>
                                  <td>2026-01-01</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon">
                                              <i className="ri-edit-line"></i>
                                          </button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addCurrencyModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Currency</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body position-relative">
                          <form>
                              <div className="row g-5">
                                  <div className="col-12">
                                      <label htmlFor="currencyName" className="form-label">Currency Name</label>
                                      <input id="currencyName" type="text" className="form-control" placeholder="e.g. US Dollar" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="currencyCode" className="form-label">Currency Code</label>
                                      <input id="currencyCode" type="text" className="form-control text-uppercase" placeholder="e.g. USD" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="currencySymbol" className="form-label">Currency Symbol</label>
                                      <input id="currencySymbol" type="text" className="form-control" placeholder="$" />
                                  </div>
                                  <div className="col-md-5">
                                      <label htmlFor="exchangeRate" className="form-label">Exchange Rate</label>
                                      <input id="exchangeRate" type="number" className="form-control" placeholder="1.00" />
                                  </div>
                                  <div className="col-md-7">
                                      <label htmlFor="symbolPosition" className="form-label">Symbol Position</label>
                                      <div id="symbolPosition"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="createOn" className="form-label">Created On</label>
                                      <input id="createOn" type="text" className="form-control" data-datepicker data-date-format="yyyy-MM-dd" placeholder="Created on" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="lastUpdated" className="form-label">Last Updated</label>
                                      <input id="lastUpdated" type="text" className="form-control" data-datepicker data-date-format="yyyy-MM-dd" placeholder="Last Updated" />
                                  </div>
                              </div>
                              <div className="d-flex gap-2 mt-7">
                                  <button type="button" className="btn btn-light w-100" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" className="btn btn-primary w-100">Add Currency</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Currency?</h5>
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
