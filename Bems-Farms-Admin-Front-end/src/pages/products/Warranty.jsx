import { Link } from 'react-router-dom'

export default function Warranty() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Warranties</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Products</a></li>
                  <li className="breadcrumb-item active">Warranties</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-12">
                  <div className="card">
                      <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
                          <h5 className="card-title mb-0">Warranty List</h5>
                          <button type="button" className="btn btn-primary d-flex align-items-center gap-1 flex-shrink-0" data-bs-toggle="modal" data-bs-target="#addWarrantyModal" id="addWarrantyBtn"><i data-lucide="plus" className="size-4"></i> Add Warranty</button>
                      </div>
                      <div className="card-body">
                          <div className="d-flex flex-wrap gap-5 mb-4 justify-content-between">
                              <div className="flex-shrink-0">
                                  <label htmlFor="searchProductInput" className="form-label d-none">Search</label>
                                  <div className="position-relative">
                                      <input type="text" className="form-control ps-9" id="searchProductInput" placeholder="Search for..." />
                                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                  </div>
                              </div>
                              <div className="d-flex flex-wrap flex-md-nowrap gap-2">
                                  <div id="Status" className="min-w-52"></div>
                                  <div id="warrantyTypeFilter" className="min-w-52"></div>
                              </div>
                          </div>
                          <div className="table-card table-responsive">
                              <table className="table table-borderless align-middle text-nowrap mb-0">
                                  <thead>
                                      <tr className="bg-light border-bottom">
                                          <th>
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" id="checAllData" />
                                              </div>
                                          </th>
                                          <th className="fw-medium text-muted sortable" data-column="product">Product</th>
                                          <th className="fw-medium text-muted sortable" data-column="sku">SKU</th>
                                          <th className="fw-medium text-muted sortable" data-column="customer">Customer</th>
                                          <th className="fw-medium text-muted sortable" data-column="warrantyType">Warranty Type</th>
                                          <th className="fw-medium text-muted sortable" data-column="purchaseDate">Purchase Date</th>
                                          <th className="fw-medium text-muted sortable" data-column="status">Status</th>
                                          <th className="fw-medium text-muted sortable" data-column="warrantyStart">Warranty Start</th>
                                          <th className="fw-medium text-muted sortable" data-column="warrantyEnd">Warranty End</th>
                                          <th className="fw-medium text-muted">Action</th>
                                      </tr>
                                  </thead>
                                  <tbody id="warrantiesTableBody">

                                  </tbody>
                              </table>
                          </div>
                          <div className="row align-items-center g-3 mt-2">
                              <div className="col-md-6">
                                  <p className="text-muted text-center text-md-start mb-0" id="paginationInfo">
                                      Showing <b className="me-1">1-0</b> of <b className="ms-1">0</b> Results
                                  </p>
                              </div>
                              <div className="col-md-6">
                                  <nav aria-label="Page navigation example">
                                      <ul className="pagination justify-content-center justify-content-md-end mb-0" id="pagination">

                                      </ul>
                                  </nav>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addWarrantyModal" tabIndex="-1" aria-labelledby="addWarrantyModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="h-24 rounded-top-2 pattern-bg"></div>
                      <div className="modal-body">
                          <form id="warrantyForm">
                              <input type="hidden" id="warrantyId" />
                              <div className="row g-3">
                                  <div className="col-12">
                                      <label className="avatar border text-muted mx-auto bg-body-secondary size-24 rounded p-3 mt-n20 cursor-pointer" htmlFor="imageInput">
                                          <i className="ri-upload-cloud-2-line fs-2xl"></i>
                                          <input type="file" id="imageInput" className="d-none" />
                                      </label>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="productName" className="form-label">Product <span className="text-danger">*</span></label>
                                      <input type="text" className="form-control" id="productName" placeholder="e.g., Apple iPhone 15" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="sku" className="form-label">SKU <span className="text-danger">*</span></label>
                                      <input type="text" className="form-control" id="sku" placeholder="e.g., APL-15" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="warrantyType" className="form-label">Warranty Type</label>
                                      <div id="warrantyType"></div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="customer" className="form-label">Customer <span className="text-danger">*</span></label>
                                      <input type="text" className="form-control" id="customer" placeholder="e.g., John Doe" required />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="purchaseDate" className="form-label">Purchase Date</label>
                                       <input type="text" id="rightTopDatepicker" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="status" className="form-label">Status</label>
                                      <div id="status"></div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="warrantyStart" className="form-label">Warranty Start</label>
                                     <input type="text" id="warrantyStart" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="warrantyEnd" className="form-label">Warranty End</label>
                                     <input type="text" id="warrantyEnd" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                                  </div>
                              </div>
                              <div className="d-flex gap-2 mt-7">
                                  <button type="button" className="btn btn-light w-100" data-bs-dismiss="modal">Close</button>
                                  <button type="submit" className="btn btn-primary w-100" id="saveWarrantyBtn">Add Warranty</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this warranty?</h5>
                      <input type="hidden" id="deleteWarrantyId" />
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
