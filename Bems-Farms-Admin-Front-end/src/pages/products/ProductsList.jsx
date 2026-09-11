import { Link } from 'react-router-dom'

export default function ProductsList() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Products List</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Products</a></li>
                  <li className="breadcrumb-item active">Products List</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="d-flex flex-wrap align-items-center gap-5">
                      <div className="flex-grow-1">
                          <h6 className="mb-1 card-title">Products List</h6>
                      </div>
                      <div className="d-flex flex-wrap gap-2 flex-shrink-0">
                          <div className="dropdown flex-shrink-0">
                              <button className="btn btn-light d-flex align-items-center" type="button" id="exportDropdownButton" data-bs-toggle="dropdown" aria-expanded="false" title="dropdown-button">
                                  <i data-lucide="download" className="size-4 me-1"></i> Export
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="exportDropdownButton">
                                  <li className="dropdown-item">
                                      <i data-lucide="file-text" className="size-4 me-1 align-middle"></i> Export to Excel
                                  </li>
                                  <li className="dropdown-item">
                                      <i data-lucide="file" className="size-4 me-1 align-middle"></i> Export to CSV
                                  </li>
                                  <li className="dropdown-item">
                                      <i data-lucide="file-output" className="size-4 me-1 align-middle"></i> Export to PDF
                                  </li>
                                  <li className="dropdown-item">
                                      <i data-lucide="printer" className="size-4 me-1 align-middle"></i> Print
                                  </li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card-body">
                  <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                      <div className="flex-shrink-0">
                          <label htmlFor="searchProductInput" className="form-label d-none">Search</label>
                          <div className="position-relative">
                              <input type="text" className="form-control ps-9" id="searchProductInput" placeholder="Search for..." />
                              <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                          </div>
                      </div>
                      <div className="d-flex flex-wrap flex-md-nowrap gap-2">
                          <button type="button" className="btn btn-danger btn-icon flex-shrink-0 d-none trash-button"><i data-lucide="trash-2" className="size-5"></i></button>
                          <div id="stockSelect" className="min-w-40"></div>
                          <div id="priceSelect" className="min-w-36"></div>
                          <div className="dropdown flex-shrink-0">
                              <button className="btn btn-light d-flex align-items-center" type="button" id="filterDropdownButton" data-bs-toggle="dropdown" aria-expanded="false" title="dropdown-button">
                                  <i data-lucide="filter" className="size-4 me-1"></i> Filters
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end p-3 w-64" aria-labelledby="filterDropdownButton">
                                  <h6 className="mb-4">Filter Options</h6>
                                  <form action="#!" id="filterForm">
                                      <h6 className="mb-2 fs-sm">Status</h6>
                                      <div className="d-flex gap-4 align-items-center mb-4">
                                          <div className="form-check check-primary">
                                              <input className="form-check-input mt-0" type="checkbox" id="publishedStatus" />
                                              <label className="form-check-label" htmlFor="publishedStatus">
                                                  Published
                                              </label>
                                          </div>
                                          <div className="form-check check-primary">
                                              <input className="form-check-input mt-0" type="checkbox" id="inactiveStatus" />
                                              <label className="form-check-label" htmlFor="inactiveStatus">
                                                  Inactive
                                              </label>
                                          </div>
                                      </div>
                                      <label className="mb-3 form-label">Price Range</label>
                                      <div id="slider"></div>
                                      <div className="d-flex align-items-center justify-content-end gap-2 mt-5">
                                          <button type="reset" className="btn-sm btn btn-light">Reset</button>
                                          <button type="submit" className="btn-sm btn btn-primary">Apply</button>
                                      </div>
                                  </form>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table table-borderless mb-0 text-nowrap align-middle">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th scope="col">
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" title="checkbox" type="checkbox" id="checkboxDataAll" />
                                          <label className="form-check-label d-none" htmlFor="checkboxDataAll">
                                              All Checkbox
                                          </label>
                                      </div>
                                  </th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="id">Product ID</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="name">Product</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="category">Category</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="price">Price</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="quantity">QTY</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="inStock">Stock</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="discount">Discount</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="revenue">Revenue</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="brand">Brand</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="cost">Cost</th>
                                  <th scope="col" className="text-muted fw-medium" data-sort="status">status</th>
                                  <th scope="col" className="text-muted fw-medium">Action</th>
                              </tr>
                          </thead>
                          <tbody id="productsTableBody"></tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b>of<b className="ms-1">10</b> Results</p>
                      </div>
                      <div className="col-md-6">
                          <nav aria-label="Page navigation example">
                              <ul className="pagination justify-content-center justify-content-md-end mb-0 products-pagination">
                                  <li className="page-item disabled"><a className="page-link" href="#"><i data-lucide="chevron-left" className="size-4"></i> Previous</a></li>
                                  <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                  <li className="page-item"><a className="page-link" href="#">Next <i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                      </div>
                  </div>
              </div>
          </div>

          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs mx-auto">
                  <div className="modal-content p-7 text-center">
                      <div className="size-14 bg-danger-subtle rounded-circle avatar mx-auto mb-4">
                          <i data-lucide="trash-2" className="size-6 text-danger"></i>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Product?</h5>
                      <div className="d-flex justify-content-center align-items-center gap-2">
                          <button type="button" className="btn btn-danger delete-btn" data-bs-dismiss="modal">Delete</button>
                          <button type="button" className="btn btn-active-secondary" data-bs-dismiss="modal">Cancel</button>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
