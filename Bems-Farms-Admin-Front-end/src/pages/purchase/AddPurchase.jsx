import { Link } from 'react-router-dom'

export default function AddPurchase() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Add</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Purchase</a></li>
                  <li className="breadcrumb-item active">Add</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                  <h4 className="card-title mb-0">Create Purchase</h4>
              </div>
              <div className="card-body">
                  <form>
                      <div className="row g-5 mb-5">
                          <div className="col-md-4">
                              <label htmlFor="supplierName" className="form-label">Supplier Name <span className="text-danger">*</span></label>
                              <input type="text" className="form-control" id="supplierName" placeholder="Enter supplier name" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="purchaseDate" className="form-label">Date <span className="text-danger">*</span></label>
                              <input type="text" id="purchaseDate" className="form-control" data-datepicker data-date-format="dd-MM-yyyy" placeholder="Choose date" />
                          </div>
                          <div className="col-md-4">
                              <label htmlFor="warehouse" className="form-label">Warehouse <span className="text-danger">*</span></label>
                              <div id="warehouse"></div>
                          </div>
                          <div className="col-md-6">
                              <label htmlFor="productSearch" className="form-label">Product</label>
                              <input type="text" className="form-control" id="productSearch" placeholder="Search Product by Code Name" />
                          </div>
                          <div className="col-md-6">
                              <label htmlFor="warehouse" className="form-label">Purchase Status<span className="text-danger">*</span></label>
                              <div id="purchaseStatus"></div>
                          </div>
                      </div>
                      <div className="table-responsive mb-5">
                          <table className="table table-borderless align-middle text-center text-nowrap">
                              <thead>
                                  <tr className="bg-light">
                                      <th className="fw-medium text-muted">Product</th>
                                      <th className="fw-medium text-muted">Net Unit Cost</th>
                                      <th className="fw-medium text-muted">Stock</th>
                                      <th className="fw-medium text-muted">Qty</th>
                                      <th className="fw-medium text-muted">Discount</th>
                                      <th className="fw-medium text-muted">Tax (%)</th>
                                      <th className="fw-medium text-muted">Subtotal</th>
                                      <th className="fw-medium text-muted">Action</th>
                                  </tr>
                              </thead>
                              <tbody id="orderItems">
                                  <tr>
                                      <td colSpan="8" className="text-muted">No product selected</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                      <div className="row mb-5">
                          <div className="col-md-4 offset-md-8">
                              <div className="table-responsive">
                                  <table className="table table-borderless text-end text-nowrap">
                                      <tr>
                                          <td>Order Tax</td>
                                          <td>0.00 $ (0.00%)</td>
                                      </tr>
                                      <tr>
                                          <td>Discount</td>
                                          <td>0.00 $</td>
                                      </tr>
                                      <tr>
                                          <td>Shipping</td>
                                          <td>0.00 $</td>
                                      </tr>
                                      <tr className="fw-bold">
                                          <td>Grand Total</td>
                                          <td>0.00 $</td>
                                      </tr>
                                  </table>
                              </div>
                          </div>
                      </div>
                      <div className="row g-5">
                          <div className="col-md-6 col-lg-4">
                              <label htmlFor="orderTax" className="form-label">Order Tax (%)</label>
                              <input type="number" className="form-control" id="orderTax" placeholder="0.00" />
                          </div>
                          <div className="col-md-6 col-lg-4">
                              <label htmlFor="discount" className="form-label">Discount ($)</label>
                              <input type="number" className="form-control" id="discount" placeholder="0.00" />
                          </div>
                          <div className="col-md-6 col-lg-4">
                              <label htmlFor="shipping" className="form-label">Shipping ($)</label>
                              <input type="number" className="form-control" id="shipping" placeholder="0.00" />
                          </div>
                          <div className="col-md-6 col-lg-4">
                              <label htmlFor="warehouse" className="form-label">Payment Status <span className="text-danger">*</span></label>
                              <div id="paymentStatus"></div>
                          </div>
                          <div className="col-md-6 col-lg-4">
                              <label className="form-label">Payment Method <span className="text-danger">*</span></label>
                              <div id="paymentMethod"></div>
                          </div>
                          <div className="col-md-6 col-lg-4">
                              <label htmlFor="referenceNo" className="form-label">Reference / Invoice No</label>
                              <input type="text" className="form-control" id="referenceNo" placeholder="Enter invoice or reference number" />
                          </div>
                          <div className="col-12">
                              <label htmlFor="note" className="form-label">Note</label>
                              <div id="editor"></div>
                              <p className="text-muted mt-2">Maximum 20 Words Allowed</p>
                          </div>
                      </div>
                      <div className="d-flex gap-2 justify-content-end mt-5">
                          <button type="button" className="btn btn-light">Cancel</button>
                          <button type="submit" className="btn btn-primary">Create Purchase</button>
                      </div>
                  </form>
              </div>
          </div>
    </div>
  )
}
