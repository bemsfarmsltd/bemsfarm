import { Link } from 'react-router-dom'

export default function FinanceReport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Finance</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Reports</a></li>
                  <li className="breadcrumb-item active">Finance</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <h5 className="card-title mb-0">Finance</h5>
                  <div className="d-flex flex-wrap gap-2 ">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search products..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="filterCategory" className="w-44"></div>
                      <div id="filterStatus" className="w-44"></div>
                      <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#financeModal" title="Finance Details"><i data-lucide="plus" className="size-4 me-1"></i>Add Finance</button>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th className="text-muted fw-medium">Product</th>
                                  <th className="text-muted fw-medium">SKU</th>
                                  <th className="text-muted fw-medium">Category</th>
                                  <th className="text-muted fw-medium">Units Sold</th>
                                  <th className="text-muted fw-medium">Gross Profit</th>
                                  <th className="text-muted fw-medium">Tax</th>
                                  <th className="text-muted fw-medium">Status</th>
                                  <th className="text-muted fw-medium">Total Cost</th>
                                  <th className="text-muted fw-medium">Action</th>
                              </tr>
                          </thead>
                          <tbody className="accordion" id="salesAccordion">
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-01-BBWp8t8E.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Wireless Mouse</a>
                                              <p className="text-muted fs-sm">Electronics</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">WM-102</a></td>
                                  <td>Accessories</td>
                                  <td>120</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$960.00</td>
                                  <td>$180.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$1,200.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale1" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale1" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-01-BBWp8t8E.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku">SKU</label>
                                                              <input type="text" className="form-control" id="sku" defaultValue="WM-102" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName">Product</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Wireless Mouse" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <input type="text" className="form-control" id="category" defaultValue="Accessories" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold" defaultValue="120" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice" defaultValue="10.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice" defaultValue="18.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit" defaultValue="$960.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin" defaultValue="44%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax">Tax</label>
                                                                  <input type="number" className="form-control" id="tax" defaultValue="180.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost" defaultValue="$1,200.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$2,160.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue" defaultValue="$1,980.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit" defaultValue="$8.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-02-ClVfz9I5.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Gaming Keyboard</a>
                                              <p className="text-muted fs-sm">Accessories</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">GK-210</a></td>
                                  <td>Peripherals</td>
                                  <td>85</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$1,700.00</td>
                                  <td>$240.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$2,125.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale2" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale2" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-02-ClVfz9I5.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku2">SKU</label>
                                                              <input type="text" className="form-control" id="sku2" defaultValue="GK-210" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName2">Product</label>
                                                                  <input type="text" className="form-control" id="productName2" defaultValue="Gaming Keyboard" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category2">Category</label>
                                                                  <input type="text" className="form-control" id="category2" defaultValue="Peripherals" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold2">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold2" defaultValue="85" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice2">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice2" defaultValue="25.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice2">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice2" defaultValue="45.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit2">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit2" defaultValue="$1,700.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin2">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin2" defaultValue="48%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax2">Tax</label>
                                                                  <input type="number" className="form-control" id="tax2" defaultValue="240.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost2">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost2" defaultValue="$3,825.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue2">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue2" defaultValue="$2,125.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount2">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount2" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue2">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue2" defaultValue="$1,885.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit2">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit2" defaultValue="$20.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-03-oTTY_McP.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Wired Earphones</a>
                                              <p className="text-muted fs-sm">Audio</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">WE-114</a></td>
                                  <td>Sound</td>
                                  <td>140</td>
                                  <td className="text-danger fw-medium"><i className="ri-arrow-down-line me-1"></i>$70.00</td>
                                  <td>$95.00</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Loss</span>
                                  </td>
                                  <td>$840.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale3" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale3" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-03-oTTY_McP.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku3">SKU</label>
                                                              <input type="text" className="form-control" id="sku3" defaultValue="WE-114" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName3">Product</label>
                                                                  <input type="text" className="form-control" id="productName3" defaultValue="Wired Earphones" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category3">Category</label>
                                                                  <input type="text" className="form-control" id="category3" defaultValue="Sound" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold3">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold3" defaultValue="140" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice3">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice3" defaultValue="6.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice3">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice3" defaultValue="5.50" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit3">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit3" defaultValue="$-70.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin3">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin3" defaultValue="-8%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax3">Tax</label>
                                                                  <input type="number" className="form-control" id="tax3" defaultValue="95.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost3">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost3" defaultValue="$770.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue3">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue3" defaultValue="$840.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount3">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount3" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue3">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue3" defaultValue="$745.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit3">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit3" defaultValue="$-0.50" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>


                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-04-DZ4OtBxS.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Laptop Stand</a>
                                              <p className="text-muted fs-sm">Office</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">LS-330</a></td>
                                  <td>Workspace</td>
                                  <td>60</td>
                                  <td className="text-muted"><i className="ri-subtract-line me-1"></i>$0.00</td>
                                  <td>$65.00</td>
                                  <td>
                                      <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Break Even</span>
                                  </td>
                                  <td>$1,080.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale4" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale4" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-04-DZ4OtBxS.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku4">SKU</label>
                                                              <input type="text" className="form-control" id="sku4" defaultValue="LS-330" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName4">Product</label>
                                                                  <input type="text" className="form-control" id="productName4" defaultValue="Laptop Stand" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category4">Category</label>
                                                                  <input type="text" className="form-control" id="category4" defaultValue="Workspace" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold4">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold4" defaultValue="60" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice4">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice4" defaultValue="18.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice4">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice4" defaultValue="18.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit4">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit4" defaultValue="$0.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin4">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin4" defaultValue="0%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax4">Tax</label>
                                                                  <input type="number" className="form-control" id="tax4" defaultValue="65.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost4">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost4" defaultValue="$1,080.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue4">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue4" defaultValue="$1,080.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount4">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount4" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue4">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue4" defaultValue="$1,080.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit4">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit4" defaultValue="$0.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-05-DPzi-ptA.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Smart Watch</a>
                                              <p className="text-muted fs-sm">Wearables</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">SW-880</a></td>
                                  <td>Gadgets</td>
                                  <td>55</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$1,375.00</td>
                                  <td>$140.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$2,200.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale5" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale5" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-05-DPzi-ptA.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku5">SKU</label>
                                                              <input type="text" className="form-control" id="sku5" defaultValue="SW-880" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName5">Product</label>
                                                                  <input type="text" className="form-control" id="productName5" defaultValue="Smart Watch" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category5">Category</label>
                                                                  <input type="text" className="form-control" id="category5" defaultValue="Gadgets" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold5">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold5" defaultValue="55" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice5">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice5" defaultValue="40.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice5">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice5" defaultValue="65.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit5">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit5" defaultValue="$1,375.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin5">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin5" defaultValue="38%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax5">Tax</label>
                                                                  <input type="number" className="form-control" id="tax5" defaultValue="140.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost5">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost5" defaultValue="$3,575.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue5">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue5" defaultValue="$2,200.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount5">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount5" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue5">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue5" defaultValue="$2,060.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit5">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit5" defaultValue="$25.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-06-DdkuSG6a.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Bluetooth Speaker</a>
                                              <p className="text-muted fs-sm">Audio</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">BS-540</a></td>
                                  <td>Peripherals</td>
                                  <td>95</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$950.00</td>
                                  <td>$190.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$1,900.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale6" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale6" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-06-DdkuSG6a.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku6">SKU</label>
                                                              <input type="text" className="form-control" id="sku6" defaultValue="BS-540" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName6">Product</label>
                                                                  <input type="text" className="form-control" id="productName6" defaultValue="Bluetooth Speaker" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category6">Category</label>
                                                                  <input type="text" className="form-control" id="category6" defaultValue="Peripherals" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold6">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold6" defaultValue="95" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice6">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice6" defaultValue="20.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice6">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice6" defaultValue="30.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit6">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit6" defaultValue="$950.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin6">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin6" defaultValue="33%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax6">Tax</label>
                                                                  <input type="number" className="form-control" id="tax6" defaultValue="190.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost6">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost6" defaultValue="$2,850.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue6">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue6" defaultValue="$1,900.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount6">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount6" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue6">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue6" defaultValue="$2,760.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit6">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit6" defaultValue="$10.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-07-9mjzrP7h.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">HD Webcam</a>
                                              <p className="text-muted fs-sm">Accessories</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">HW-720</a></td>
                                  <td>Peripherals</td>
                                  <td>70</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$350.00</td>
                                  <td>$105.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$2,100.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale7" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale7" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-07-9mjzrP7h.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku7">SKU</label>
                                                              <input type="text" className="form-control" id="sku7" defaultValue="HW-720" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName7">Product</label>
                                                                  <input type="text" className="form-control" id="productName7" defaultValue="HD Webcam" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category7">Category</label>
                                                                  <input type="text" className="form-control" id="category7" defaultValue="Peripherals" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold7">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold7" defaultValue="70" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice7">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice7" defaultValue="35.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice7">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice7" defaultValue="40.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit7">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit7" defaultValue="$350.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin7">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin7" defaultValue="14%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax7">Tax</label>
                                                                  <input type="number" className="form-control" id="tax7" defaultValue="105.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost7">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost7" defaultValue="$2,450.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue7">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue7" defaultValue="$2,100.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount7">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount7" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue7">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue7" defaultValue="$1,995.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit7">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit7" defaultValue="$5.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>

                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-08-BXmGY-HZ.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Gaming Chair</a>
                                              <p className="text-muted fs-sm">Furniture</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">GC-450</a></td>
                                  <td>Office</td>
                                  <td>30</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$900.00</td>
                                  <td>$360.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$3,600.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale8" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale8" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-08-BXmGY-HZ.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku8">SKU</label>
                                                              <input type="text" className="form-control" id="sku8" defaultValue="GC-450" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName8">Product</label>
                                                                  <input type="text" className="form-control" id="productName8" defaultValue="Gaming Chair" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category8">Category</label>
                                                                  <input type="text" className="form-control" id="category8" defaultValue="Office" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold8">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold8" defaultValue="30" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice8">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice8" defaultValue="120.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice8">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice8" defaultValue="150.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit8">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit8" defaultValue="$900.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin8">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin8" defaultValue="25%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax8">Tax</label>
                                                                  <input type="number" className="form-control" id="tax8" defaultValue="360.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost8">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost8" defaultValue="$4,500.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue8">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue8" defaultValue="$3,600.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount8">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount8" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue8">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue8" defaultValue="$4,140.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit8">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit8" defaultValue="$30.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-09-CqG2QIp1.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">External Hard Drive</a>
                                              <p className="text-muted fs-sm">Storage</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">HD-1TB</a></td>
                                  <td>Peripherals</td>
                                  <td>50</td>
                                  <td className="text-danger fw-medium"><i className="ri-arrow-down-line me-1"></i>$250.00</td>
                                  <td>$120.00</td>
                                  <td>
                                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle">Loss</span>
                                  </td>
                                  <td>$3,250.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale9" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale9" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-09-CqG2QIp1.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku9">SKU</label>
                                                              <input type="text" className="form-control" id="sku9" defaultValue="HD-1TB" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName9">Product</label>
                                                                  <input type="text" className="form-control" id="productName9" defaultValue="External Hard Drive" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category9">Category</label>
                                                                  <input type="text" className="form-control" id="category9" defaultValue="Peripherals" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold9">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold9" defaultValue="50" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice9">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice9" defaultValue="60.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice9">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice9" defaultValue="55.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit9">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit9" defaultValue="$250.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin9">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin9" defaultValue="-9%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax9">Tax</label>
                                                                  <input type="number" className="form-control" id="tax9" defaultValue="120.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus9">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost9">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost9" defaultValue="$3,000.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue9">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue9" defaultValue="$3,250.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount9">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount9" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue9">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue9" defaultValue="$3,130.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit9">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit9" defaultValue="$5.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-11 border rounded-1 p-1">
                                              <img src="../assets/img-10-DqnuMbAd.png" loading="lazy" alt="Product" className="img-fluid" />
                                          </div>
                                          <div>
                                              <a href="#" className="text-reset fw-medium">Portable Charger</a>
                                              <p className="text-muted fs-sm">Accessories</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PC-500</a></td>
                                  <td>Power</td>
                                  <td>120</td>
                                  <td className="text-success fw-medium"><i className="ri-arrow-up-line me-1"></i>$840.00</td>
                                  <td>$180.00</td>
                                  <td>
                                      <span className="badge bg-success-subtle text-success border border-success-subtle">Profitable</span>
                                  </td>
                                  <td>$1,800.00</td>
                                  <td>
                                      <div className="d-flex gap-2">
                                          <button className="accordion-button edit-icon-btn collapsed bg-body-secondary border shadow-none rounded text-muted p-0 size-8" type="button" data-bs-toggle="collapse" data-bs-target="#sale10" aria-expanded="false"></button>
                                          <button type="button" className="btn btn-sub-danger size-8 btn-icon delete-btn" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i></button>
                                      </div>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="9" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale10" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-10-DqnuMbAd.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div className="w-40">
                                                              <label className="form-label" htmlFor="sku10">SKU</label>
                                                              <input type="text" className="form-control" id="sku10" defaultValue="PC-500" />
                                                          </div>
                                                      </div>
                                                      <div className="col-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productName10">Product</label>
                                                                  <input type="text" className="form-control" id="productName10" defaultValue="Portable Charger" readOnly />
                                                              </div>
                                                              <div className="col-5">
                                                                  <label className="form-label" htmlFor="category10">Category</label>
                                                                  <input type="text" className="form-control" id="category10" defaultValue="Accessories" />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="unitsSold10">Units Sold</label>
                                                                  <input type="number" className="form-control" id="unitsSold10" defaultValue="120" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="costPrice10">Cost Price</label>
                                                                  <input type="number" className="form-control" id="costPrice10" defaultValue="15.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="sellingPrice10">Selling Price</label>
                                                                  <input type="number" className="form-control" id="sellingPrice10" defaultValue="22.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="grossProfit10">Gross Profit</label>
                                                                  <input type="text" className="form-control" id="grossProfit10" defaultValue="$840.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="margin10">Margin %</label>
                                                                  <input type="text" className="form-control" id="margin10" defaultValue="27%" readOnly />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="tax10">Tax</label>
                                                                  <input type="number" className="form-control" id="tax10" defaultValue="180.00" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="financeStatus10">Status</label>
                                                                  <div id="financeStatus" className="d-block"></div>
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="totalCost10">Total Cost</label>
                                                                  <input type="text" className="form-control" id="totalCost10" defaultValue="$2,640.00" readOnly />
                                                              </div>
                                                              <div className="col-2">
                                                                  <label className="form-label" htmlFor="revenue10">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue10" defaultValue="$1,800.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount10">Discount (%)</label>
                                                                  <input type="number" className="form-control" id="discount10" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="netRevenue10">Net Revenue</label>
                                                                  <input type="text" className="form-control" id="netRevenue10" defaultValue="$2,460.00" readOnly />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="profitPerUnit10">Profit / Unit</label>
                                                                  <input type="text" className="form-control" id="profitPerUnit10" defaultValue="$7.00" readOnly />
                                                              </div>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </form>
                                              <div className="col-12 mt-5 text-end">
                                                  <button type="button" className="btn btn-danger me-1">Delete</button>
                                                  <button type="submit" className="btn btn-secondary">Update</button>
                                              </div>
                                          </div>
                                      </div>
                                  </td>
                              </tr>
                          </tbody>
                      </table>
                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">25</b> Results</p>
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
                                  <div className="col-5">
                                      <label htmlFor="financeSKU" className="form-label">SKU</label>
                                      <input id="financeSKU" type="text" className="form-control" placeholder="Enter SKU" />
                                  </div>
                                  <div className="col-5">
                                      <label htmlFor="financeCategory" className="form-label">Category</label>
                                      <input id="financeCategory" type="text" className="form-control" placeholder="Product category" />
                                  </div>
                                  <div className="col-4">
                                      <label htmlFor="financeUnitsSold" className="form-label">Units Sold</label>
                                      <input id="financeUnitsSold" type="number" className="form-control" placeholder="e.g. 120" />
                                  </div>
                                  <div className="col-3">
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
                                  <div className="col-4">
                                      <label htmlFor="financeTaxAmount" className="form-label">Tax Amount</label>
                                      <input id="financeTaxAmount" type="number" className="form-control" placeholder="e.g. 180.00" />
                                  </div>
                                  <div className="col-4">
                                      <label htmlFor="financeTotalCost" className="form-label">Total Cost</label>
                                      <input id="financeTotalCost" type="text" className="form-control" placeholder="$0.00" />
                                  </div>
                                  <div className="col-4">
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
