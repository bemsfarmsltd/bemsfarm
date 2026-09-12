import { Link } from 'react-router-dom'

export default function Variants() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Variants</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
                  <li className="breadcrumb-item active">Variants</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-12">
                  <div className="card">
                      <div className="card-header d-flex flex-wrap gap-3 justify-content-between align-items-center">
                          <div className="d-flex flex-grow-1">
                              <h6 className="card-title mb-0">Variants</h6>
                          </div>
                          <div className="d-flex flex-wrap flex-md-nowrap gap-3">
                              <div className="flex-shrink-0">
                                  <label htmlFor="searchProductInput" className="form-label d-none">Search</label>
                                  <div className="position-relative">
                                      <input type="text" className="form-control ps-9" id="searchProductInput" placeholder="Search for..." />
                                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                  </div>
                              </div>
                              <button type="button" className="btn btn-primary d-flex align-items-center gap-1" data-bs-toggle="modal" data-bs-target="#addVariantModal" id="addVariantsBtn"><i data-lucide="plus" className="size-4"></i>Add Variants</button>
                          </div>
                      </div>
                      <div className="card-body pt-0">
                          <div className="table-card table-responsive">
                              <table className="table align-middle text-nowrap mb-0">
                                  <thead>
                                      <tr className="bg-light border-bottom">
                                          <th>
                                              <div className="form-check check-primary">
                                                  <input className="form-check-input" type="checkbox" aria-label="checkbox" id="checAllData" />
                                                  <label className="form-check-label d-none" htmlFor="checAllData">Check All Data</label>
                                              </div>
                                          </th>
                                          <th className="fw-medium text-muted sortable" data-column="variant">Variant</th>
                                          <th className="fw-medium text-muted sortable" data-column="sku">SKU</th>
                                          <th className="fw-medium text-muted sortable" data-column="price">Price</th>
                                          <th className="fw-medium text-muted sortable" data-column="stock">Stock</th>
                                          <th className="fw-medium text-muted sortable" data-column="quantity">QTY</th>
                                          <th className="fw-medium text-muted sortable" data-column="status">Status</th>
                                          <th className="fw-medium text-muted">Action</th>
                                      </tr>
                                  </thead>
                                  <tbody id="variantTableBody">

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


          <div className="modal fade" id="addVariantModal" tabIndex="-1" aria-labelledby="addVariantModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="modal-title" id="addVariantModalLabel">Add New Variant</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div className="modal-body">
                          <form id="variantsForm">
                              <input type="hidden" id="variantId" defaultValue="" />
                              <div className="row g-3">
                                  <div className="col-12">
                                      <label htmlFor="variantName" className="form-label">Variant Name</label>
                                      <input type="text" id="variantName" className="form-control" placeholder="e.g., Black / Small" required />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="variantSku" className="form-label">SKU</label>
                                      <input type="text" id="variantSku" className="form-control" placeholder="e.g., TSH-BLK-S" required />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="variantPrice" className="form-label">Price</label>
                                      <div className="input-group">
                                          <span className="input-group-text">$</span>
                                          <input type="text" id="variantPrice" className="form-control" placeholder="29.99" required />
                                      </div>
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="variantQuantity" className="form-label">Quantity</label>
                                      <input type="number" id="variantQuantity" className="form-control" placeholder="0" min="0" required />
                                  </div>
                                  <div className="col-md-6 mb-4">
                                      <label htmlFor="variantStock" className="form-label">Stock</label>
                                      <input type="number" id="variantStock" className="form-control" placeholder="0" min="0" required />
                                  </div>
                                  <div className="col-12 mb-4">
                                      <label htmlFor="variantStatus" className="form-label">Status</label>
                                      <div id="variantStatus"></div>
                                  </div>
                              </div>
                              <div className="d-flex gap-2 mt-7">
                                  <button type="button" className="btn btn-light w-100" data-bs-dismiss="modal">Close</button>
                                  <button type="submit" className="btn btn-primary w-100" id="saveVariantsBtn">Add Variant</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Variants?</h5>
                      <input type="hidden" id="deleteVariantsId" />
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
