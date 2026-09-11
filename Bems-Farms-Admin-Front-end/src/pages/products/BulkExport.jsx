import { Link } from 'react-router-dom'

export default function BulkExport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Bulk Export</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Products</a></li>
                  <li className="breadcrumb-item active">Bulk Export</li>
              </ul>
          </div>
          <div className="card mb-3">
              <div className="card-header">
                  <h5 className="card-title mb-0">Product Bulk Export</h5>
              </div>
              <div className="card-body">
                  <div className="row align-items-center g-4 mb-4">
                      <div className="col-md-6 col-lg-4 col-xl-3">
                          <label htmlFor="categorySelect" className="form-label">Category</label>
                          <div id="categorySelect"></div>
                      </div>
                      <div className="col-md-6 col-lg-4 col-xl-3">
                          <label htmlFor="filterStock" className="form-label">Stock Status</label>
                          <div id="filterStock"></div>
                      </div>
                      <div className="col-md-6 col-lg-4 col-xl-3">
                          <label htmlFor="filterPrice" className="form-label">Price Range</label>
                          <div id="filterPrice"></div>
                      </div>
                      <div className="col-lg-5">
                          <label htmlFor="productName" className="form-label">Product</label>
                          <input type="text" className="form-control" id="productName" placeholder="Product name, SKU or barcode" />
                      </div>
                      <div className="col-md-6 col-lg-3">
                          <div className="card mb-0">
                              <label htmlFor="exportCsv" className="form-check check-success d-flex align-items-center gap-3 card-body">
                                  <img src="data:image/png;base64,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" loading="lazy" alt="CSV" className="size-8 flex-shrink-0" />
                                  <span className="form-check-label fw-semibold flex-grow-1">CSV</span>
                                  <input className="form-check-input float-none ms-auto" type="radio" name="exportFormat" id="exportCsv" defaultValue="csv" />
                              </label>
                          </div>
                      </div>
                      <div className="col-md-6 col-lg-3">
                          <div className="card mb-0">
                              <label htmlFor="exportExcel" className="form-check check-success d-flex align-items-center gap-3 card-body">
                                  <img src="data:image/png;base64,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" loading="lazy" alt="Excel" className="h-8 flex-shrink-0" />
                                  <span className="form-check-label fw-semibold flex-grow-1">Excel</span>
                                  <input className="form-check-input float-none ms-auto" type="radio" name="exportFormat" id="exportExcel" defaultValue="excel" />
                              </label>
                          </div>
                      </div>
                      <div className="col-md-3 col-xl-2">
                          <div className="d-flex gap-2">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-1" defaultChecked />
                                  <label className="label" htmlFor="switch-light-1"></label>
                              </div>
                              <span className="lh-lg">Product Name</span>
                          </div>
                      </div>
                      <div className="col-md-3 col-xl-2">
                          <div className="d-flex gap-2">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-2" defaultChecked />
                                  <label className="label" htmlFor="switch-light-2"></label>
                              </div>
                              <span className="lh-lg">SKU</span>
                          </div>
                      </div>
                      <div className="col-md-3 col-xl-2">
                          <div className="d-flex gap-2">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-3" defaultChecked />
                                  <label className="label" htmlFor="switch-light-3"></label>
                              </div>
                              <span className="lh-lg">Category</span>
                          </div>
                      </div>
                      <div className="col-md-3 col-xl-2">
                          <div className="d-flex gap-2">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-4" defaultChecked />
                                  <label className="label" htmlFor="switch-light-4"></label>
                              </div>
                              <span className="lh-lg">Price</span>
                          </div>
                      </div>
                      <div className="col-md-3 col-xl-2">
                          <div className="d-flex gap-2">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-5" defaultChecked />
                                  <label className="label" htmlFor="switch-light-5"></label>
                              </div>
                              <span className="lh-lg">Stock</span>
                          </div>
                      </div>
                      <div className="col-md-3 col-xl-2">
                          <div className="d-flex gap-2">
                              <div className="form-switch switch-light-primary">
                                  <input type="checkbox" id="switch-light-6" defaultChecked />
                                  <label className="label" htmlFor="switch-light-6"></label>
                              </div>
                              <span className="lh-lg">Status</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Preview</span>
                  <div className="d-flex gap-2">
                      <button className="btn btn-outline-light border btn-icon"><i className="ri-loop-right-line"></i></button>
                      <button className="btn btn-primary">Export Now</button>
                  </div>
              </div>
              <div className="card-body">
                  <div className="table-responsive">
                      <table className="table table-borderless align-middle mb-0 text-nowrap">
                          <thead className="border-bottom">
                              <tr>
                                  <th className="fw-medium text-muted">Product Name</th>
                                  <th className="fw-medium text-muted">SKU</th>
                                  <th className="fw-medium text-muted">Category</th>
                                  <th className="fw-medium text-muted">Price (₹)</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Stock</th>
                                  <th className="fw-medium text-muted">Action</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-01-BBWp8t8E.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Apple iPhone 15</a>
                                      </div>
                                  </td>
                                  <td>APL-15</td>
                                  <td>Electronics</td>
                                  <td>79,999</td>
                                  <td>In Stock</td>
                                  <td>25</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-02-ClVfz9I5.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Nike Air Max</a>
                                      </div>
                                  </td>
                                  <td>NIK-001</td>
                                  <td>Footwear</td>
                                  <td>12,000</td>
                                  <td>Low Stock</td>
                                  <td>10</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-03-oTTY_McP.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Leather Jacket</a>
                                      </div>
                                  </td>
                                  <td>FAS-101</td>
                                  <td>Fashion</td>
                                  <td>7,500</td>
                                  <td>In Stock</td>
                                  <td>15</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-04-DZ4OtBxS.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Samsung TV</a>
                                      </div>
                                  </td>
                                  <td>SAM-55</td>
                                  <td>Electronics</td>
                                  <td>45,000</td>
                                  <td>Out of Stock</td>
                                  <td>56</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-05-DPzi-ptA.png" loading="lazy" alt="Sony Headphones" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Sony Headphones</a>
                                      </div>
                                  </td>
                                  <td>SON-200</td>
                                  <td>Electronics</td>
                                  <td>15,000</td>
                                  <td>In Stock</td>
                                  <td>48</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-06-DdkuSG6a.png" loading="lazy" alt="Adidas Sneakers" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Adidas Sneakers</a>
                                      </div>
                                  </td>
                                  <td>ADI-302</td>
                                  <td>Footwear</td>
                                  <td>8,500</td>
                                  <td>In Stock</td>
                                  <td>36</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-07-9mjzrP7h.png" loading="lazy" alt="LG Refrigerator" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">LG Refrigerator</a>
                                      </div>
                                  </td>
                                  <td>LG-410</td>
                                  <td>Home Appliances</td>
                                  <td>32,000</td>
                                  <td>Out of Stock</td>
                                  <td>45</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-08-BXmGY-HZ.png" loading="lazy" alt="Sony PlayStation 5" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Sony PlayStation 5</a>
                                      </div>
                                  </td>
                                  <td>SONY-PS5</td>
                                  <td>Electronics</td>
                                  <td>50,000</td>
                                  <td>In Stock</td>
                                  <td>29</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-09-CqG2QIp1.png" loading="lazy" alt="Dell Laptop XPS 13" className="img-fluid" />
                                          </div>
                                          <a href="#" className="fw-medium text-reset">Dell Laptop XPS 13</a>
                                      </div>
                                  </td>
                                  <td>DEL-X13</td>
                                  <td>Electronics</td>
                                  <td>95,000</td>
                                  <td>In Stock</td>
                                  <td>63</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sub-primary size-8 btn-icon"><i className="ri-download-line"></i></button>
                                          <button type="button" className="btn btn-sub-secondary size-8 btn-icon"><i className="ri-eye-line"></i></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">18</b> Results</p>
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


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs">
                  <div className="modal-content p-7 text-center">
                      <div className="d-flex justify-content-center mb-4">
                          <div className="size-14 bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center size-16">
                              <i className="ri-delete-bin-line text-danger fs-2xl"></i>
                          </div>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this File?</h5>
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
