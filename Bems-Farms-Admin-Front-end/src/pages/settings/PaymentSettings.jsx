import { Link } from 'react-router-dom'

export default function PaymentSettings() {
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
                  <a href="apps-setting-payment-gateway.html" className="nav-link py-6px active" aria-current="page">Payment Gateway</a>
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
                  <h6 className="mb-1 fs-16">POS Payment Gateway</h6>
                  <p className="text-muted mb-8">Configure payment methods and gateways for POS transactions.</p>
                  <div className="d-flex flex-column gap-8 pb-6 mb-5 border-bottom">
                      <div className="row g-2">
                          <div className="col-md-6 col-lg-5 col-xl-4">
                              <label htmlFor="paymentAmount" className="form-label mb-1 fs-15">Total Payable Amount</label>
                              <p className="text-muted w-96">Set the total amount the customer needs to pay at checkout.</p>
                          </div>
                          <div className="col-md-6 col-xl-4">
                              <div className="input-group mb-5 w-72">
                                  <span className="input-group-text" id="basic-addon3">$</span>
                                  <input type="text" id="paymentAmount" className="form-control" placeholder="1,999" aria-label="Payment Amount" aria-describedby="basic-addon3" />
                              </div>
                              <button type="button" className="btn btn-outline-light border rounded-pill">View Amount Breakdown <i className="ri-arrow-right-line align-middle"></i></button>
                          </div>
                      </div>
                      <div className="row g-2">
                          <div className="col-md-6 col-lg-5 col-xl-4">
                              <label htmlFor="nextPaymentDate" className="form-label mb-0 fs-15">Next Payment Date</label>
                          </div>
                          <div className="col-md-6 col-xl-4">
                              <input type="text" id="nextPaymentDate" className="form-control w-72 mb-2" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Select date" />
                              <p className="text-muted w-96">Choose the date when the next payment is due.</p>
                          </div>
                      </div>
                      <div className="row g-2 align-items-center">
                          <div className="col-md-6 col-lg-5 col-xl-4">
                              <label htmlFor="paymentMethods" className="form-label mb-1 fs-15">Payment Methods Enabled</label>
                              <p className="text-muted w-96">Select the payment options available at the POS.</p>
                          </div>
                          <div className="col-md-6 col-xl-4">
                              <div className="d-flex flex-wrap align-items-center gap-6">
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="payCash" />
                                      <label className="form-check-label" htmlFor="payCash">Cash</label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="payCard" />
                                      <label className="form-check-label" htmlFor="payCard">Card</label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="payUPI" />
                                      <label className="form-check-label" htmlFor="payUPI">UPI</label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="payWallet" />
                                      <label className="form-check-label" htmlFor="payWallet">Wallet</label>
                                  </div>
                                  <div className="form-check check-primary">
                                      <input className="form-check-input" type="checkbox" id="payCOD" />
                                      <label className="form-check-label" htmlFor="payCOD">COD</label>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="row g-2">
                          <div className="col-md-6 col-lg-5 col-xl-4">
                              <label htmlFor="contactEmail" className="form-label mb-0 fs-15">Contact email</label>
                          </div>
                          <div className="col-md-6 col-xl-4">
                              <div className="form-check radio-primary mb-3">
                                  <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" />
                                  <label className="form-check-label fw-medium" htmlFor="flexRadioDefault1">Send to the existing email</label>
                                  <p className="text-muted">example@gotpos.com</p>
                              </div>
                              <div className="form-check radio-primary">
                                  <input className="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" />
                                  <label className="form-check-label fw-medium" htmlFor="flexRadioDefault2">Add another email address</label>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="d-flex flex-wrap gap-3 justify-content-between mb-8">
                      <div>
                          <h6 className="mb-1 fs-16">Linked Card</h6>
                          <p className="text-muted">Manage and view the cards linked for POS payments and quick checkouts.</p>
                      </div>
                      <a href="#" className="link link-custom-primary ms-auto" data-bs-toggle="modal" data-bs-target="#addCardModal"><i className="ri-add-line align-middle me-1"></i>Add Card</a>
                  </div>
                  <div className="d-flex flex-column gap-8 mb-5">
                      <div className="row g-2">
                          <div className="col-md-5 col-lg-4">
                              <div className="form-check check-primary">
                                  <input className="form-check-input" type="checkbox" id="defaultCheck1" defaultChecked />
                                  <label className="form-check-label fw-medium" htmlFor="defaultCheck1">Default Card</label>
                              </div>
                          </div>
                          <div className="col-md-6 col-lg-5 col-xl-3">
                              <div className="card mb-0">
                                  <div className="card-body">
                                      <div className="d-flex justify-content-between gap-2 mb-6">
                                          <span className="fs-16 text-muted">Credit Card Secure Payment</span>
                                          <div className="h-9 w-14 py-6px px-2 border rounded avatar">
                                              <img src="../assets/mastercard-CH_EB252.png" alt="Mastercard" className="img-fluid" />
                                          </div>
                                      </div>
                                      <img src="../assets/chip-Cqb_3nLR.png" alt="Chip" className="h-6 mb-5" />
                                      <div className="d-flex align-items-center gap-6 mb-2">
                                          <p className="text-uppercase fs-13 text-muted letterspace">Alex Morgan</p>
                                          <p className="fs-13 text-muted letterspace">06/12</p>
                                      </div>
                                      <h6 className="mb-0 letterspace-3 fs-17">0125 1598 5632 0024</h6>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="row g-2">
                          <div className="col-md-5 col-lg-4">
                              <div className="form-check check-primary">
                                  <input className="form-check-input" type="checkbox" id="defaultCheck2" />
                                  <label className="form-check-label fw-medium" htmlFor="defaultCheck2">Additional Card</label>
                              </div>
                          </div>
                          <div className="col-md-6 col-lg-5 col-xl-3">
                              <div className="card mb-0">
                                  <div className="card-body">
                                      <div className="d-flex justify-content-between gap-2 mb-6">
                                          <span className="fs-16 text-muted">Primary Secure Payment Card</span>
                                          <div className="h-9 w-14  py-6px px-2 border rounded avatar">
                                              <img src="../assets/visa-Xmp1xRly.png" alt="Visa" className="img-fluid" />
                                          </div>
                                      </div>
                                      <img src="../assets/chip-Cqb_3nLR.png" alt="Chip" className="h-6 mb-5" />
                                      <div className="d-flex align-items-center gap-6 mb-2">
                                          <p className="text-uppercase fs-13 text-muted letterspace">Daniel Cooper</p>
                                          <p className="fs-13 text-muted letterspace">08/07</p>
                                      </div>
                                      <h6 className="mb-0 letterspace-3 fs-17">4589 9856 0025 0048</h6>
                                  </div>
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


          <div className="modal fade" id="addCardModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Card</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body position-relative">
                          <form>
                              <div className="row g-5">
                                  <div className="col-md-6">
                                      <label htmlFor="cardNumber" className="form-label">Card Number</label>
                                      <input id="cardNumber" type="text" className="form-control" placeholder="0000 0000 0000 0000" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="nameOnCard" className="form-label">Name on card</label>
                                      <input id="nameOnCard" type="text" className="form-control" placeholder="Enter name" />
                                  </div>
                                  <div className="col-6 col-md-4">
                                      <label htmlFor="cardExpire" className="form-label">Card expire</label>
                                      <input id="cardExpire" type="text" className="form-control" placeholder="00 / 00" />
                                  </div>
                                  <div className="col-6 col-md-3">
                                      <label htmlFor="cvv" className="form-label">CVV</label>
                                      <input id="cvv" type="number" className="form-control" placeholder="000" />
                                  </div>
                                  <div className="col-md-5">
                                      <label htmlFor="Country" className="form-label">Country</label>
                                      <div id="Country"></div>
                                  </div>
                                  <div className="col-12 pt-5 mt-6 border-top">
                                      <h6 className="mb-0">Contact information</h6>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="Email" className="form-label">Email</label>
                                      <input id="Email" type="text" className="form-control" placeholder="Enter email" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
                                      <input id="phoneNumber" type="text" className="form-control" placeholder="+91 00000 00000" />
                                  </div>
                              </div>
                              <div className="d-flex gap-2 mt-7">
                                  <button type="button" className="btn btn-light w-100" data-bs-dismiss="modal">Close</button>
                                  <button type="submit" className="btn btn-primary w-100">Add Card</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
