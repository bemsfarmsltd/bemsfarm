import { Link } from 'react-router-dom'

export default function StoreList() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Store List</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Multi Store</a></li>
                  <li className="breadcrumb-item active">Store List</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-md-6 col-xxl-3">
                  <div className="card p-4 store-widget">
                      <div className="d-flex align-items-center gap-3 mb-8">
                          <div className="size-10 avatar bg-primary text-white rounded-3">
                              <div data-lucide="users" className="size-5"></div>
                          </div>
                          <div>
                              <h6 className="fs-16 mb-1 fw-medium">Total Stores</h6>
                              <p className="text-muted">All stores registered in the system</p>
                          </div>
                      </div>
                      <div className="d-flex justify-content-between gap-2 align-items-center">
                          <div>
                              <h4>245 <span className="text-success fw-medium fs-sm"><i className="ri-arrow-up-s-fill"></i>3.5%</span></h4>
                              <p><span className="text-muted">Recurring Stores</span></p>
                          </div>
                          <div className="text-end">
                              <div className="py-1 px-3 d-inline-flex gap-1 mb-2 bg-light bg-opacity-50 text-end rounded-pill">
                                  <div className="progress-circle fs-13" data-strokeWidth="3" data-value="65" data-size="20" data-color="var(--dx-success)" data-text="CSS"></div>
                                  <span>65</span>
                              </div>
                              <p className="text-muted">Engagement</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-md-6 col-xxl-3">
                  <div className="card p-4 store-widget">
                      <div className="d-flex align-items-center gap-3 mb-8">
                          <div className="size-10 avatar bg-success text-white rounded-3">
                              <div data-lucide="check-circle" className="size-5"></div>
                          </div>
                          <div>
                              <h6 className="fs-16 mb-1 fw-medium">Active Stores</h6>
                              <p className="text-muted">Currently operational stores</p>
                          </div>
                      </div>
                      <div className="d-flex justify-content-between gap-2 align-items-center">
                          <div>
                              <h4>180 <span className="text-success fw-medium fs-sm"><i className="ri-arrow-up-s-fill"></i>4.2%</span></h4>
                              <p><span className="text-muted">Stores Open Today</span></p>
                          </div>
                          <div className="text-end">
                              <div className="py-1 px-3 d-inline-flex gap-1 mb-2 bg-light bg-opacity-50 text-end rounded-pill">
                                  <div className="progress-circle fs-13" data-strokeWidth="3" data-value="75" data-size="20" data-color="var(--dx-success)" data-text="CSS"></div>
                                  <span>75</span>
                              </div>
                              <p className="text-muted">Engagement</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-md-6 col-xxl-3">
                  <div className="card p-4 store-widget">
                      <div className="d-flex align-items-center gap-3 mb-8">
                          <div className="size-10 avatar bg-danger text-white rounded-3">
                              <div data-lucide="slash" className="size-5"></div>
                          </div>
                          <div>
                              <h6 className="fs-16 mb-1 fw-medium">Inactive Stores</h6>
                              <p className="text-muted">Temporarily closed or inactive</p>
                          </div>
                      </div>
                      <div className="d-flex justify-content-between gap-2 align-items-center">
                          <div>
                              <h4>65 <span className="text-danger fw-medium fs-sm"><i className="ri-arrow-down-s-fill"></i>1.8%</span></h4>
                              <p><span className="text-muted">Stores Need Attention</span></p>
                          </div>
                          <div className="text-end">
                              <div className="py-1 px-3 d-inline-flex gap-1 mb-2 bg-light bg-opacity-50 text-end rounded-pill">
                                  <div className="progress-circle fs-13" data-strokeWidth="3" data-value="35" data-size="20" data-color="var(--dx-danger)" data-text="CSS"></div>
                                  <span>35</span>
                              </div>
                              <p className="text-muted">Engagement</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-md-6 col-xxl-3">
                  <div className="card p-4 store-widget">
                      <div className="d-flex align-items-center gap-3 mb-8">
                          <div className="size-10 avatar bg-warning text-white rounded-3">
                              <div data-lucide="dollar-sign" className="size-5"></div>
                          </div>
                          <div>
                              <h6 className="fs-16 mb-1 fw-medium">Today’s Sales</h6>
                              <p className="text-muted">Total revenue generated today</p>
                          </div>
                      </div>
                      <div className="d-flex justify-content-between gap-2 align-items-center">
                          <div>
                              <h4>$42,500 <span className="text-success fw-medium fs-sm"><i className="ri-arrow-up-s-fill"></i>5.1%</span></h4>
                              <p><span className="text-muted">Target Achieved</span></p>
                          </div>
                          <div className="text-end">
                              <div className="py-1 px-3 d-inline-flex gap-1 mb-2 bg-light bg-opacity-50 text-end rounded-pill">
                                  <div className="progress-circle fs-13" data-strokeWidth="3" data-value="80" data-size="20" data-color="var(--dx-success)" data-text="CSS"></div>
                                  <span>80</span>
                              </div>
                              <p className="text-muted">Engagement</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="card">
              <div className="card-header d-flex flex-wrap gap-4 align-items-center gap-2 justify-content-between">
                  <h5 className="card-title mb-1">Store List</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center gap-2">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search store..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <a href="apps-multi-store-add.html" className="btn btn-primary"><i data-lucide="plus" className="size-4 me-1"></i>Add Store</a>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllIncome" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Store ID</th>
                                  <th className="fw-medium text-muted">Store Name</th>
                                  <th className="fw-medium text-muted">Location</th>
                                  <th className="fw-medium text-muted">Manager</th>
                                  <th className="fw-medium text-muted">Email</th>
                                  <th className="fw-medium text-muted">Phone</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Store Type</th>
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
                                  <td><a href="#" className="link link-custom-primary">STR-001</a></td>
                                  <td>Main City Store</td>
                                  <td>New York</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">John Doe</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:john.doe@store.com" className="link link-custom-primary">john.doe@store.com</a></td>
                                  <td>+1 212 555 0123</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-002</a></td>
                                  <td>Downtown Outlet</td>
                                  <td>Los Angeles</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-2-CroG7YJ0.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Emily Clark</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:emily.clark@store.com" className="link link-custom-primary">emily.clark@store.com</a></td>
                                  <td>+1 310 555 0145</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-003</a></td>
                                  <td>West End Store</td>
                                  <td>Chicago</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-3-Bz6g7hsE.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Michael Lee</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:michael.lee@store.com" className="link link-custom-primary">michael.lee@store.com</a></td>
                                  <td>+1 773 555 0198</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Closed</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-004</a></td>
                                  <td>Central Mall</td>
                                  <td>Houston</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-4-7l52E1Lo.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Sophia Martinez</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:sophia.m@store.com" className="link link-custom-primary">sophia.m@store.com</a></td>
                                  <td>+1 713 555 0167</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-005</a></td>
                                  <td>North Side Market</td>
                                  <td>San Francisco</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-5-BsT8d_Co.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Daniel Cooper</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:daniel.cooper@store.com" className="link link-custom-primary">daniel.cooper@store.com</a></td>
                                  <td>+1 415 555 0189</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-006</a></td>
                                  <td>East Point Store</td>
                                  <td>Boston</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-1-xhBXJtq9.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Rachel Green</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:rachel.green@store.com" className="link link-custom-primary">rachel.green@store.com</a></td>
                                  <td>+1 617 555 0116</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Closed</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-007</a></td>
                                  <td>City Square</td>
                                  <td>Seattle</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Oliver Brown</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:oliver.brown@store.com" className="link link-custom-primary">oliver.brown@store.com</a></td>
                                  <td>+1 206 555 0134</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-008</a></td>
                                  <td>Harbor View</td>
                                  <td>San Diego</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Isabella White</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:isabella.white@store.com" className="link link-custom-primary">isabella.white@store.com</a></td>
                                  <td>+1 619 555 0172</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-009</a></td>
                                  <td>Uptown Plaza</td>
                                  <td>Dallas</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Henry Wilson</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:henry.wilson@store.com" className="link link-custom-primary">henry.wilson@store.com</a></td>
                                  <td>+1 469 555 0191</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Closed</span></td>
                                  <td>Retail</td>
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">STR-010</a></td>
                                  <td>Market Central</td>
                                  <td>Miami</td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-8 rounded-circle img-fluid" alt="Manager" />
                                          <span className="fw-medium">Natalie Perez</span>
                                      </div>
                                  </td>
                                  <td><a href="mailto:natalie.perez@store.com" className="link link-custom-primary">natalie.perez@store.com</a></td>
                                  <td>+1 305 555 0128</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Open</span></td>
                                  <td>Retail</td>
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


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs">
                  <div className="modal-content p-7 text-center">
                      <div className="d-flex justify-content-center mb-4">
                          <div className="size-14 bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center size-16">
                              <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                          </div>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Store?</h5>
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
