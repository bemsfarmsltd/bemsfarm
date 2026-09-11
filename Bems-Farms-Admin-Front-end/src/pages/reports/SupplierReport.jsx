import { Link } from 'react-router-dom'

export default function SupplierReport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Supplier</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Reports</a></li>
                  <li className="breadcrumb-item active">Supplier</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-xxl-2 col-md-4 col-sm-6">
                  <div className="card">
                      <div className="card-body d-flex align-items-center gap-5">
                          <div className="avatar size-11 bg-primary text-white rounded-1">
                              <i className="ri-shopping-cart-2-line fs-xl"></i>
                          </div>
                          <div>
                              <h5 className="mb-1">256</h5>
                              <p className="text-muted">Total Suppliers</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-2 col-md-4 col-sm-6">
                  <div className="card">
                      <div className="card-body d-flex align-items-center gap-5">
                          <div className="avatar size-11 bg-primary text-white rounded-1">
                              <i className="ri-wallet-3-line fs-xl"></i>
                          </div>
                          <div>
                              <h5 className="mb-1">$208,000</h5>
                              <p className="text-muted">Total Purchases</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-2 col-md-4 col-sm-6">
                  <div className="card">
                      <div className="card-body d-flex align-items-center gap-5">
                          <div className="avatar size-11 bg-primary text-white rounded-1">
                              <i className="ri-bank-line fs-xl"></i>
                          </div>
                          <div>
                              <h5 className="mb-1">$170,000</h5>
                              <p className="text-muted">Total Paid</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-2 col-md-4 col-sm-6">
                  <div className="card">
                      <div className="card-body d-flex align-items-center gap-5">
                          <div className="avatar size-11 bg-primary text-white rounded-1">
                              <i className="ri-stack-line fs-xl"></i>
                          </div>
                          <div>
                              <h5 className="mb-1">133</h5>
                              <p className="text-muted">Total Items</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-2 col-md-4 col-sm-6">
                  <div className="card">
                      <div className="card-body d-flex align-items-center gap-5">
                          <div className="avatar size-11 bg-primary text-white rounded-1">
                              <i className="ri-user-line fs-xl"></i>
                          </div>
                          <div>
                              <h5 className="mb-1">120</h5>
                              <p className="text-muted">Active Suppliers</p>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xxl-2 col-md-4 col-sm-6">
                  <div className="card">
                      <div className="card-body d-flex align-items-center gap-5">
                          <div className="avatar size-11 bg-primary text-white rounded-1">
                              <i className="ri-user-3-line fs-xl"></i>
                          </div>
                          <div>
                              <h5 className="mb-1">36</h5>
                              <p className="text-muted">Inactive Suppliers</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between gap-2 align-items-center">
                  <div className="position-relative">
                      <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search products..." />
                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                  </div>
                  <div className="d-flex flex-wrap align-items-center gap-2">
                      <input type="number" className="form-control w-32" placeholder="Min Items" />
                      <span>-</span>
                      <input type="number" className="form-control w-32" placeholder="Max Items" />
                      <div className="position-relative flex-shrink-0 w-48">
                          <input type="text" id="filterDate" className="form-control ps-10" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                          <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="vsStatusFilter" className="w-40"></div>
                      <div id="vsPaymentMethod" className="w-44"></div>
                      <button type="button" className="btn btn-primary">Generate</button>
                      <div className="dropdown">
                          <button type="button" className="btn btn-light btn-icon" data-bs-toggle="dropdown" aria-expanded="false"><i data-lucide="arrow-down-to-line" className="size-4"></i></button>
                          <ul className="dropdown-menu dropdown-menu-end">
                              <li><a className="dropdown-item" href="#" id="exportPrint">Print PDF</a></li>
                              <li><a className="dropdown-item" href="#" id="exportJSON">Export CSV</a></li>
                              <li><a className="dropdown-item" href="#" id="exportXML">Export XML</a></li>
                          </ul>
                      </div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSuppliers" />
                                      </div>
                                  </th>
                                  <th className="text-muted fw-medium">Supplier ID</th>
                                  <th className="text-muted fw-medium">Supplier</th>
                                  <th className="text-muted fw-medium">Total Purchase</th>
                                  <th className="text-muted fw-medium">Total Paid</th>
                                  <th className="text-muted fw-medium">Total Items</th>
                                  <th className="text-muted fw-medium">Payment</th>
                                  <th className="text-muted fw-medium">Last Purchase</th>
                                  <th className="text-muted fw-medium">Avg Order Value</th>
                                  <th className="text-muted fw-medium">Status</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0001</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-6-BIO7_TUU.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Sunrise Wholesale</a>
                                      </div>
                                  </td>
                                  <td>$42,380</td>
                                  <td>$38,000</td>
                                  <td>25</td>
                                  <td>Cash</td>
                                  <td>12 Dec, 2025</td>
                                  <td>$2,118</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0002</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-7-BMyy-xCq.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Fresh Valley Traders</a>
                                      </div>
                                  </td>
                                  <td>$18,920</td>
                                  <td>$12,500</td>
                                  <td>14</td>
                                  <td>Bank</td>
                                  <td>01 Dec, 2025</td>
                                  <td>$1,351</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0003</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-8-BAGm131G.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Global Foods Ltd.</a>
                                      </div>
                                  </td>
                                  <td>$30,500</td>
                                  <td>$30,500</td>
                                  <td>18</td>
                                  <td>Online</td>
                                  <td>08 Dec, 2025</td>
                                  <td>$1,694</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0004</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-9-DB-6OyMr.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">EcoMart Suppliers</a>
                                      </div>
                                  </td>
                                  <td>$25,700</td>
                                  <td>$21,300</td>
                                  <td>16</td>
                                  <td>Cheque</td>
                                  <td>05 Dec, 2025</td>
                                  <td>$1,606</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0005</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-10-CzpspsdB.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">FreshMart Co.</a>
                                      </div>
                                  </td>
                                  <td>$12,800</td>
                                  <td>$9,200</td>
                                  <td>11</td>
                                  <td>Cash</td>
                                  <td>29 Nov, 2025</td>
                                  <td>$1,163</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0006</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-11-bzS6tHsV.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">GreenLeaf Traders</a>
                                      </div>
                                  </td>
                                  <td>$8,450</td>
                                  <td>$8,450</td>
                                  <td>9</td>
                                  <td>Online</td>
                                  <td>02 Dec, 2025</td>
                                  <td>$939</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0007</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-12-CfsiEgBV.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Oceanic Suppliers</a>
                                      </div>
                                  </td>
                                  <td>$21,900</td>
                                  <td>$15,000</td>
                                  <td>13</td>
                                  <td>Bank</td>
                                  <td>27 Nov, 2025</td>
                                  <td>$1,684</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0008</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-13-NgroKY8u.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">GreenFields Co.</a>
                                      </div>
                                  </td>
                                  <td>$15,600</td>
                                  <td>$15,600</td>
                                  <td>12</td>
                                  <td>Cash</td>
                                  <td>30 Nov, 2025</td>
                                  <td>$1,300</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0009</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-14-BWimhkHc.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Harvest Traders</a>
                                      </div>
                                  </td>
                                  <td>$9,750</td>
                                  <td>$7,100</td>
                                  <td>8</td>
                                  <td>Cheque</td>
                                  <td>20 Nov, 2025</td>
                                  <td>$1,219</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="form-check check-primary"><input className="form-check-input" type="checkbox" /></div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">#SUP-0010</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <img src="../assets/user-15-Bm8xnKEs.png" className="size-8 rounded-circle img-fluid" alt="Supplier" />
                                          <a href="#" className="text-reset fw-medium d-block">Evergreen Suppliers</a>
                                      </div>
                                  </td>
                                  <td>$28,400</td>
                                  <td>$26,000</td>
                                  <td>19</td>
                                  <td>Online</td>
                                  <td>10 Dec, 2025</td>
                                  <td>$1,495</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">19</b> Results</p>
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
          <div className="modal fade" id="financeModal" tabIndex="-1" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="h-24 rounded-top-2 pattern-bg"></div>
                      <div className="modal-body position-relative">
                          <form>
                              <input type="hidden" id="stockInId" />
                              <div className="text-center mb-2">
                                  <label className="avatar border bg-body-secondary size-24 rounded p-3 mt-n20 cursor-pointer position-relative d-inline-block overflow-hidden" htmlFor="supplierLogoInput" id="logoPreviewLabel">
                                      <img id="supplierLogoPreview" src="#" className="w-100 h-100 object-fit-cover rounded d-none" />
                                      <div id="uploadIcon" className="d-flex align-items-center justify-content-center w-100 h-100 position-absolute top-0 start-0">
                                          <i className="ri-upload-cloud-2-line fs-2xl text-muted"></i>
                                      </div>
                                      <input type="file" id="supplierLogoInput" className="d-none" accept="image/*" />
                                  </label>
                              </div>
                              <div className="row g-5">
                                  <div className="col-md-7">
                                      <label htmlFor="financeProduct" className="form-label">Product</label>
                                      <input id="financeProduct" type="text" className="form-control" placeholder="Enter product name" />
                                  </div>
                                  <div className="col-md-5">
                                      <label htmlFor="financeSKU" className="form-label">SKU</label>
                                      <input id="financeSKU" type="text" className="form-control" placeholder="Enter SKU" />
                                  </div>
                                  <div className="col-md-5">
                                      <label htmlFor="financeCategory" className="form-label">Category</label>
                                      <input id="financeCategory" type="text" className="form-control" placeholder="Product category" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="financeUnitsSold" className="form-label">Units Sold</label>
                                      <input id="financeUnitsSold" type="number" className="form-control" placeholder="e.g. 120" />
                                  </div>
                                  <div className="col-md-3">
                                      <label htmlFor="financeDiscount" className="form-label">Discount (%)</label>
                                      <input id="financeDiscount" type="number" className="form-control" placeholder="0" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="financeCostPrice" className="form-label">Cost Price</label>
                                      <input id="financeCostPrice" type="number" className="form-control" placeholder="e.g. 10.00" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="financeSellingPrice" className="form-label">Selling Price</label>
                                      <input id="financeSellingPrice" type="number" className="form-control" placeholder="e.g. 18.00" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="financeTaxAmount" className="form-label">Tax Amount</label>
                                      <input id="financeTaxAmount" type="number" className="form-control" placeholder="e.g. 180.00" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="financeTotalCost" className="form-label">Total Cost</label>
                                      <input id="financeTotalCost" type="text" className="form-control" placeholder="$0.00" />
                                  </div>
                                  <div className="col-md-4">
                                      <label htmlFor="financeMargin" className="form-label">Margin (%)</label>
                                      <input id="financeMargin" type="text" className="form-control" placeholder="0%" />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="financeGrossProfit" className="form-label">Gross Profit</label>
                                      <input id="financeGrossProfit" type="text" className="form-control text-success" placeholder="$0.00" readOnly />
                                  </div>
                                  <div className="col-md-6">
                                      <label htmlFor="financeRevenue" className="form-label">Revenue</label>
                                      <input id="financeRevenue" type="text" className="form-control" placeholder="$0.00" />
                                  </div>
                                  <div className="col-md-12">
                                      <label htmlFor="financeStatus" className="form-label">Status</label>
                                      <div id="financeStatus"></div>
                                  </div>
                              </div>
                              <div className="d-flex gap-2 mt-7">
                                  <button type="button" className="btn btn-light w-100" data-bs-dismiss="modal">Close</button>
                                  <button type="submit" className="btn btn-primary w-100">Add Finance</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Finance?</h5>
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
