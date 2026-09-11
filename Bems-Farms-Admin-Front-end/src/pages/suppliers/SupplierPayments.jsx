import { Link } from 'react-router-dom'

export default function SupplierPayments() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Payments</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
                  <li className="breadcrumb-item active">Payments</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between mb-4">
                      <h5 className="card-title mb-0">All Payments</h5>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                          <div id="spplierStatus" className="w-44"></div>
                          <div className="d-flex flex-wrap align-items-center gap-2">
                              <a href="#" className="avatar size-10 bg-warning-subtle rounded p-2">
                                  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAB2AAAAdgB+lymcgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANESURBVHic7ZtLaBNRFIa/O5nWakJpfaXWBwU1LkQQxI2gIIqvigtBN4JrwZUbQbAbF+5UBBHdiO5UFF8gIihoRVERtVqQLkRqrH3Z2odNjZ05LtxqZnLndm5a54Nswnn88+fezJnJRBESeXMmh5s6gi9bUCwAVNjcknQ+/Pv7jiv0vx8jnT2rdj84bKTXXwh1ENJ2bgfKvwqkjSv4lwEAn+5DcQTmr+5Q+16vMN4bcIICpP38EpR/hck4+FAI9L7OycVcr8ielOnqgQbgeYeAjOnGZTPYMY9Lb/vk6p5qk2WDDVBsNNkwEoMd9Yy+HJC722tNlQw2QJhnqpkRhj6l+fKuV27typooF2YFmPm2N8lofgbdz/NybefyqKWCDahUxnpc+p99kBvNa6KUmboGABS+OXQ/fSE3m9fplpjaBgCMDzp0tT6RW5ubddKnvgEAP4cV+Wd35ObW/eWmTg8DAIo/FJ8fXZJrmw+VkzZ9DACYGIeuxyfl+qZjYVMq2wCnqvwcrwj51pawJlS2AZkFenl+EbqetsjtbWuDQl29DjFRnwPfg5FO8H6Vl+t7MNp3GVhaKqyyDVAOzF3556WDm8nCq5Ihlb0FoiLFmqCQ6W1ACBIDbAuwTWKAbQG2SQywLcA22oOQ73v0fGyjMNyPiGgL+D78UzsXFDXVDisaq3FTep+l9goY+dbF2FBfpIOPjjBe9Pg6OKFdQduAlGv09nwkqlz9nay9BTL185lYlKMwPBBpFRQKPdq5AJmZDg11+pc0ES6GFHXZJuqyTfolgMaaEr8NxsB/fxZIDLAtwDaJAbYF2CaZBHVbJ5NgMgkmk2AyCU4HEgNsC7BNYoBtAbaJdRJ03CrmLFxG7dzFum2NE+sk6E/8or/zA+J7um2NE/sk6KRccCpn58U6CTquS322qaIePrU+CdqmctaiJRIDbAuwTWKAbQG2SQywLcA2iQGBEYLN276TTpg/TfXFoGNycNxiYEhgEVF271pGwZ3VHhQSYgX4p4ARE3pixUkJVekDgWFBAWrVwc84shf4YURYHKiUkG44qtafKP2oOCHPAmrlwXs4shrkAqg84EcWaRoFpGZ41MzuINO4UW04fTxM2m9+4hqehcgNDwAAAABJRU5ErkJggg==" alt="Image" className="img-fluid" />
                              </a>
                              <a href="#" className="avatar size-10 bg-success-subtle rounded p-2">
                                  <img src="data:image/png;base64,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" alt="Image" className="img-fluid" />
                              </a>
                              <a href="#" className="avatar size-10 bg-danger-subtle rounded p-2">
                                  <img src="data:image/png;base64,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" alt="Image" className="img-fluid" />
                              </a>
                          </div>
                          <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addPaymentModal"><i data-lucide="plus" className="size-4 me-1"></i>Add Payments</button>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div className="position-relative flex-shrink-0">
                          <input type="text" id="lostItemSearch" className="form-control ps-10" placeholder="Search Supplier..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                          <input type="text" className="form-control w-56" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose Last Date" />
                          <div id="paymentStatus" className="w-52"></div>
                          <div id="paymentMethod" className="w-52"></div>
                      </div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table table-borderless text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSuppliers" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Supplier</th>
                                  <th className="fw-medium text-muted">Total Purchase</th>
                                  <th className="fw-medium text-muted">Total Paid</th>
                                  <th className="fw-medium text-muted">Pending Amount</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Last Date</th>
                                  <th className="fw-medium text-muted">Method</th>
                                  <th className="fw-medium text-muted">Actions</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Sunrise Wholesale</a>
                                      </div>
                                  </td>
                                  <td>$42,380.00</td>
                                  <td>$30,000.00</td>
                                  <td>$12,380.00</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Success</span></td>
                                  <td>15 Dec, 2025</td>
                                  <td>Bank Transfer</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Global Traders</a>
                                      </div>
                                  </td>
                                  <td>$28,500.00</td>
                                  <td>$20,000.00</td>
                                  <td>$8,500.00</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>10 Dec, 2025</td>
                                  <td>Credit Card</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Oceanic Supplies</a>
                                      </div>
                                  </td>
                                  <td>$35,750.00</td>
                                  <td>$35,750.00</td>
                                  <td>$0.00</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Success</span></td>
                                  <td>12 Dec, 2025</td>
                                  <td>UPI</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Metro Traders</a>
                                      </div>
                                  </td>
                                  <td>$18,900.00</td>
                                  <td>$10,000.00</td>
                                  <td>$8,900.00</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>08 Dec, 2025</td>
                                  <td>Bank Transfer</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Evergreen Supplies</a>
                                      </div>
                                  </td>
                                  <td>$50,200.00</td>
                                  <td>$40,000.00</td>
                                  <td>$10,200.00</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Failed</span></td>
                                  <td>05 Dec, 2025</td>
                                  <td>Credit Card</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-11-bzS6tHsV.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Prime Wholesale</a>
                                      </div>
                                  </td>
                                  <td>$37,800.00</td>
                                  <td>$25,000.00</td>
                                  <td>$12,800.00</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>14 Dec, 2025</td>
                                  <td>Bank Transfer</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-12-CfsiEgBV.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Continental Traders</a>
                                      </div>
                                  </td>
                                  <td>$45,600.00</td>
                                  <td>$45,600.00</td>
                                  <td>$0.00</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Success</span></td>
                                  <td>13 Dec, 2025</td>
                                  <td>UPI</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-13-NgroKY8u.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Royal Traders</a>
                                      </div>
                                  </td>
                                  <td>$32,000.00</td>
                                  <td>$20,000.00</td>
                                  <td>$12,000.00</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Failed</span></td>
                                  <td>09 Dec, 2025</td>
                                  <td>Credit Card</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-14-BWimhkHc.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Harbor Supplies</a>
                                      </div>
                                  </td>
                                  <td>$21,450.00</td>
                                  <td>$15,000.00</td>
                                  <td>$6,450.00</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Failed</span></td>
                                  <td>07 Dec, 2025</td>
                                  <td>Bank Transfer</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-15-Bm8xnKEs.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Northern Traders</a>
                                      </div>
                                  </td>
                                  <td>$40,500.00</td>
                                  <td>$40,500.00</td>
                                  <td>$0.00</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Success</span></td>
                                  <td>14 Dec, 2025</td>
                                  <td>UPI</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-edit-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">16</b> Results</p>
                      </div>
                      <div className="col-md-6">
                          <nav aria-label="Page navigation example">
                              <ul className="pagination justify-content-center justify-content-md-end mb-0 products-pagination">
                                  <li className="page-item disabled"><a className="page-link" href="#"><i data-lucide="chevron-left" className="size-4"></i>Previous</a></li>
                                  <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                  <li className="page-item"><a className="page-link" href="#">2</a></li>
                                  <li className="page-item"><a className="page-link" href="#">Next<i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addPaymentModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title">Add Payment</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                      </div>
                      <div className="modal-body">
                          <form>
                              <div className="row g-3">
                                  <div className="col-md-6">
                                      <label htmlFor="referenceId" className="form-label">Reference ID <span className="text-danger">*</span></label>
                                      <input id="referenceId" type="text" className="form-control" placeholder="#ORD1032" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="paymentDate" className="form-label">Payment Date <span className="text-danger">*</span></label>
                                      <input id="paymentDate" type="text" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="paidTo" className="form-label">Paid To <span className="text-danger">*</span></label>
                                      <input to="paidTo" type="text" className="form-control" placeholder="Sunrise Wholesale" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="paymentAmount" className="form-label">Payment Amount <span className="text-danger">*</span></label>
                                      <input id="paymentAmount" type="number" className="form-control" placeholder="12000.00" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="addPaymentMethod" className="form-label">Payment Method</label>
                                      <div id="addPaymentMethod"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="paymentStatus" className="form-label">Payment Status</label>
                                      <div id="paymentStatus"></div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="remainingDate" className="form-label">Remaining Due</label>
                                      <input id="remainingDate" type="number" className="form-control" placeholder="3500.00" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="transactionID" className="form-label">Transaction ID</label>
                                      <input id="transactionID" type="text" className="form-control" placeholder="TXN-459632" />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="Notes" className="form-label">Notes</label>
                                      <textarea id="Notes" className="form-control" rows="3" placeholder="Payment notes..."></textarea>
                                  </div>
                              </div>
                              <div className="d-flex gap-3 mt-4">
                                  <button type="button" className="btn btn-light w-50" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" className="btn btn-primary w-50">Save Payment</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Payment?</h5>
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
