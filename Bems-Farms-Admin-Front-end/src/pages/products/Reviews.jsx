import { Link } from 'react-router-dom'

export default function Reviews() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Reviews</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Products</a></li>
                  <li className="breadcrumb-item active">Reviews</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-12">
                  <div className="card">
                      <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center border-bottom-0">
                          <ul className="nav nav-underline" role="tablist">
                              <li className="nav-item">
                                  <button className="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all-tab-pane" type="button">All Reviews</button>
                              </li>
                              <li className="nav-item">
                                  <button className="nav-link" id="published-tab" data-bs-toggle="tab" data-bs-target="#published-tab-pane" type="button">Published</button>
                              </li>
                              <li className="nav-item">
                                  <button className="nav-link" id="hidden-tab" data-bs-toggle="tab" data-bs-target="#hidden-tab-pane" type="button">Hidden</button>
                              </li>
                          </ul>
                          <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">
                              <div className="flex-shrink-0">
                                  <label htmlFor="searchProductInput" className="form-label d-none">Search</label>
                                  <div className="position-relative">
                                      <input type="text" className="form-control ps-9" id="searchProductInput" placeholder="Search for..." />
                                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                  </div>
                              </div>
                              <div id="ratingFilter" className="w-44"></div>
                              <div id="statusFilter" className="w-44"></div>
                              <input type="text" className="form-control w-48" data-datepicker placeholder="Choose date" />
                          </div>
                      </div>

                      <div className="card-body pt-0">
                          <div className="tab-content">

                              <div className="tab-pane fade show active" id="all-tab-pane">
                                  <div className="table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead className="border-bottom">
                                              <tr>
                                                  <th>
                                                      <div className="form-check check-primary">
                                                          <input className="form-check-input" type="checkbox" id="checAllData" />
                                                      </div>
                                                  </th>
                                                  <th className="sortable fw-medium text-muted" data-column="customer">Customer <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="rating">Review <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="status">Status <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="product">Product <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody id="reviewsTableBody"></tbody>
                                      </table>
                                  </div>
                                  <div className="row align-items-center g-3 mt-3">
                                      <div className="col-md-6">
                                          <p className="text-muted mb-0" id="paginationInfo">Showing 1-9 of 9 Results</p>
                                      </div>
                                      <div className="col-md-6">
                                          <nav>
                                              <ul className="pagination justify-content-end mb-0" id="pagination"></ul>
                                          </nav>
                                      </div>
                                  </div>
                              </div>


                              <div className="tab-pane fade" id="published-tab-pane">
                                  <div className="table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead className="border-bottom">
                                              <tr>
                                                  <th>
                                                      <div className="form-check check-primary">
                                                          <input className="form-check-input" type="checkbox" id="checAllDataPublished" />
                                                      </div>
                                                  </th>
                                                  <th className="sortable fw-medium text-muted" data-column="customer">Customer <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="rating">Review <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="status">Status <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="product">Product <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody id="reviewsTableBodyPublished"></tbody>
                                      </table>
                                  </div>
                                  <div className="row align-items-center g-3 mt-3">
                                      <div className="col-md-6">
                                          <p className="text-muted mb-0" id="paginationInfoPublished">Showing 0-0 of 0 Results</p>
                                      </div>
                                      <div className="col-md-6">
                                          <nav>
                                              <ul className="pagination justify-content-end mb-0" id="paginationPublished"></ul>
                                          </nav>
                                      </div>
                                  </div>
                              </div>


                              <div className="tab-pane fade" id="hidden-tab-pane">
                                  <div className="table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead className="border-bottom">
                                              <tr>
                                                  <th>
                                                      <div className="form-check check-primary">
                                                          <input className="form-check-input" type="checkbox" id="checAllDataHidden" />
                                                      </div>
                                                  </th>
                                                  <th className="sortable fw-medium text-muted" data-column="customer">Customer <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="rating">Review <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="status">Status <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="sortable fw-medium text-muted" data-column="product">Product <span className="sort-icon"><i className="ri-arrow-up-down-line text-muted"></i></span></th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody id="reviewsTableBodyHidden"></tbody>
                                      </table>
                                  </div>
                                  <div className="row align-items-center g-3 mt-3">
                                      <div className="col-md-6">
                                          <p className="text-muted mb-0" id="paginationInfoHidden">Showing 0-0 of 0 Results</p>
                                      </div>
                                      <div className="col-md-6">
                                          <nav>
                                              <ul className="pagination justify-content-end mb-0" id="paginationHidden"></ul>
                                          </nav>
                                      </div>
                                  </div>
                              </div>
                          </div>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Review?</h5>
                      <input type="hidden" id="deleteSubCategoryId" />
                      <div className="d-flex justify-content-center align-items-center gap-2">
                          <button type="button" className="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                          <button type="button" className="btn btn-link text-reset" data-bs-dismiss="modal">Cancel</button>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
