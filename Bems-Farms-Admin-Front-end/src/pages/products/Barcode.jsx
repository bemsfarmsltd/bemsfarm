import { Link } from 'react-router-dom'

export default function Barcode() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Barcode</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Products</a></li>
                  <li className="breadcrumb-item active">Barcode</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex justify-content-between gap-2">
                  <div>
                      <h6 className="card-title mb-1">Print Barcodes</h6>
                      <p className="text-muted mb-0">Generate, customize and print product barcodes with advanced options</p>
                  </div>
              </div>
              <div className="card-body">
                  <h6 className="mb-2">Product Selection</h6>
                  <div className="row g-3 justify-content-between">
                      <div className="col-lg-7">
                          <div className="row g-3">
                              <div className="col-md-5">
                                  <label htmlFor="Category" className="form-label">Category</label>
                                  <div id="Category"></div>
                              </div>
                              <div className="col-md-5">
                                  <label htmlFor="Brand" className="form-label">Brand</label>
                                  <div id="Brand"></div>
                              </div>
                              <div className="col-12">
                                  <label htmlFor="searchProductInput" className="form-label">Product</label>
                                  <div className="position-relative">
                                      <input type="text" className="form-control ps-9" id="searchProductInput" placeholder="Product name, SKU or barcode" />
                                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="col-lg-3 col-xxl-2">
                          <div className="row">
                              <div className="col-12">
                                  <label className="form-label">Bulk Import</label>
                                  <label htmlFor="subImage1" className="avatar h-32 p-4 text-center border border-dashed text-muted rounded cursor-pointer">
                                      <div>
                                          <i data-lucide="upload-cloud" className="size-5"></i>
                                          <div className="mt-1 fs-sm">Upload CSV</div>
                                      </div>
                                  </label>
                                  <input type="file" id="subImage1" className="d-none" />
                              </div>
                          </div>
                      </div>

                  </div>
                  <div className="mt-6">
                      <div className="table-responsive">
                          <table className="table table-borderless text-nowrap selected-table">
                              <thead className="bg-light">
                                  <tr>
                                      <th>Product Name</th>
                                      <th>SKU</th>
                                      <th>Price</th>
                                      <th>Quantity</th>
                                      <th>Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  <tr>
                                      <td>
                                          <div className="d-flex align-items-center gap-2">
                                              <div className="avatar size-9 border rounded-1 p-1">
                                                  <img src="../assets/img-01-BBWp8t8E.png" loading="lazy" alt="Product" className="img-fluid" />
                                              </div>
                                              <div>
                                                  <div className="fw-medium">Apple iPhone 15</div>
                                                  <div className="text-muted fs-sm">Electronics</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td>APL-IP15-128</td>
                                      <td>₹79,999</td>
                                      <td>
                                          <div className="input-spin-group input-spin-primary">
                                              <button type="button" className="input-spin-minus"><i data-lucide="minus" className="size-4"></i></button>
                                              <input type="text" className="input-spin form-control" readOnly defaultValue="1" />
                                              <button type="button" className="input-spin-plus"><i data-lucide="plus" className="size-4"></i></button>
                                          </div>
                                      </td>
                                      <td>
                                          <button type="button" className="btn size-8 btn-icon btn-sub-danger btn-icon"><i className="ri-delete-bin-line"></i></button>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td>
                                          <div className="d-flex align-items-center gap-2">
                                              <div className="avatar size-9 border rounded-1 p-1">
                                                  <img src="../assets/img-02-ClVfz9I5.png" loading="lazy" alt="Product" className="img-fluid" />
                                              </div>
                                              <div>
                                                  <div className="fw-medium">Nike Air Max 270</div>
                                                  <div className="text-muted fs-sm">Footwear</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td>NKE-AM270-01</td>
                                      <td>₹12,499</td>
                                      <td>
                                          <div className="input-spin-group input-spin-primary">
                                              <button type="button" className="input-spin-minus">
                                                  <i data-lucide="minus" className="size-4"></i>
                                              </button>
                                              <input type="text" className="input-spin form-control" readOnly defaultValue="2" />
                                              <button type="button" className="input-spin-plus">
                                                  <i data-lucide="plus" className="size-4"></i>
                                              </button>
                                          </div>
                                      </td>
                                      <td>
                                          <button type="button" className="btn size-8 btn-icon btn-sub-danger btn-icon">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </td>
                                  </tr>
                                  <tr>
                                      <td>
                                          <div className="d-flex align-items-center gap-2">
                                              <div className="avatar size-9 border rounded-1 p-1">
                                                  <img src="../assets/img-03-oTTY_McP.png" loading="lazy" alt="Product" className="img-fluid" />
                                              </div>
                                              <div>
                                                  <div className="fw-medium">Samsung Galaxy Buds Pro</div>
                                                  <div className="text-muted fs-sm">Audio</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td>SAM-BUDS-PRO</td>
                                      <td>₹6,999</td>
                                      <td>
                                          <div className="input-spin-group input-spin-primary">
                                              <button type="button" className="input-spin-minus">
                                                  <i data-lucide="minus" className="size-4"></i>
                                              </button>
                                              <input type="text" className="input-spin form-control" readOnly defaultValue="3" />
                                              <button type="button" className="input-spin-plus">
                                                  <i data-lucide="plus" className="size-4"></i>
                                              </button>
                                          </div>
                                      </td>
                                      <td>
                                          <button type="button" className="btn size-8 btn-icon btn-sub-danger btn-icon">
                                              <i className="ri-delete-bin-line"></i>
                                          </button>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
                  <h6 className="my-2">Barcode Options</h6>
                  <div className="row g-3 mb-6">
                      <div className="col-md-6 col-lg-3">
                          <label htmlFor="barcodeType" className="form-label">Barcode Type</label>
                          <div id="barcodeType"></div>
                      </div>
                      <div className="col-md-6 col-lg-3">
                          <label htmlFor="encodeSelect" className="form-label">Encode Value</label>
                          <div id="encodeSelect"></div>
                      </div>
                      <div className="col-md-6 col-lg-4">
                          <label className="form-label">Label Template</label>
                          <div id="templateSelect"></div>
                      </div>
                  </div>
                  <div className="d-flex flex-wrap gap-5 gap-md-16 mb-5">
                      <div className="form-check check-primary">
                          <input className="form-check-input" type="checkbox" id="defaultCheck1" defaultChecked />
                          <label className="form-check-label" htmlFor="defaultCheck1">
                              Show Product Name
                          </label>
                      </div>
                      <div className="form-check check-primary">
                          <input className="form-check-input" type="checkbox" id="defaultCheck1" defaultChecked />
                          <label className="form-check-label" htmlFor="defaultCheck1">
                              Show Price
                          </label>
                      </div>
                      <div className="form-check check-primary">
                          <input className="form-check-input" type="checkbox" id="defaultCheck1" />
                          <label className="form-check-label" htmlFor="defaultCheck1">
                              Include Store Logo
                          </label>
                      </div>
                  </div>
                  <div className="d-flex flex-wrap justify-content-end align-items-center gap-2">
                      <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#generateModal"><i className="ri-magic-line me-1"></i> Generate</button>
                      <button type="button" className="btn btn-secondary" id="resetBtn"><i className="ri-refresh-line me-1"></i> Reset</button>
                      <button type="button" className="btn btn-info" id="printBtn"><i className="ri-printer-line me-1"></i> Print</button>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="generateModal" tabIndex="-1" aria-labelledby="generateModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content">
                      <div className="modal-header border-bottom-0 pb-0">
                          <div>
                              <h6 className="modal-title" id="generateModalLabel">Generate Barcodes</h6>
                              <p className="text-muted">Generate product barcodes ready for printing.</p>
                          </div>
                          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div className="modal-body">
                          <div className="d-flex flex-wrap gap-4">
                              <div className="py-3 px-5 border bg-light bg-opacity-25 text-center rounded">
                                  <small className="d-block text-muted">₹79,999</small>
                                  <p className="fw-medium">Apple iPhone 15</p>
                                  <img src="../assets/barcode-Bj0dkb0P.png" alt="Barcode" />
                                  <small className="d-block">APL-IP15-128</small>
                              </div>
                              <div className="py-3 px-5 border bg-light bg-opacity-25 text-center rounded">
                                  <small className="d-block text-muted">12,499</small>
                                  <p className="fw-medium">Nike Air Max 270</p>
                                  <img src="../assets/barcode-Bj0dkb0P.png" alt="Barcode" />
                                  <small className="d-block">NKE-AM270-01</small>
                              </div>
                              <div className="py-3 px-5 border bg-light bg-opacity-25 text-center rounded">
                                  <small className="d-block text-muted">₹6,999</small>
                                  <p className="fw-medium">Samsung Galaxy Buds Pro</p>
                                  <img src="../assets/barcode-Bj0dkb0P.png" alt="Barcode" />
                                  <small className="d-block">SAM-BUDS-PRO</small>
                              </div>
                          </div>
                          <div className="d-flex gap-2 justify-content-end mt-5">
                              <button type="button" className="btn btn-active-secondary" data-bs-dismiss="modal"><i data-lucide="x" className="me-1 size-4"></i>Close</button>
                              <button type="button" className="btn btn-info" id="printBtn"><i className="ri-printer-line me-1"></i> Print</button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
