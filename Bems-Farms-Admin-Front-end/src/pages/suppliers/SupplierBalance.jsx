import { Link } from 'react-router-dom'

export default function SupplierBalance() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Balance Reports</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Suppliers</a></li>
                  <li className="breadcrumb-item active">Balance Reports</li>
              </ul>
          </div>
          <div className="card">
              <div className="card-header">
                  <div className="row g-2 justify-content-between">
                      <div className="col-md-6 col-lg-5 col-xl-4 col-xxl-3">
                          <div className="position-relative">
                              <input type="text" id="lostItemSearch" className="form-control ps-10" placeholder="Search Name, Bank & Account Number..." />
                              <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-4 translate-middle-y"></i>
                          </div>
                      </div>
                      <div className="col-md-3 col-lg-2 text-end">
                          <div className="dropdown">
                              <button type="button" className="btn btn-outline-light border" data-bs-toggle="dropdown" aria-expanded="false"><i data-lucide="arrow-down-to-line" className="size-4 me-1"></i>Export As</button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                  <li><a className="dropdown-item" href="#" id="exportPrint">Print PDF</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportJSON">Export CSV</a></li>
                                  <li><a className="dropdown-item" href="#" id="exportXML">Export XML</a></li>
                              </ul>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="card-body pt-0">
                  <div className="table-card table-responsive">
                      <table className="table table-hover align-middle mb-0 text-nowrap">
                          <thead className="bg-light">
                              <tr>
                                  <th className="fw-medium text-muted">Name</th>
                                  <th className="fw-medium text-muted">Bank & Account Number</th>
                                  <th className="fw-medium text-muted">Status</th>
                                  <th className="fw-medium text-muted">Credit</th>
                                  <th className="fw-medium text-muted">Debit</th>
                                  <th className="fw-medium text-muted">Balance</th>
                              </tr>
                          </thead>
                          <tbody>
                              <tr>
                                  <td>Ava Mason</td>
                                  <td>SWIZ - 3456565767787</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>$614,848</td>
                                  <td>-$450</td>
                                  <td>$614,389</td>
                              </tr>
                              <tr>
                                  <td>Caspian Marigold</td>
                                  <td>NBC - 4324356677889</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>$1,686</td>
                                  <td>-$700</td>
                                  <td>$986</td>
                              </tr>
                              <tr>
                                  <td>Emma James</td>
                                  <td>NBC - 2343547586900</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>$16,547</td>
                                  <td>-$1,000</td>
                                  <td>$15,547</td>
                              </tr>
                              <tr>
                                  <td>Isabella Jackson</td>
                                  <td>IBO - 3434565776768</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>$77,818</td>
                                  <td>-$300</td>
                                  <td>$77,518</td>
                              </tr>
                              <tr>
                                  <td>Olivia Ethan</td>
                                  <td>IBO - 3453647664889</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>$141,845</td>
                                  <td>-$1,200</td>
                                  <td>$141,645</td>
                              </tr>
                              <tr>
                                  <td>Orion Astrid</td>
                                  <td>IBO - 4353689870544</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>$1,948</td>
                                  <td>-$100</td>
                                  <td>$1,848</td>
                              </tr>
                              <tr>
                                  <td>Liam Carter</td>
                                  <td>SWIZ - 8765432109876</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Active</span></td>
                                  <td>$12,345</td>
                                  <td>-$500</td>
                                  <td>$11,845</td>
                              </tr>
                              <tr>
                                  <td>Mia Thompson</td>
                                  <td>NBC - 7654321098765</td>
                                  <td><span className="badge bg-success-subtle text-success border border-success-subtle">Pending</span></td>
                                  <td>$8,910</td>
                                  <td>-$200</td>
                                  <td>$8,710</td>
                              </tr>
                              <tr>
                                  <td>Noah Wilson</td>
                                  <td>IBO - 6543210987654</td>
                                  <td><span className="badge bg-danger-subtle text-danger border border-danger-subtle">Inactive</span></td>
                                  <td>$5,600</td>
                                  <td>-$1,000</td>
                                  <td>$4,600</td>
                              </tr>
                              <tr>
                                  <td>Charlotte Lee</td>
                                  <td>SWIZ - 5432109876543</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Active</span></td>
                                  <td>$23,450</td>
                                  <td>-$1,500</td>
                                  <td>$21,950</td>
                              </tr>
                              <tr>
                                  <td>Elijah Brown</td>
                                  <td>NBC - 4321098765432</td>
                                  <td><span className="badge bg-warning-subtle text-warning border border-warning-subtle">Pending</span></td>
                                  <td>$7,890</td>
                                  <td>-$300</td>
                                  <td>$7,590</td>
                              </tr>
                              <tr className="bg-light fw-bold">
                                  <td colSpan="3">Total</td>
                                  <td>$854,692</td>
                                  <td>-$3,750</td>
                                  <td>$850,942</td>
                              </tr>
                          </tbody>
                      </table>

                  </div>
                  <div className="row align-items-center g-3 mt-3">
                      <div className="col-md-6">
                          <p className="text-muted text-center text-md-start mb-0">Showing <b className="me-1">1-10</b> of <b className="ms-1">16</b> Results</p>
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
    </div>
  )
}
