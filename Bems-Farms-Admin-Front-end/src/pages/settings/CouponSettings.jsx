import { Link } from 'react-router-dom'

export default function CouponSettings() {
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
                  <a href="apps-setting-coupons.html" className="nav-link py-6px active" aria-current="page">Coupons</a>
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
              <div className="card-header d-flex flex-wrap gap-4 align-items-center justify-content-between">
                  <h5 className="card-title mb-1">Coupon List</h5>
                  <div className="position-relative">
                      <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search coupon..." />
                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllCoupons" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Name</th>
                                  <th className="fw-medium text-muted">Code</th>
                                  <th className="fw-medium text-muted">Type</th>
                                  <th className="fw-medium text-muted">Discount</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Start Date</th>
                                  <th className="fw-medium text-muted">End Date</th>
                                  <th className="fw-medium text-muted">Action</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Weekend Sale</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">WEEKENDSALE</span></td>
                                  <td>Percentage</td>
                                  <td>10%</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-1" defaultChecked /><label className="label" htmlFor="switch-light-1"></label></div>
                                  </td>
                                  <td>2026-01-01</td>
                                  <td>2026-01-31</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#weekendSaleCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>New Year Special</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">NEWYEAR50</span></td>
                                  <td>Fixed Amount</td>
                                  <td>$50</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-2" defaultChecked /><label className="label" htmlFor="switch-light-2"></label></div>
                                  </td>
                                  <td>2026-12-25</td>
                                  <td>2026-01-05</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#newYearSpecialCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Electronics Fest</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">ELECFEST</span></td>
                                  <td>Percentage</td>
                                  <td>15%</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-3" defaultChecked /><label className="label" htmlFor="switch-light-3"></label></div>
                                  </td>
                                  <td>2026-02-01</td>
                                  <td>2026-02-10</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#elecFestCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Electronics Fest</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">ELECFEST</span></td>
                                  <td>Percentage</td>
                                  <td>15%</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-3" defaultChecked /><label className="label" htmlFor="switch-light-3"></label></div>
                                  </td>
                                  <td>2026-02-23</td>
                                  <td>2026-02-26</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#elecFestCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Holiday Special</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">HOLIDAY30</span></td>
                                  <td>Fixed Amount</td>
                                  <td>$30</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-5" /><label className="label" htmlFor="switch-light-5"></label></div>
                                  </td>
                                  <td>2026-12-20</td>
                                  <td>2026-12-31</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>New Year Special</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">NEWYEAR50</span></td>
                                  <td>Fixed Amount</td>
                                  <td>$50</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-2" defaultChecked /><label className="label" htmlFor="switch-light-2"></label></div>
                                  </td>
                                  <td>2026-12-19</td>
                                  <td>2026-12-21</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#newYearSpecialCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Black Friday</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">BF2026</span></td>
                                  <td>Percentage</td>
                                  <td>25%</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-7" defaultChecked /><label className="label" htmlFor="switch-light-7"></label></div>
                                  </td>
                                  <td>2026-11-10</td>
                                  <td>2026-11-14</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#blackFridayCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Black Friday</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">BF2026</span></td>
                                  <td>Percentage</td>
                                  <td>25%</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-7" /><label className="label" htmlFor="switch-light-7"></label></div>
                                  </td>
                                  <td>2026-11-25</td>
                                  <td>2026-11-30</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td>Weekend Sale</td>
                                  <td><span className="bg-indigo-subtle text-indigo border border-indigo-subtle badge">WEEKENDSALE</span></td>
                                  <td>Percentage</td>
                                  <td>10%</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary"><input type="checkbox" id="switch-light-8" defaultChecked /><label className="label" htmlFor="switch-light-8"></label></div>
                                  </td>
                                  <td>2026-01-01</td>
                                  <td>2026-01-31</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#weekendSaleCouponModal"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">23</b> Results</p>
                      </div>
                      <div className="col-md-6">
                          <nav aria-label="Page navigation example">
                              <ul className="pagination justify-content-center justify-content-md-end mb-0 products-pagination">
                                  <li className="page-item disabled"><a className="page-link" href="#"><i data-lucide="chevron-left" className="size-4"></i>Previous</a></li>
                                  <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                  <li className="page-item"><a className="page-link" href="#">2</a></li>
                                  <li className="page-item"><a className="page-link" href="#">3</a></li>
                                  <li className="page-item"><a className="page-link" href="#">Next<i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="elecFestCouponModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content electronics-fest-coupon position-relative">
                      <button type="button" className="btn-close position-absolute top-0 end-0 p-5 z-1" data-bs-dismiss="modal"></button>
                      <p className="fw-bolder d-none d-md-block sale-title text-light text-opacity-75 lh-1 px-5 position-absolute top-0 start-0">SALE</p>
                      <div className="modal-body px-6 px-md-8 px-lg-10 pt-md-20 pb-36 position-relative">
                          <div className="row justify-content-md-end">
                              <div className="col-md-7 col-lg-6">
                                  <p className="text-muted">Up to</p>
                                  <h2 className="fw-bold fs-4xl my-2 per-off-title">30% OFF</h2>
                                  <a href="#" className="text-muted d-block">ELECFEST-2026-30OFF</a>
                                  <button type="button" className="btn btn-dark mt-7">Learn more </button>
                              </div>
                          </div>
                      </div>
                      <img src="../assets/buds-DX_GkgwW.png" alt="Buds" className="img-fluid position-absolute bottom-0 w-100 start-0 end-0 mb-5" />
                  </div>
              </div>
          </div>


          <div className="modal fade" id="blackFridayCouponModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content black-friday-coupon border-0">
                      <button type="button" className="btn-close position-absolute top-0 end-0 p-5 z-1" data-bs-dismiss="modal"></button>
                      <div className="modal-body p-6 p-md-8 p-lg-10">
                          <div className="row g-8 align-items-center">
                              <div className="col-md-5">
                                  <div className="d-flex flex-column gap-6 gap-md-16">
                                      <div>
                                          <h2 className="fw-bold mb-0">50% OFF</h2>
                                          <p className="fs-16">Black Friday Mega Sale</p>
                                      </div>
                                      <div>
                                          <a href="#" className="text-indigo mb-1 fs-17 fst-italic fw-medium">"BLACKFRIDAY50"</a>
                                          <span className="text-muted fs-16 d-block">Coupon Code</span>
                                      </div>
                                      <div>
                                          <p className="fs-16">Limited-time offer — don’t miss out!</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="col-md-7">
                                  <img src="../assets/black-friday-DebvN8Uf.png" alt="Image" className="img-fluid" />
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="weekendSaleCouponModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-sm">
                  <div className="modal-content weekend-sale-coupon border-2 border-primary position-relative">
                      <button type="button" className="btn-close position-absolute top-0 end-0 p-5 z-1" data-bs-dismiss="modal"></button>
                      <div className="modal-body p-10 pb-6 text-center border-bottom border-dashed overflow-hidden">
                          <div className="circle-shap size-md bg-primary-subtle rounded-circle position-absolute"></div>
                          <h2 className="fw-bold mb-1">Get 20% off for</h2>
                          <h2 className="fw-bold mb-8">2 weeks</h2>
                          <p className="text-muted fs-lg">Use Coupon code:</p>
                      </div>
                      <div className="p-10 py-8">
                          <a href="#" className="text-center text-muted text-16 text-center d-block text-uppercase">WeekendSale-2026</a>
                      </div>
                      <div className="square-shap w-100 h-100 position-absolute top-0 start-0 bg-primary bg-opacity-75 rounded-2"></div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="newYearSpecialCouponModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-sm">
                  <div className="modal-content border-0">
                       <button type="button" className="btn-close position-absolute top-0 end-0 p-5 z-1" data-bs-dismiss="modal"></button>
                      <div className="modal-body text-center p-6 p-md-8 p-lg-10">
                          <p className="mb-6 fs-17 text-muted"> Get <span className="fw-semibold text-warning">50% Bonus Credits</span> for the First Month of the Year</p>
                          <img src="../assets/gift-BNBUbTKy.png" alt="Gigt" className="img-fluid w-75 mx-auto d-block mb-7" />
                          <P className="fw-semibold fs-lg mb-1">Bonus50</P>
                          <p className="text-muted fs-16 mb-5">Share their referral code</p>
                          <button type="button" className="btn btn-light w-100 py-3">78FTG8965GHY</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Coupon?</h5>
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
