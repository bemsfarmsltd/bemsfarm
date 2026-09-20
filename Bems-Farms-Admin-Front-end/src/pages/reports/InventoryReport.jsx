import { Link } from 'react-router-dom'

export default function InventoryReport() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Products</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><Link to="/reports/sales">Reports</Link></li>
                  <li className="breadcrumb-item active">Products</li>
              </ul>
          </div>
      <div className="row g-3 mb-4">
        {[
          {
            label: 'Total Products',
            value: '9,423',
            glow: 'bg-card-glow-indigo',
            iconBg: '#EEF2FF',
            iconColor: '#4F46E5',
            icon: 'ri-store-2-line',
            subLeft: 'Catalog Items',
            subRight: '+9.8% Growth'
          },
          {
            label: 'Published Products',
            value: '7,856',
            glow: 'bg-card-glow-green',
            iconBg: '#ECFDF5',
            iconColor: '#059669',
            icon: 'ri-checkbox-circle-line',
            subLeft: 'Live Online & POS',
            subRight: '83.4% Active'
          },
          {
            label: 'Inactive Products',
            value: '1,142',
            glow: 'bg-card-glow-amber',
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            icon: 'ri-pause-circle-line',
            subLeft: 'Drafts & Paused',
            subRight: 'Archived'
          },
          {
            label: 'Out of Stock',
            value: '425',
            glow: 'bg-card-glow-red',
            iconBg: '#FFF1F2',
            iconColor: '#E11D48',
            icon: 'ri-alert-line',
            subLeft: 'Zero Inventory',
            subRight: 'Restock Needed'
          },
          {
            label: 'Inventory Value',
            value: '₦42.8M',
            glow: 'bg-card-glow-teal',
            iconBg: '#F0FDFA',
            iconColor: '#0D9488',
            icon: 'ri-money-cny-box-line',
            subLeft: 'Stock Cost Valuation',
            subRight: '+12.4% MoM'
          },
        ].map(c => (
          <div className="col-12 col-sm-6 col-xl" key={c.label}>
            <div className={`card h-100 border-0 shadow-sm rounded-4 valuation-kpi-card ${c.glow}`}>
              <div className="card-body p-3.5">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="text-uppercase fs-11 fw-bolder text-muted tracking-wider text-truncate me-2" title={c.label}>
                    {c.label}
                  </span>
                  <span className="kpi-icon-pill" style={{ background: c.iconBg, color: c.iconColor }}>
                    <i className={`${c.icon} fs-18`}></i>
                  </span>
                </div>
                <div className="fs-22 fw-bolder text-dark mb-1 font-display text-truncate">
                  {c.value}
                </div>
                <div className="d-flex align-items-center justify-content-between text-muted fs-12 mt-2 pt-2 border-top">
                  <span className="text-truncate me-2">{c.subLeft}</span>
                  <strong className="text-dark font-monospace flex-shrink-0">{c.subRight}</strong>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
          <div className="card">
              <div className="card-header d-flex flex-wrap gap-2 align-items-center justify-content-between">
                  <h5 className="card-title mb-0">Product List</h5>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                      <div className="position-relative">
                          <input type="text" id="tableSearch" className="form-control ps-10" placeholder="Search products..." />
                          <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div className="position-relative flex-shrink-0 w-56">
                          <input type="text" className="form-control ps-10" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                          <i data-lucide="calendar" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                      </div>
                      <div id="filterCategory" className="w-40"></div>
                      <div id="filterStock" className="w-40"></div>
                      <div id="filterStatus" className="w-40"></div>
                      <div id="filterPrice" className="w-40"></div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table text-nowrap align-middle mb-0">
                          <thead>
                              <tr className="bg-light border-bottom">
                                  <th>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="checkAllSales" />
                                      </div>
                                  </th>
                                  <th className="fw-medium text-muted">Product ID</th>
                                  <th className="fw-medium text-muted">Product</th>
                                  <th className="fw-medium text-muted">Category</th>
                                  <th className="fw-medium text-muted">Stock</th>
                                  <th className="fw-medium text-muted">Price</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Action</th>
                              </tr>
                          </thead>
                          <tbody className="accordion" id="salesAccordion">
                              <tr>
                                  <td>
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19115</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-01-BBWp8t8E.png" className="img-fluid" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Blouse Ruffle Tube top</a>
                                      </div>
                                  </td>
                                  <td>Fashion</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch1" defaultChecked />
                                          <label className="label" htmlFor="switch1"></label>
                                      </div>
                                  </td>
                                  <td>$159</td>
                                  <td>
                                      <span className="badge bg-success-subtle border border-success-subtle text-success">
                                          Published
                                      </span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale1" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale1" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-01-BBWp8t8E.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19115" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Blouse Ruffle Tube top" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="159" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19112</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-02-ClVfz9I5.png" className="img-fluid" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Blouse Ruffle Tube top</a>
                                      </div>
                                  </td>
                                  <td>Fashion</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch2" />
                                          <label className="label" htmlFor="switch2"></label>
                                      </div>
                                  </td>
                                  <td>$159</td>
                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Published</span></td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale2" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale2" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-02-ClVfz9I5.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19112" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Blouse Ruffle Tube top" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="159" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check1" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19113</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-03-oTTY_McP.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Casual Shirt Summer</a>
                                      </div>
                                  </td>
                                  <td>Apparel</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch3" defaultChecked />
                                          <label className="label" htmlFor="switch3"></label>
                                      </div>
                                  </td>
                                  <td>$89</td>
                                  <td>
                                      <span className="badge bg-success-subtle border border-success-subtle text-success">Published
                                      </span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale3" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale3" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-03-oTTY_McP.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19113" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Casual Shirt Summer" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="89" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check2" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19114</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-04-DZ4OtBxS.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Elegant Leather Bag</a>
                                      </div>
                                  </td>
                                  <td>Bags</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch4" defaultChecked />
                                          <label className="label" htmlFor="switch4"></label>
                                      </div>
                                  </td>
                                  <td>$120</td>
                                  <td>
                                      <span className="badge bg-warning-subtle border border-warning-subtle text-warning">
                                          Inactive
                                      </span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale4" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale4" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-04-DZ4OtBxS.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19114" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Elegant Leather Bag" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="120" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check3" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19115</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-05-DPzi-ptA.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Summer Sandals</a>
                                      </div>
                                  </td>
                                  <td>Footwear</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch5" defaultChecked />
                                          <label className="label" htmlFor="switch5"></label>
                                      </div>
                                  </td>
                                  <td>$49</td>
                                  <td>
                                      <span className="badge bg-success-subtle border border-success-subtle text-success">
                                          Published
                                      </span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale5" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale5" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-05-DPzi-ptA.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19115" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Summer Sandals" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="49" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check4" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19116</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-06-DdkuSG6a.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Wireless Earbuds</a>
                                      </div>
                                  </td>
                                  <td>Electronics</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch6" defaultChecked />
                                          <label className="label" htmlFor="switch6"></label>
                                      </div>
                                  </td>
                                  <td>$79</td>
                                  <td>
                                      <span className="badge bg-success-subtle border border-success-subtle text-success">
                                          Published
                                      </span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale6" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale6" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-06-DdkuSG6a.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19116" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Wireless Earbuds" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="79" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check5" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19117</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-07-9mjzrP7h.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Denim Jacket</a>
                                      </div>
                                  </td>
                                  <td>Apparel</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch7" defaultChecked />
                                          <label className="label" htmlFor="switch7"></label>
                                      </div>
                                  </td>
                                  <td>$79</td>
                                  <td>
                                      <span className="badge bg-success-subtle border border-success-subtle text-success">Published</span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale7" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale7" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-07-9mjzrP7h.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19117" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Denim Jacket" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="79" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check6" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19118</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-08-BXmGY-HZ.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Leather Belt</a>
                                      </div>
                                  </td>
                                  <td>Accessories</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch8" />
                                          <label className="label" htmlFor="switch8"></label>
                                      </div>
                                  </td>
                                  <td>$45</td>
                                  <td>
                                      <span className="badge bg-warning-subtle border border-warning-subtle text-warning">Inactive</span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale8" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale8" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-08-BXmGY-HZ.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19118" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Leather Belt" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="45" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check7" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19119</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-09-CqG2QIp1.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Sports Sneakers</a>
                                      </div>
                                  </td>
                                  <td>Footwear</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch9" defaultChecked />
                                          <label className="label" htmlFor="switch9"></label>
                                      </div>
                                  </td>
                                  <td>$99</td>
                                  <td>
                                      <span className="badge bg-success-subtle border border-success-subtle text-success">Published</span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale9" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale9" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-09-CqG2QIp1.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19119" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Sports Sneakers" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="99" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
                                      <div className="form-check check-primary">
                                          <input className="form-check-input" type="checkbox" id="check8" />
                                      </div>
                                  </td>
                                  <td><a href="#" className="link link-custom-primary">PEP-19120</a></td>
                                  <td>
                                      <div className="d-flex align-items-center gap-2">
                                          <div className="avatar size-9 border rounded-1 p-1">
                                              <img src="../assets/img-10-DqnuMbAd.png" className="img-fluid" alt="Product Image" />
                                          </div>
                                          <a href="#" className="text-reset fw-medium">Silk Scarf</a>
                                      </div>
                                  </td>
                                  <td>Accessories</td>
                                  <td>
                                      <div className="form-switch switch-light-secondary">
                                          <input type="checkbox" id="switch10" defaultChecked />
                                          <label className="label" htmlFor="switch10"></label>
                                      </div>
                                  </td>
                                  <td>$35</td>
                                  <td>
                                      <span className="badge bg-warning-subtle border border-warning-subtle text-warning">Inactive</span>
                                  </td>
                                  <td>
                                      <button className="accordion-button collapsed bg-body-secondary border shadow-none rounded text-muted py-1 edit-btn" type="button" data-bs-toggle="collapse" data-bs-target="#sale10" aria-expanded="false">Edit</button>
                                  </td>
                              </tr>
                              <tr>
                                  <td colSpan="10" className="p-0 border-0 bg-light bg-opacity-75">
                                      <div id="sale10" className="accordion-collapse collapse" data-bs-parent="#salesAccordion">
                                          <div className="accordion-body py-7 px-0">
                                              <form>
                                                  <div className="row g-5">
                                                      <div className="col-3 col-md-2">
                                                          <div className="avatar size-40 bg-body-secondary border rounded p-1 mb-6">
                                                              <img src="../assets/img-10-DqnuMbAd.png" className="img-fluid" alt="Product Image" />
                                                          </div>
                                                          <div>
                                                              <p className="fw-medium mb-2">Stock available :</p>
                                                              <div className="form-switch switch-light-secondary">
                                                                  <input type="checkbox" id="editswitch1" defaultChecked />
                                                                  <label className="label" htmlFor="editswitch1"></label>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-7 col-md-8">
                                                          <div className="row g-5">
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="productId">Product ID</label>
                                                                  <input type="text" className="form-control" id="productId" defaultValue="PEP-19120" />
                                                              </div>
                                                              <div className="col-7">
                                                                  <label className="form-label" htmlFor="productName">Product Name</label>
                                                                  <input type="text" className="form-control" id="productName" defaultValue="Silk Scarf" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="category">Category</label>
                                                                  <div id="category" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="price">Price</label>
                                                                  <input type="number" className="form-control" id="price" defaultValue="35" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="qty">QTY</label>
                                                                  <input type="number" className="form-control" id="qty" defaultValue="154" />
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="status">Status</label>
                                                                  <div id="status" className="d-block"></div>
                                                              </div>
                                                              <div className="col-4">
                                                                  <label className="form-label" htmlFor="brand">Brand</label>
                                                                  <input type="text" className="form-control" id="brand" defaultValue="Zara" />
                                                              </div>
                                                              <div className="col-3">
                                                                  <label className="form-label" htmlFor="stock">Stock</label>
                                                                  <input type="number" className="form-control" id="stock" defaultValue="154" />
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <div className="col-2">
                                                          <div className="row g-5">
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="discount">Discount</label>
                                                                  <input type="number" className="form-control" id="discount" defaultValue="0" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="revenue">Revenue</label>
                                                                  <input type="text" className="form-control" id="revenue" defaultValue="$15,236" />
                                                              </div>
                                                              <div className="col-12">
                                                                  <label className="form-label" htmlFor="cost">Cost</label>
                                                                  <input type="number" className="form-control" id="cost" defaultValue="8.50" />
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
    </div>
  )
}
