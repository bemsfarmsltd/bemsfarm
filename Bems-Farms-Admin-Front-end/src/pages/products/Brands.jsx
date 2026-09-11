import { useState, useEffect } from 'react'
import ImportModal from '../../components/ImportModal'

const BRAND_IMPORT_FIELDS = [
  { key:'name',   label:'Name',   required:true  },
  { key:'status', label:'Status', required:false },
]

function genBrandCode(name, existingCodes = []) {
  const slug = name.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X')
  let counter = 1
  let code
  do {
    code = `BRD-${slug}-${String(counter).padStart(3, '0')}`
    counter++
  } while (existingCodes.includes(code))
  return code
}

export default function Brands() {
  const [brandName, setBrandName] = useState('')
  const [brandCode, setBrandCode] = useState('')
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    if (brandName.trim()) {
      setBrandCode(genBrandCode(brandName))
    } else {
      setBrandCode('')
    }
  }, [brandName])

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Brands</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Products</a></li>
                  <li className="breadcrumb-item active">Brands</li>
              </ul>
          </div>
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-5">
              <div className="col">
                  <div className="card overflow-hidden">
                      <div className="card-body position-relative z-1">
                          <span className="text-success fw-medium float-end"><i data-lucide="trending-up" className="size-4 me-1"></i>4.5</span>
                          <div className="d-flex gap-4 align-items-center">
                              <div className="size-11 avatar bg-primary text-white rounded-3">
                                  <i data-lucide="layers" className="size-5"></i>
                              </div>
                              <div>
                                  <h5 className="mb-2">128</h5>
                                  <p className="text-muted">All Brands</p>
                              </div>
                          </div>
                      </div>
                      <div className="h-32 w-48 bg-primary position-absolute rounded-circle top-100 start-50 translate-middle-x blur-2xl bg-opacity-25"></div>
                  </div>
              </div>
              <div className="col">
                  <div className="card overflow-hidden">
                      <div className="card-body position-relative z-1">
                          <span className="text-success fw-medium float-end"><i data-lucide="trending-up" className="size-4 me-1"></i>4.9</span>
                          <div className="d-flex gap-4 align-items-center">
                              <div className="size-11 avatar bg-success text-white rounded-3">
                                  <i data-lucide="check-circle-2" className="size-5"></i>
                              </div>
                              <div>
                                  <h5 className="mb-2">96</h5>
                                  <p className="text-muted">Active Brands</p>
                              </div>
                          </div>
                      </div>
                      <div className="h-32 w-48 bg-success position-absolute rounded-circle top-100 start-50 translate-middle-x blur-2xl bg-opacity-25"></div>
                  </div>
              </div>
              <div className="col">
                  <div className="card overflow-hidden">
                      <div className="card-body position-relative z-1">
                          <span className="text-success fw-medium float-end"><i data-lucide="trending-up" className="size-4 me-1"></i>4.7</span>
                          <div className="d-flex gap-4 align-items-center">
                              <div className="size-11 avatar bg-purple text-white rounded-3">
                                  <i data-lucide="monitor" className="size-5"></i>
                              </div>
                              <div>
                                  <h5 className="mb-2">88</h5>
                                  <p className="text-muted">POS Visible</p>
                              </div>
                          </div>
                      </div>
                      <div className="h-32 w-48 bg-purple position-absolute rounded-circle top-100 start-50 translate-middle-x blur-2xl bg-opacity-25"></div>
                  </div>
              </div>
              <div className="col">
                  <div className="card overflow-hidden">
                      <div className="card-body position-relative z-1">
                          <span className="text-danger fw-medium float-end"><i data-lucide="trending-down" className="size-4 me-1"></i>3.6</span>
                          <div className="d-flex gap-4 align-items-center">
                              <div className="size-11 avatar bg-danger text-white rounded-3">
                                  <i data-lucide="x-circle" className="size-5"></i>
                              </div>
                              <div>
                                  <h5 className="mb-2">32</h5>
                                  <p className="text-muted">Inactive Brands</p>
                              </div>
                          </div>
                      </div>
                      <div className="h-32 w-48 bg-danger position-absolute rounded-circle top-100 start-50 translate-middle-x blur-2xl bg-opacity-25"></div>
                  </div>
              </div>
              <div className="col">
                  <div className="card overflow-hidden">
                      <div className="card-body position-relative z-1">
                          <span className="text-success fw-medium float-end"><i data-lucide="trending-up" className="size-4 me-1"></i>4.5</span>
                          <div className="d-flex gap-4 align-items-center">
                              <div className="size-11 avatar bg-info text-white rounded-3">
                                  <i data-lucide="globe-2" className="size-5"></i>
                              </div>
                              <div>
                                  <h5 className="mb-2">78</h5>
                                  <p className="text-muted">Web Visible</p>
                              </div>
                          </div>
                      </div>
                      <div className="h-32 w-48 bg-info position-absolute rounded-circle top-100 start-50 translate-middle-x blur-2xl bg-opacity-25"></div>
                  </div>
              </div>
          </div>
          <div className="row">
              <div className="col-12">
                  <div className="card">
                      <div className="card-header">
                          <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
                              <h5 className="card-title mb-0">Total Brands</h5>
                              <button type="button" className="btn btn-outline-secondary me-1" onClick={() => setShowImport(true)}><i className="ri-upload-cloud-2-line me-1"></i>Import</button>
                              <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addBrandModal"><i className="ri-add-line me-1"></i>Add Brand</button>
                          </div>
                          <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                              <ul className="nav nav-pills rounded nav-primary" id="brand-tab" role="tablist">
                                  <li className="nav-item" role="presentation">
                                      <button className="nav-link active" id="tab-all-brands" data-bs-toggle="pill" data-bs-target="#pane-all-brands" type="button" role="tab" aria-controls="pane-all-brands" aria-selected="true">
                                          All Brands
                                      </button>
                                  </li>
                                  <li className="nav-item" role="presentation">
                                      <button className="nav-link" id="tab-active-brands" data-bs-toggle="pill" data-bs-target="#pane-active-brands" type="button" role="tab" aria-controls="pane-active-brands" aria-selected="false">
                                          Active
                                      </button>
                                  </li>
                                  <li className="nav-item" role="presentation">
                                      <button className="nav-link" id="tab-pos-brands" data-bs-toggle="pill" data-bs-target="#pane-pos-brands" type="button" role="tab" aria-controls="pane-pos-brands" aria-selected="false">
                                          POS
                                      </button>
                                  </li>
                                  <li className="nav-item" role="presentation">
                                      <button className="nav-link" id="tab-inactive-brands" data-bs-toggle="pill" data-bs-target="#pane-inactive-brands" type="button" role="tab" aria-controls="pane-inactive-brands" aria-selected="false">
                                          Inactive
                                      </button>
                                  </li>
                                  <li className="nav-item" role="presentation">
                                      <button className="nav-link" id="tab-web-brands" data-bs-toggle="pill" data-bs-target="#pane-web-brands" type="button" role="tab" aria-controls="pane-web-brands" aria-selected="false">
                                          Web
                                      </button>
                                  </li>
                              </ul>
                              <div className="flex-shrink-0">
                                  <label htmlFor="searchProductInput" className="form-label d-none">Search</label>
                                  <div className="position-relative">
                                      <input type="text" className="form-control ps-9" id="searchProductInput" placeholder="Search for..." />
                                      <i data-lucide="search" className="size-4 icon-dark position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="card-body pt-0">
                          <div className="tab-content" id="brand-tabContent">
                              <div className="tab-pane fade show active" id="pane-all-brands" role="tabpanel" aria-labelledby="tab-all-brands" tabIndex="0">
                                  <div className="table-card table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead>
                                              <tr className="border-bottom">
                                                  <th className="fw-medium text-muted">Brand Code</th>
                                                  <th className="fw-medium text-muted">Brand</th>
                                                  <th className="fw-medium text-muted">Category</th>
                                                  <th className="fw-medium text-muted">POS</th>
                                                  <th className="fw-medium text-muted">Description</th>
                                                  <th className="fw-medium text-muted">Web</th>
                                                  <th className="fw-medium text-muted">Status</th>
                                                  <th className="fw-medium text-muted">Updated</th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">NKE-001</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-01-D8G-cM9e.png" loading="lazy" alt="Nike" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Nike</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Global sportswear & footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 10, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">ADS-002</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Adidas" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Adidas</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>International athletic apparel brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 02, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">PMA-003</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Puma" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Puma</a>
                                                      </div>
                                                  </td>
                                                  <td>Footwear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Sport & lifestyle footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 18, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="active" data-pos="1" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">APL-004</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-04-BSvpIvZZ.png" loading="lazy" alt="Apple" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Apple</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Consumer electronics & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 28, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">SNY-005</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-05-CZAuy0l0.png" loading="lazy" alt="Sony" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Sony</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Audio, video & entertainment products</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Jan 09, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">HNK-006</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="H&M" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">H&amp;M</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Fast fashion clothing & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 12, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="active" data-pos="1" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">ZRA-007</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Zara" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Zara</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Premium fashion retail brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 30, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">SAM-008</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Samsung" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Samsung</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Consumer electronics & appliances</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 06, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LEV-009</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Levi's" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Levi’s</a>
                                                      </div>
                                                  </td>
                                                  <td>Denim</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Iconic denim & casualwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 05, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">BOS-010</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-10-DumxJyKz.png" loading="lazy" alt="Bose" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Bose</a>
                                                      </div>
                                                  </td>
                                                  <td>Audio</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Premium audio & sound systems</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Jan 22, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
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
                                                  <li className="page-item"><a className="page-link" href="#">3</a></li>
                                                  <li className="page-item"><a className="page-link" href="#">Next<i data-lucide="chevron-right" className="size-4"></i></a></li>
                                              </ul>
                                          </nav>
                                      </div>
                                  </div>
                              </div>
                              <div className="tab-pane fade" id="pane-active-brands" role="tabpanel" aria-labelledby="tab-active-brands" tabIndex="0">
                                  <div className="table-card table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead>
                                              <tr className="border-bottom">
                                                  <th className="fw-medium text-muted">Brand Code</th>
                                                  <th className="fw-medium text-muted">Brand</th>
                                                  <th className="fw-medium text-muted">Category</th>
                                                  <th className="fw-medium text-muted">POS</th>
                                                  <th className="fw-medium text-muted">Description</th>
                                                  <th className="fw-medium text-muted">Web</th>
                                                  <th className="fw-medium text-muted">Status</th>
                                                  <th className="fw-medium text-muted">Updated</th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">NKE-001</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-01-D8G-cM9e.png" loading="lazy" alt="Nike" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Nike</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Global sportswear & footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 10, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">ADS-002</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Adidas" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Adidas</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>International athletic apparel brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 02, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">APL-004</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-04-BSvpIvZZ.png" loading="lazy" alt="Apple" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Apple</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Consumer electronics & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 28, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">HNK-006</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="H&M" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">H&amp;M</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Fast fashion clothing & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 12, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">ZRA-007</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Zara" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Zara</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Premium fashion retail brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 30, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LEV-009</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAACxRJREFUeJzNW2tsFNcVvjP73rXBjwANYCi0IRTlRx9pRRMIEkiVquRHqFKpVYv6VJQfFETNU5AIkBowJCAQRE0rtY0lVAkhtcmfQlUVh0dL7CKgojb4AfhtY/Db692d3Zl+5+7c9ex4ZtbYniEHfcz67sw993z3PO7s3JHZFOXA/v3BgwcPrtq7d++bu3btOrZt27a/bN26tQbHy5WVlVcEtm/fTrhsgUs5VBIqP620ANrFeeI60edVHTkd+jX/2LNnz58xtoOHDx9+48SJE4uPVFXJU7Wr4Ilv79sX2Ltv32ujY2N/bW9vv9bc3Pzh3bt3t+H4ektLy7qmpqY1jY2NL+PIQZ+BNRZYm0MToemVJgugXZwnrhN9vqQjpwNjeAVj2IDrfoC/375///7Z7u7uWo2xY8ePH3/h0KFD0rQJ2LJli4TZXjUwOHi2pbn5XH19/XehrBgK2OPHj9nAwAAbHBzkoM/9/f38+DRAunt7exkmSAIRz965c2crPn8qS/KhkydPlj4xATt27Iim0+lj9+7dq2toaHi9tbU11NfXx4aHh9no6KgtRkZGngpoXASaDJqczs5OBu8oq2+o39XT21tbVVX1Y4SHpa2TGhHXYXS2BwwSi9GhoSGWSCRYMpn8XILGRhgfH+eIx+NsbGyME0KT9uD+/S8/fPjwA1mWXzt69OikkMgjYPPmzTEwegqxtBuuLhG7QoFQmEql8mDV5hWEbjMRggQa/6NHjxjsKe7q6vqIadqmKlOCzPsDrL0Dt/8FGPNTR0KBoihZpNMsLZDJAGmWoaOx3UMI3Upa4TCTIYig0Ghrayvp7Or6naZpr1oSsGnTpq9j1rdSUqFOyGChREBVCSqI1LJQtYnPTwE0FlVT+TjUjJojJKWkch4rQoO8AbkhhIR5HKFQlkfAxo0b6Yt3kUlDxJzZ+JzRBoMZgWWhsYnPXkKMI48QIJPWiTB4BHkD5bOOjo4vgZA9+/fvl3IEwMjvIGFsIKbI+EmGC6NJbd4sTPCgPQVkxzMxJjMZPDyUidAg+8jDYevPI9Hoc5yA9evXR+AeOwF/btbh6nmGm0hwkjCT2HLZZ4slsp/5mPX65Bm0L8Kc2KFIcl7XaDojRhJyeQJECG9AYiwbj8d/jYWSLGcy6VVIEt+gL3Kzbo7tgmZPyPOpNPvDYJL90Qa/H1HYMhsCfjiSYDv7R4ExS6yNpwrqtyNBJHIigUokQv57OHOJnEgkv41MGeGzr8fQVGbadgBISiqUhOB2VpgLN/yWak2AT8kAaUCxBhLdlMZgQ4LwBAoFTPo8eMHXZDDyIrHC3V5VdSOmTwCZ1l3g+g3J9LT7n6qIEZhJEN5AXhAfH18ND0g8Rw1URviJMzBeKO6BFzg568pEii1GPvBKjBVCrCH0yrBCxh9lxmwv0utMaPADj1T7HnyYhTWZGSiYskxeN9DRsHibL6MxmiNgltTS3JIXOPX3o7jCIgWy+myKWD0IW3WPiNI6QMqeYCiuvGFmdIzh+nGHLuaNJ9g3tSn/bjEtyVNv9G7dIyRJ8nECsq5vc+F0BbQOaM5Ze3XKkzjIE9N6RrKcgtlwzADQ7pAHSFYnFFYyK9qeXAQJrvkg5YF+eIDTHH8Ba/bnp1ba3REJHiC5lIio1wD+63LwAmRgtjY9wYDmuTNI7nkASQQK6lFynAJhQyLNonoYZGaYeKcj8kxWfYXED7uGEQbDDipKsfRdw7KLIlGqvBPNXQ+gzmMIsVbVIRNgAt5AMiRR4QnOq4dZFhQEVwkgxw6DgE7kAadk+MJ4kj2LgqQwOs/bREAEuEY5mRLEfwmoGHIINRn3IWvBEN0iZdwckJVutxX4dXQUuJVdhztE4kjRKBS8E9cJIAUUBm0FVoUrkwp7BnUw5S0BLi/Gmb4eYHRvwNiIg2/H4CHlKJkpBACFgldh4GoOIBELohDQlHGuBotxdkIPAy8JcF2oyoeARpRDp2pQIcsIAY1RUfQoDNwPARJSEuJLbol1qPamRXDKF30+ltScy+Zsj831wivCIAy0FqgGK+EFFAZpj8LAEw8gAigMgvg0wGhdYC9lssTLJoWBBwRY/x7ghvA8ACYGfRJr8NurpW8quBdonuQBzwgQ5ZBC4Z8hv+O5S3gyzK4M3RZPcgDTlWDyQYLE6gKyY5IrQcIksjwoh+79IDJJE8uGAXlAH5ioC9o/F6BQWaAnQ7fzgGceIJRlzZbYx2HnMKA8EKfHbC6OB5PvXRIk4QTodF+BBzyU7blfwKuBxMPARZE89QASWcsqpDJ3IWQfBjSwVbQoYrP3wMZOj6diVFgb9Dsmw0UIg6QHHmDzlauKuTT4Jdblsx9CFGMoxkBcXBZ7mwPMMooKdMmhGpBU+LJrApdEol+Fs/sJDK2TGlyUawHnOSiXJDcrgTTxe8AsPhh9ErkBD2h3CAPaFxSZbjyazDA+Asg9GsMH1c1nA4WElrtnIvZrAqJmnqzngRnkJSvj6RG5rChKwrgvyHz0Qi7DC5zW/QukaeYBC8JMW2YytEPkoXmDhNckPMYM3wjYJ8OYlL0/mJHo15t2jAziXoC1GLfHGO8NvAyMSw6LIhJaE8ym6Ha2wQMynwmXoEbJwJTYajZToR4UdDuOvkdl68df/4YHdCAZYkpYHOeZfxkuRZvvSYdiToKGhkAgQLhFe4SuwOhRnhDAsg/LTzqat8hOVfpxbU00yD4pCrHqORF2qjTK3iuLsSNlRexIeYx9WBLlRJilEzcJb84NsZ+WhNlPADq+NTfMdheH2HtFQfZRNMC6A843UHYsGDd/kdAkRyIRxe/3X5GHh4cbYfB/RR7QmaEb5Wnlgg7M5LniMPt7LMRqIwF2B8vdVrR1+2XcBstsiPq1HCaRJ7EeoB1kNOP8W1gj1CA0zuHO8bcgoLZAmFiaL5QZOKdJLioqeoDjbaoCSSTCd2DkOO0XBCssGo2yUDDEPYFvR5+F/YNPXfTh0+zDvkw4HH7/9OnTAzyzgIBL+OJvtIWU9s/FYjE2Z84chpOYjBKU3T888220Xolm2h8oxowMx2e/uLj4P2g7Q22cABiuoOF9lMU0bSElKSsr4whHwtmcwCZvOPy8UWH5YoXhe332Caeqq6tHqS1XW+Lx+L9wODA0NJTp6enhXrB06VK2pGIJ94ZgIMhrqWrsXPcKChPV+NkLWOjOTY46MUkiCeiJTyspKanu6+s7I+zOK67o7BhOPNvb26u2tbXxfLB8+XK2bNkyNn/+fBYDe364ECdCNQzCuL1e9QgGfaphL3CehxrcPxQKsdLS0lp4886amhrNkgAlpcRxwVsUH01NTezmzZt8UzERsGLFClZRUUGdcCKCwWCuZMp6WfPqB1YhmqHE0T8zEfpuUF7V4MU1GOv3z58/32vsY9LyCpVgGPgZ8BuQ8OjChQusvr6ed7Zo0SIeFgsXLmTl5eWUTLIVA+wSiBQvQAaRd/p9fj4BJCp/cWriVR+xsIPbj8H4PyWTyVcvXrzYbrbXbn2ZQQcH0MEvBwYG/lf7WS27evUqa2xs5G+IEhk0+wSxepQMXuAmhA7uAeLdIDLc8JIXNwzEwPh2VLKdqGy/unXrVtzKUNsFNjpWcOHHULYukUzs7OjouAHR6urq2O3bt9mDBw/4+7riPWLju8ReQLzGS2+DJQwve9GkwEuaYXgVxv4yxvoBMGpnZ8E7DJDwGB0fBV4EKV9NpVL7RkZGzmIA13C8jhJ6HXniOlzMEjjfFcBgDozrOma7FiHxCcLwXRDwUn9//1daW1t3t7S0THJ5s/wfWkR1JnPtPL8AAAAASUVORK5CYII=" loading="lazy" alt="Levi's" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Levi’s</a>
                                                      </div>
                                                  </td>
                                                  <td>Denim</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Iconic denim & casualwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 05, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">GAP-011</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Gap" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Gap</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Casual clothing & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>May 08, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LE-012</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAl5QTFRFAAAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAANAAAQQoAQgsANAEARw8AuWUA64sA7IsAwGoASRAASBAAUBYASREAu2YA/5oAuGUA2n4A7YwAUxgAQgwA7IwA6YkAPwkAPAcA5ocA/pkAk0gA5YYAWR0A+pYAz3YAumYAsV8AqlkARQ4Au2cAt2QAOAQANQEA7o0A5IYAjEMAQQsAYyQA/poAjUQA3YAAOgUAOgYANwMAolQATxUA0HcA/JgAXSAARA0AwmwAnlEAl0sA0XcAvWgAdjMAcC4AYSMA13wAOwYA+ZYAOQQA8pAA95QAbSwAPQgAzXQAvGcArl0AcjAAaikA/ZkA7o4AwWsA85EAYCIAQAoAZCUA9pMA0ngAOAMAvmkAsmAAejUAs2AA1nsA8Y8AtmMAhT4A6YoATBMAxG4AWh0A8I8A+5cAfjkAfDcAmE0AzXUAqVkAQwwA2HwAWBwAiEEA744A2X0AOQUAj0YAynIANgIA34EAkEYAZSYAci8AdzQAdzMAbCsAYiMAZicAejYAezYAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAXw/hugAAAMp0Uk5TAAM+boyVims0C+j/4GIGF8r9/LcUKt3MxsEJkv59EfTxDmNWtY7eEubDDRPnxf/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////ivAKfAYElH7quNuUb+EtV8EZC+fWwLwQyl6qNLc8jMRMAAAL2SURBVHic7ZdrSBRRFMfPyWKxXVMjqdYSH+GCWYSFkmSWJZbGSmVSfrBNwkLsKX6JgkIlECnIogeFhEiBz1KzjBKxEjIMaTPsQcGSPeihRo81czt3dmbUJejeaxBE58N/7hzm/HbuzP/cvYMwzsB/CYAs+GoQnS5PgPegQeRmiDEwBuCLOChQD2BAfDcKEICfhcpZmL7164BpEz8J1wNMwV4NEIgfJQD+6FABQep0RCMAn7sBoW+k6gFmPHMD5rySBJifKACz6aUkYObbAQawKA9DJoKwmwHmsmchFaE/hABh5N/H4wBYlG6z8wLmKQ7DLj0RPpllsJMXsHCYqRd2aIlopdsM2M4HiMUv7GDENi2z2OUk9Rm6wweIR6XVwK9Fn8Is1i9Tb3BOYeV799HofV2/KZODXvxVPsBqJHebWbcGNujJcAv08L5Gq4PZrI+mEYw1am6VkQSruABhUU/J6CZmGwteUJPL+0j8b3IBMr6+AIjoiH5I48hyNZn5gGT+eS6AjflnQVnWfTpE4VlxwIoPAIvs7dl4FyAGTwoDcrrIRbEnAHJv09mSUmHAzk5a5E3kwV3YCrDMUSUK2Ev2S8ASgPw2Zt/EYkFAbFwzQBIepuG+JpLkIkHA/kaS4Eg2xHoS68UeIUDa9NENxyKlUAiQHtLsAUg9KAQ4VOdRD2vxgAigsNoTYPRrEAAUYSVNQ9+r1LCFjJmKG1DMui8jXzstqSCJn53HDzjCus+kL4VHu++Rbt7NDSi4Rja2De/RztOWlpFOsO3gBRw/R7IVc/TEBlpbwNfVyglYl3iGdNv2kYtOP6KGYssKH6CUbfawP2/kouwY9hfjlQVliC6wl/xuCkLxH/DnABEFmZKA8txeBqjd8l0SUIGpykbz8iZJwJDTvVOt3yhX739qjbpbb0yXAlQmgwpoWi/z7VWNSRoAfCY5hetrMRF0wCUjWgXrQ44lwAgAoCWtOkWg/ApiHIwBwC3er0alCl+nakOBn/01668DfgJKIjdQX++ocwAAAABJRU5ErkJggg==" loading="lazy" alt="LEGO" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">LEGO</a>
                                                      </div>
                                                  </td>
                                                  <td>Toys & Games</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Creative construction toys brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 22, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="active" data-pos="1" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">CK-013</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-13-CZDztz95.png" loading="lazy" alt="Calvin Klein" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Calvin Klein</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Luxury fashion & lifestyle brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 15, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>

                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">NI-014</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Nintendo" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Nintendo</a>
                                                      </div>
                                                  </td>
                                                  <td>Gaming</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Video game hardware & software brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>May 01, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
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
                              <div className="tab-pane fade" id="pane-pos-brands" role="tabpanel" aria-labelledby="tab-pos-brands" tabIndex="0">
                                  <div className="table-card table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead>
                                              <tr className="border-bottom">
                                                  <th className="fw-medium text-muted">Brand Code</th>
                                                  <th className="fw-medium text-muted">Brand</th>
                                                  <th className="fw-medium text-muted">Category</th>
                                                  <th className="fw-medium text-muted">POS</th>
                                                  <th className="fw-medium text-muted">Description</th>
                                                  <th className="fw-medium text-muted">Web</th>
                                                  <th className="fw-medium text-muted">Status</th>
                                                  <th className="fw-medium text-muted">Updated</th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">NKE-001</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-01-D8G-cM9e.png" loading="lazy" alt="Nike" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Nike</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Global sportswear & footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 10, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">ADS-002</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Adidas" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Adidas</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>International athletic apparel brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 02, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">HNK-006</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="H&M" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">H&amp;M</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Fast fashion clothing & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 12, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LEV-009</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Levi's" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Levi’s</a>
                                                      </div>
                                                  </td>
                                                  <td>Denim</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Iconic denim & casualwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 05, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">GAP-011</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Gap" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Gap</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Casual clothing & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>May 08, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LE-012</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAl5QTFRFAAAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAANAAAQQoAQgsANAEARw8AuWUA64sA7IsAwGoASRAASBAAUBYASREAu2YA/5oAuGUA2n4A7YwAUxgAQgwA7IwA6YkAPwkAPAcA5ocA/pkAk0gA5YYAWR0A+pYAz3YAumYAsV8AqlkARQ4Au2cAt2QAOAQANQEA7o0A5IYAjEMAQQsAYyQA/poAjUQA3YAAOgUAOgYANwMAolQATxUA0HcA/JgAXSAARA0AwmwAnlEAl0sA0XcAvWgAdjMAcC4AYSMA13wAOwYA+ZYAOQQA8pAA95QAbSwAPQgAzXQAvGcArl0AcjAAaikA/ZkA7o4AwWsA85EAYCIAQAoAZCUA9pMA0ngAOAMAvmkAsmAAejUAs2AA1nsA8Y8AtmMAhT4A6YoATBMAxG4AWh0A8I8A+5cAfjkAfDcAmE0AzXUAqVkAQwwA2HwAWBwAiEEA744A2X0AOQUAj0YAynIANgIA34EAkEYAZSYAci8AdzQAdzMAbCsAYiMAZicAejYAezYAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAMwAAXw/hugAAAMp0Uk5TAAM+boyVims0C+j/4GIGF8r9/LcUKt3MxsEJkv59EfTxDmNWtY7eEubDDRPnxf/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////ivAKfAYElH7quNuUb+EtV8EZC+fWwLwQyl6qNLc8jMRMAAAL2SURBVHic7ZdrSBRRFMfPyWKxXVMjqdYSH+GCWYSFkmSWJZbGSmVSfrBNwkLsKX6JgkIlECnIogeFhEiBz1KzjBKxEjIMaTPsQcGSPeihRo81czt3dmbUJejeaxBE58N/7hzm/HbuzP/cvYMwzsB/CYAs+GoQnS5PgPegQeRmiDEwBuCLOChQD2BAfDcKEICfhcpZmL7164BpEz8J1wNMwV4NEIgfJQD+6FABQep0RCMAn7sBoW+k6gFmPHMD5rySBJifKACz6aUkYObbAQawKA9DJoKwmwHmsmchFaE/hABh5N/H4wBYlG6z8wLmKQ7DLj0RPpllsJMXsHCYqRd2aIlopdsM2M4HiMUv7GDENi2z2OUk9Rm6wweIR6XVwK9Fn8Is1i9Tb3BOYeV799HofV2/KZODXvxVPsBqJHebWbcGNujJcAv08L5Gq4PZrI+mEYw1am6VkQSruABhUU/J6CZmGwteUJPL+0j8b3IBMr6+AIjoiH5I48hyNZn5gGT+eS6AjflnQVnWfTpE4VlxwIoPAIvs7dl4FyAGTwoDcrrIRbEnAHJv09mSUmHAzk5a5E3kwV3YCrDMUSUK2Ev2S8ASgPw2Zt/EYkFAbFwzQBIepuG+JpLkIkHA/kaS4Eg2xHoS68UeIUDa9NENxyKlUAiQHtLsAUg9KAQ4VOdRD2vxgAigsNoTYPRrEAAUYSVNQ9+r1LCFjJmKG1DMui8jXzstqSCJn53HDzjCus+kL4VHu++Rbt7NDSi4Rja2De/RztOWlpFOsO3gBRw/R7IVc/TEBlpbwNfVyglYl3iGdNv2kYtOP6KGYssKH6CUbfawP2/kouwY9hfjlQVliC6wl/xuCkLxH/DnABEFmZKA8txeBqjd8l0SUIGpykbz8iZJwJDTvVOt3yhX739qjbpbb0yXAlQmgwpoWi/z7VWNSRoAfCY5hetrMRF0wCUjWgXrQ44lwAgAoCWtOkWg/ApiHIwBwC3er0alCl+nakOBn/01668DfgJKIjdQX++ocwAAAABJRU5ErkJggg==" loading="lazy" alt="LEGO" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">LEGO</a>
                                                      </div>
                                                  </td>
                                                  <td>Toys & Games</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Creative construction toys brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 22, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">NI-014</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Nintendo" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Nintendo</a>
                                                      </div>
                                                  </td>
                                                  <td>Gaming</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Video game hardware & software brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>May 01, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">AMZ-015</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Amazon" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Amazon</a>
                                                      </div>
                                                  </td>
                                                  <td>Retail & E-commerce</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Global online shopping platform</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>May 12, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                              <div className="tab-pane fade" id="pane-inactive-brands" role="tabpanel" aria-labelledby="tab-inactive-brands" tabIndex="0">
                                  <div className="table-card table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead>
                                              <tr className="border-bottom">
                                                  <th className="fw-medium text-muted">Brand Code</th>
                                                  <th className="fw-medium text-muted">Brand</th>
                                                  <th className="fw-medium text-muted">Category</th>
                                                  <th className="fw-medium text-muted">POS</th>
                                                  <th className="fw-medium text-muted">Description</th>
                                                  <th className="fw-medium text-muted">Web</th>
                                                  <th className="fw-medium text-muted">Status</th>
                                                  <th className="fw-medium text-muted">Updated</th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">PMA-003</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Puma" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Puma</a>
                                                      </div>
                                                  </td>
                                                  <td>Footwear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Sport & lifestyle footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 18, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">SNY-005</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-05-CZAuy0l0.png" loading="lazy" alt="Sony" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Sony</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Audio, video & entertainment products</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Jan 09, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown">
                                                              <i className="ri-more-2-fill"></i>
                                                          </a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">SAM-008</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAHYAAAB2AH6XKZyAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAACj9JREFUeJzVm3tw1NUVxz/nt5vdPGAhPEISIDykCgkoCLUgoyRgCVB8tDZYmc7UYn1Ba2W07TitNtqiY+3YqRIQ0aG11tE4Wh+MAiKJVUErqMAUpRYBIVNMAiSRkGR/+7unf0CAJLv7+22yG/Q7k0nmnnPvOff7u/fccx8RegEPvzo35Mt0rhe1rlZ0PGgAZI/AUxm0/fnHJdWtveFHNEiqDayonlOm6HKUnOga+i6WWYSJHFhSUn0s1f50RsoIUEUqqkvvF/jVSUN7jOp9ljHVIultxrKXArd3qvYJyB8H1/X9y4IFzzmp8u1MpIyAiqo5D4LeASDCfYNqQ/csWPBcGKBiU+kvEZYB/hjVnxtcF/phu34qEcuBHqGiavY1oHegGCxuXly8fnW7bHl16T0odwMI+oxiZYFeDvoEWO8j+hBKWW3Ol0eBm1Lh35mwkt1gRVXpGEQeO9l6+ZIOnZ/zXVHuQjECtywu2XCtUSoAEKtkScm6VShXqxAW1RuWb5ozK9n+dUZSCVBFQP+GEhJYu3jG+t+3y1aun50jqmsAQeR3i0vWPwqgrbIFxaA66vF1pQOWlKxfBywHxBL9TTL9i4akToEV1bMXgkxFaBIn7WYRtF1mgvwWpR/C5rrqqffCOgBunfdaU0VVaQ0wvC1oCoAj6a0sawuyWGHGyjfnTlLH5Csy68Ahu1/6tW/cUC6YZPmctBFQWVkWUJH7AFDuvmXW2pp22arXLytA5UZAxeit5eXlHTsgHAVQ9Q1sL1JhByDGmG0qrEV0aUODs+jI4yXbKyvxJcvvpBFQN7ixTJQC0BqnxXr0TJmd5rueE6Nt3eKZG7ZFqd4AYIn5SUVV6aa2IF+IctFJWYeVquFLZ/zbTcU7y8uLkzJ6kxgDrNtO/JYHb533Wlt7qSoiyqITf8vyM8tXbJo9uWJT6b0o4wAU+QFQgsvUbGgy4+qHyu6fPTw32FOvk5IHPLpxbqHjM/8GbQkTzl9aUt3QLnvkzXkTLOPsABqOh3VYRpCLUblS4ApgeCJ2dn7cxvHW07OnX8jalx7wrQQQS8PimHr1+49nLtz4otc4kZRhZCzzfQBUXlw683TnASzjzARAsDIDchClfzJsAjQ2mZGNmAc6lobJfXLWEnhjhZc2kkKAis4FQWAtwMo35g9Vy74cuMoIJaKAEkqGLS9w1FwM9A4BlZVlgTqaJgKocFFFVeltBnsKJ6eXaNzqKUHEMNarbrcJqKws89UObJxeZzUuBEk/Wfzz7raXTDi2DvOqmxABD20uywiGGy9TrPl12nSFILmJu5d6tNma7VXX0ypQUVU6B7gJtBQko9ue9RCdV4FYEIEBQ+3MPy3Y0uKm6zoCKqpKxwCvAtIL5ydJgSoE7azpwEY3XfdESOSbJLHnfitA0N+HoL9PspqMikjETPfkj7uKjum+G0JuaCzn5FzCoKzR9MscSp/g4FNS22nhSPN+dhz8B5/Wvtl9M1EQMWaiFz1XAtQwShL8/oIwLm8OF464hlB67DiZ5stgSGgsWWeQkiwYg6cP50qAJYxKZCnPzhzOrHG/IKfvuZ7rHDz6YQIWvMG2Nd+LnvsIgFFejQ7uO4b55y8jI62f1yq0hBuoP/aZZ32vsG1vmWfcILhq6+Q0wFNSEUrP5coLHkio8wAHGz4Ckp8uhm38SytLB7jpxSWgrTGnANwPHwRh5tjbCfizEnDxBFIx/E9ASbOdYjetuAT4LeNp+J87ZCb5/Sd4dKwjDqSMADARM81NJ24MUGGUl9E5YdiVMWW1TbvZ9b911Dd/hqqDiI/szOHkhQrJzhrBsdZadwPdhGP0fDed+AQYHSUua2C/jPyYEf+/tf/k9V33o51YrG3aze5DrklajxFx1HUEx50ClrivAENCsXeeW/f/vUvnexMRW4a46cQlQBFXAgZkjYgpaw4fcaueUoRt45pvu+0FRrs14LPSYsqK8ua5VU8p7Ihadzw5O+5HjEnAg+tnZwGuOarE4XDq6OuYVLCAs7mLtCRSHFceS9An4C0DbA4fjiMVpo1exFUT/0AoI89Lc0mHOqfuF6IiJgHGQwAEONS4y1Unv/8ErpmygvH58700mVTYqoXx5DEJUGN5JqCxpcZVL82XwaXn/pTZhXeS5uu9QyXHZmQ8eUwCLHFfQwEU5Z09q/Gaz4/JmcH883+P39fjSx1PsCNmUDx5vCngugK0Y1/9u7y396+encrrV8TswjvpjeDYamtGucb50LEEot5GQDu27X+GzXtWo+rt5nrkwKmcl5vy9w8YBwk/XRwzJY6TB8jIRI19dOB5Xt5+J81t8VaG07iwYEGiJrqFiOO7NJYsKgGrqi4fBPTtjrGahu08u/UWahq2u+pmZxaQnVnQHTMJwVGdEksWlQBjwp7nfzS02k28sv3X1DTscNUd3LcHZ64e4UT0vFiy6ARYic3/qG1ohI0fP4DRSFy9zIDnS5xuw45ozGEWKwZ4JCB+FG9uO8zhY3vj6hhN/XtIO0JMlqMSoOItCfrWqB8xecS1cTZEQjAtfiiJOKl/JtwW1mB5ZVkgmizqgYjXJXBY9kSGhMYyLq+UnQdf5pNDG2iLnH7uO37o/Lj3AgCHm/d5MdUjqCptkfppQJfbl1gnQq4E+H3BUwEslJ7L9DE3MnX0dXzRtJsWu4F+GfkM6nNO3DZsp4XDKTgSj4ZIRC7BCwHl5eUWbHF9uzMkNA5LOlb3WYGEDkc/ra0mYlL+HBiAiMOkaOVdYkDe9LeHAa6Jel4o7ibLFY6x2X7ghR61kZi96HecXQhwfGme5n+f9J7d572/7ymOHj/QozYSQcTWodHKuxCgHneBb326ko8OPO859z8T2w+8wAefP5twvZ7AtjXqlVW3CXBMmM17VvP8h0v5/Mj7eNkOHw8f5fVd9/POnse8mEgq2mz85WuKuzzR6xIELcMoTWCXWtu0m7U77qJveg4jB04jNzSW7KwCAr7ME4Yjxzhy/HP2H/4Xe+u34PRS0OsKpSVgzQBeOrO06zIoMro7l5Vfttays+Yldta85K58luAY3zQ6EdDtKfB1hGObLucCHQhYU1WcjuEr+fQtGYg42iUz60BAi6aPiHvQ/zWHHdEuV2UdYoBKa41K+vdQikR0gsJ4Ub4BxL7++RrBtk2XnZlrvF+1dXKa05A9XP1WEWpNBi1UoUgMY3t7tHh9KBkPw/unFyxbtOFUBub6RuimKdts4LOTP6+0lz/x9hV9W8KthYhMEBjP6R/XG9mzBZ9f1AlExgGnCEj6ufSKt76TrRGnSNQUqkURKoXABXi4Z3RDoiPA8qEZQTmaHvC9F/CZpzP28kx5eXWHI6peu7V8ZMO3831pVqFCkYoUWkqRik5CyfTahhsBXjrcGWf18W9lZZmvfsDREeq3ikSlEKXIWEwW5TyiPM7qTIDfh8nI8NUF/PKB1w53xlfy9fOaquL0ZhMsFGE8FkUoE1Qo+vg/rbmC1AYDstmfxtMZC6te6en/EP4falW2UGoFLzMAAAAASUVORK5CYII=" loading="lazy" alt="Samsung" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Samsung</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Consumer electronics & appliances</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 06, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">BOS-010</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-10-DumxJyKz.png" loading="lazy" alt="Bose" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Bose</a>
                                                      </div>
                                                  </td>
                                                  <td>Audio</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Premium audio & sound systems</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Jan 22, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LG-016</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="LG" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">LG</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Consumer electronics & appliances</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Mar 11, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">SON-017</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Sony Music" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Sony Music</a>
                                                      </div>
                                                  </td>
                                                  <td>Entertainment</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Music & entertainment brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 28, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">DELL-018</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Dell" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Dell</a>
                                                      </div>
                                                  </td>
                                                  <td>Computers</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Computer hardware & software</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Mar 02, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">HTC-019</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="HTC" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">HTC</a>
                                                      </div>
                                                  </td>
                                                  <td>Mobile</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Smartphones & VR products</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Jan 15, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">HP-020</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="HP" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">HP</a>
                                                      </div>
                                                  </td>
                                                  <td>Computers</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Laptops & printing solutions</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 20, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="0">
                                                  <td><a href="#" className="link link-custom-primary">PHL-021</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAB2AAAAdgB+lymcgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAzASURBVHic7Vt7cFzVef999+7eu7vah2S9ZT2MJUyDLSi2CGBsDCYdMsQEZkJoIUwpnQSnTcJkJiZtwsNubBMoEtNJO8OQ/gOpSeJCS+wxtKkfCGQ52JZMMC5g6xFbNsh6WFo99nnvPV//WEvcu9q7e1ds9Uer3z/ac853vvN93z33fI9zBSxiEYtYxCL+/4LsBmJt9Q+CsX6+jBmkM/EEgHNk4JQ3VH6MNndr8+WXjsGbr1/JLG4HpHpBLJOgT0ii9urOY90EsFM+9gZorX+RgUcKIy4AIALiPcT0gnfLwOH5MrmwdvVGgvQsgBYbktMEPF5zpOvfnPCT5ivIPFAEpgcY6Ii01u+fbrvi2nwmM0CfrG3ZSpAOwF55ALiKgdcurG15sWvNGncuvgtpgFkQ8CWJje5oW8MWp3MGb275EYBtyLJr09Z4pFqlFx3QZcacV0CSBylQfTY7N4KkBt3w+BVyeT1iakjB5IWQiE+V2E1h4GWfomymR3sTdjSDa6+/XoDfRdoDI69vWln9xUEQWDt5olxMTs5Zh4i+VtN5/N/teLuyKmRmFKg+6/mzX93klB5CB5ITQGwU0KNRY/CDQe34v1SxHi+y8AUeiiWTRcy4jyjz4SXAO5CmfODhb/cp132xkYArAQB/+ufQ/9BzLvwPz9ZCCHmGjpl3MvC63cH4v/cKSC7AUwqUrACCy3xy7epGzz1tXvcf33smA/W90db6rZnYXFx7TQWA2819gfsf7lFTygMAyKNCCgagXHNdQ/Avv306jcUfDa5bvdpWzHx0mh8IUEuA0ApAViVX44YV6h3bLoIki0skwlPx1vo/SZ8tSF0HYPaJQpJ09eYNjanfMuTKMkgVZaBQEFQcgueOO5tANGbhIWiDnXQLdwjKChBqAmQVkr+0ynPn9nAaBTHQxtusMjG4xtx21zYMQggJAKSyEkBVrUzcbkUqLuk390lMtXZiLawXIBkILgdIAnmC5cpNm/vMwww0xwP1D1r6mA1zWyQTKZkVN8hjVd5ElWZE6HYiLbwblFXAW5n6WdPcSP6Ki5Zxxg+tbT5vbhrDF2sA6OTK7OI5Ho2IcHiFpZOsPMxwbgAWjvyvI/jKU4ckGOq671qXAVZOPVe3aqadSFIHgOQsgRAU+c3uPgjLxphFeMfWLjD85j4SfMBOFOcGoEJuFglQilNsA2WVkFyWGEAmzB6Gjd3dEwBeN4/HDv32qsmX/vkjY+jT2SfLY2PDYz/4bkfy1EnLgUeMozXvnvjIThLHcUDBoYSA+CggDHJdceM5ve+wadvSGjOpMOQnJdm4G4Bnpi9xpP0LiSPtTLJ7ABIM1rR6YE7yJiCJx7KJ4fixksefM67OC/JnB5hUvjLtQVCTuVV39GgPgb6FucEMsaHVs6ZdAbOrnBkkPFnTeaIjmxjODaCGCmsAyY2ZSJz8pUra6JyQtubI8V0guh9A1AF3A+C/rensejqnGHYDDLK4DlK8HoiCpfMA0WeZCLnS5OCMr+bSzuO7BYtrAfwaQKbcwSDgTQa1LD3S/awTMezPAOIp84YTk0MKkpOp8LYQEDrAlxeIj8XTRiftptX97kQvgPsv3XBDMCbr6wHUE+ACaIAU7qxp7x7NRwxbAzDzWTInixPnixEbBTxL4DAjzQ49MvvTGBvQAUAbl5Acl8AGBXJNLz16dBLAG59XDFsDkKAPzC+ISEwXQ49GkQj7oNpmt86RnEj9ZUak40Bt/JwCI54yrFJu9GeZWVDYGsAbDRyP+aciAGbTV3Hx1KAkuxvhLgKk9HMrDxgJIDEOAEh8/FE0ctrwze4qYvTU+T98Yt/GHQRaxYwGBgcBCAKNAtwP5i6S5QPbv3Lgg/kLcXm5bIPRtrpXwPTALLHLE/Hc0+aFrEoINaVi+3zBDEz2AlrqFRh+5smYNhrzkhsYbFLwzqoSMVakOPVOHxC4Ve7esGvbtm0if2FyuEFiesEiux4v0nrf7oMeA8I9qSeZD5iB6YFZ5ac7O6a0SzHveKMbr9xbjd/cUIk8lAeAZga9rK9558RTe26fk0o7Qc7TLNpavxfAXeY+9Y6tg5K/rBokAb4KwFuBnCGFkbAor134VBt54XnX8bVB6moIzUf2dDAYf+86ccuP89kNOQ0w9Xz9SlngfZgjLZI0z53bw+QJlgNIJTZKMaAEAZcXIFfKzws9ddonw0A8jJlATrvwSXL45X+iN28JuQdKvJkFI3m8KrhsZImvyu1XShSddZ5OjCcuTp4VE7GhegB2ufBrE7L64D/e+R+OtqcjfxZta9gC5ufS+5UbN/fLS5uXZyy3EX3m502YPtwxNfmfe/xv3FFGmZT3KyV965q+XlEeaAhINtIZQuO+0ZNDx8/uIV0YlenjTHhp56ZDDzvRzbFDj7TWv0TAQ3MYFJUNK+u/J6RAWSWETcrMjPhHH0Yn9/6atEsx79GNQbxXZ932RBTZcOUD8YYlV8+JtAiZK5oGGzh2dl//maFjy+csCfrBzrsOPp9LL8cG4J81qbFkcheAezMSSK6E3HDjgFz1BYmKKlSQJHEsnBBjf9CiHYdqp88YPgAYb3Rj9/oqy1S35BrZ1PxoMOgtVVNCEVSXH6qrCG5ZhUQyGAzBBgwjiYQRRUKPQFwuFvWPnhzp6N1dDMCcr+gg6Zodmw7YpsJ5GQAAmEGx1vofgvA08kikJt5XYEQJ5AZe+Vo1Jj2fhR9EFLnn2u+7gp4yFQAU2YuAWgZZyp57MTNi2gQiWhjMAr0jXYOdfa9XW5Qj2rN908F7svHJq8pBBPY9NvCsBHwZ4PedzNHGJRjRlJ0HmxSL8gCw4coH4jPKe1x+hLxVOZVPyULwKcUo8dZAltxoKm+pXlp8VY+ZhpnvfnzfxrXZ+MyrzOPZMrDfO31+NREeIiBrNJYcv7wEMTquLrG4J79S0jfzziuyFwFPOSjPPMMlKVjiq4EsK7il6euNBJo2j5PAX2WbX5A639Rzdatk0JdAaAGwHKDSyynteKTXHSLi/v+uC3y8v7n0UfO8L1/9yFRlsCFAICzx1Tp68nYwhI7x2AUc7nutr2e4u9Es3nD1ROnPWzJfzRekJBZ47PwpAKey0Tyxb+MO81FOJI+XBxpKAMDj9n8u5QFAllzwq2VYUXljdc9wt0W8ysHiFgC/yzRv4crijGZzsyqwbHTGzytyUaYZecPj8qMqsMxLIOulC4lmmykLei+wzNxYUlQ9u/vcsmcO8Xzhc4dIdReNm/uYpWU25AtpALYUOfxKyWWfD0gFLLm7XV743MG0910E7egXzAAMstxk6KyJy/1g55/05IRMLsgkW0pszPYHzIIZgADLtpxKjF2+7eHZiK5QEDCSualSyMsL8P6SEGStFrIchZg4T7fZXzrOAaEXjOtnmsNTA7NaG0YSsqtwdzQsnJevHe0Afju0kdsDb8FtXIIknQJzPyg4xO3Bn3Gnv8KZUDhhboejF+sNoTEAJAwnpX7nyKc0lNMA3B78OzAfAOhWWG9flgD4HjTpPX67+LqcfJj+K61L7Rs5OQwACT2SMXVeCGQ1AL8V+CaAp5A9YqwBi338jr88G6+n7z54Emlh87Fze0kXOgQbiGoTTmUuKOxvhg6XBUD0jEM+NRDSE7mImKjN3DaEXnH83Bv9ABDRwtCF47MrK/I52e1p9eQmANbiRO13etH8Sx0rfxGBtyn9o4Nv8L/OvaA040x0yS6k7YIzQ8eW94+eHGEWmIgPgVFYj5AL9gZgtn7JWXTlAEI3NUEIF1zFRWj4m/QZpSgvrsu22Kv3vWpIxI8hrcDT0bu7+PTFoxcMoWE8NghDOHcumVCYQ5DIWrBTl6b2p1oJeK8A1Mq5p5as+3It+JNNb/0WoB1p3e53z+6t3f/xL85EEmNiPPYJ4vp0xvlOUJhXAHzO0gx31gEcg6sYADP6nzqbNkGH5LH9FseMHZsObiXQnI+ZPw2fXrG765n44b5X+/ov/T56KXIecW0KRoEDJTPsow+BNyChFTMeQGgqPvyLJNzlv4c2HgQnbrHQE96mdaNTjlYlcPhN5RshIz4NkKXQymBfz3B3Y89wNwgUVt2+sE8JJWXIccFCE2xouT6HH4+PLHMkB3IURLg9+EsA9zvgwyBxK22YfsfpwjN4fO/GLUR4Bhm+8CgUmOnnO796cHOmseyvC0t/DeBDB2tsnY/yALDzq4daDYhVBLyKPP7RoVDIfjd4WzgMlm4G8CtkFm4UzA/TrZPbP48QP72r/ePtdx26jwSvB/gVAPM/AfOE83uBjsAKGPQVAMtAHAWk9yCUN+m2kYIL+0jXGnflYHELSDRDoIEJoWwpbS5IEjq2bzq4q5AyLmIRi1jEIv4v4H8AjimkAGtdzOIAAAAASUVORK5CYII=" loading="lazy" alt="Philips" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Philips</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Lighting & consumer electronics</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Hidden</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Jan 30, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
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
                              <div className="tab-pane fade" id="pane-web-brands" role="tabpanel" aria-labelledby="tab-web-brands" tabIndex="0">
                                  <div className="table-card table-responsive">
                                      <table className="table table-borderless align-middle text-nowrap mb-0">
                                          <thead>
                                              <tr className="border-bottom">
                                                  <th className="fw-medium text-muted">Brand Code</th>
                                                  <th className="fw-medium text-muted">Brand</th>
                                                  <th className="fw-medium text-muted">Category</th>
                                                  <th className="fw-medium text-muted">POS</th>
                                                  <th className="fw-medium text-muted">Description</th>
                                                  <th className="fw-medium text-muted">Web</th>
                                                  <th className="fw-medium text-muted">Status</th>
                                                  <th className="fw-medium text-muted">Updated</th>
                                                  <th className="fw-medium text-muted">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">NKE-001</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="../assets/img-01-D8G-cM9e.png" loading="lazy" alt="Nike" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Nike</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Global sportswear & footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Mar 10, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">ADS-002</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Adidas" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Adidas</a>
                                                      </div>
                                                  </td>
                                                  <td>Sportswear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>International athletic apparel brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 02, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">PMA-003</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Puma" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Puma</a>
                                                      </div>
                                                  </td>
                                                  <td>Footwear</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Sport & lifestyle footwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 18, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">SAM-008</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Samsung" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Samsung</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Consumer electronics & appliances</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Feb 06, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">HNK-006</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="H&M" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">H&amp;M</a>
                                                      </div>
                                                  </td>
                                                  <td>Fashion</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Fast fashion clothing & accessories</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 12, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="active" data-pos="1" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LEV-009</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="Levi's" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">Levi’s</a>
                                                      </div>
                                                  </td>
                                                  <td>Denim</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-success d-inline-block me-1 align-middle"></span>
                                                      <span className="text-success fw-medium">Enabled</span>
                                                  </td>
                                                  <td>Iconic denim & casualwear brand</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-success-subtle border border-success-subtle text-success">Active</span></td>
                                                  <td>Apr 05, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                              <tr data-status="inactive" data-pos="0" data-web="1">
                                                  <td><a href="#" className="link link-custom-primary">LG-016</a></td>
                                                  <td>
                                                      <div className="d-flex align-items-center gap-2">
                                                          <div className="avatar size-9 border rounded-1 p-1 bg-light">
                                                              <img src="data:image/png;base64,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" loading="lazy" alt="LG" className="img-fluid" />
                                                          </div>
                                                          <a href="#" className="text-reset fw-semibold">LG</a>
                                                      </div>
                                                  </td>
                                                  <td>Electronics</td>
                                                  <td>
                                                      <span className="size-1-5 rounded-circle bg-danger d-inline-block me-1 align-middle"></span>
                                                      <span className="text-danger fw-medium">Disabled</span>
                                                  </td>
                                                  <td>Consumer electronics & appliances</td>
                                                  <td><span className="bg-body-tertiary text-body-secondary border border-dark-subtle badge">Visible</span></td>
                                                  <td><span className="badge bg-danger-subtle border border-danger-subtle text-danger">Inactive</span></td>
                                                  <td>Mar 11, 2024</td>
                                                  <td>
                                                      <div className="dropdown">
                                                          <a href="#" className="link link-custom-primary" data-bs-toggle="dropdown"><i className="ri-more-2-fill"></i></a>
                                                          <ul className="dropdown-menu">
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-eye-line"></i>Overview</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center"><i className="ri-pencil-line"></i>Edit</a></li>
                                                              <li><a href="#" className="dropdown-item d-flex gap-3 align-items-center text-danger" data-bs-toggle="modal" data-bs-target="#deleteModal"><i className="ri-delete-bin-line"></i>Delete</a></li>
                                                          </ul>
                                                      </div>
                                                  </td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addBrandModal" tabIndex="-1" aria-labelledby="addBrandModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content">
                      <div className="h-24 rounded-top-2 pattern-bg"></div>
                      <div className="modal-body">
                          <form id="brandForm">
                              <div className="row g-3">
                                  <div className="col-12">
                                      <label className="avatar border text-muted mx-auto bg-body-secondary size-24 rounded p-3 mt-n20 cursor-pointer" htmlFor="imageInput">
                                          <i className="ri-upload-cloud-2-line fs-2xl"></i>
                                          <input type="file" id="imageInput" className="d-none" />
                                      </label>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="brandName" className="form-label">Brand Name <span className="text-danger">*</span></label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter Brand Name"
                                        id="brandName"
                                        required
                                        value={brandName}
                                        onChange={e => setBrandName(e.target.value)}
                                      />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="brandCode" className="form-label">Brand Code <span className="text-muted fw-normal">(auto-generated)</span></label>
                                      <input
                                        type="text"
                                        className="form-control bg-light"
                                        placeholder="Type brand name to generate code"
                                        id="brandCode"
                                        readOnly
                                        value={brandCode}
                                      />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="category" className="form-label">Category <span className="text-danger">*</span></label>
                                      <div id="brandCategorySelect"></div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="description" className="form-label">Description</label>
                                      <textarea className="form-control" id="brandDesc" placeholder="Enter Brand Description" rows="3"></textarea>
                                  </div>
                                  <div className="col-6">
                                      <label className="form-label">POS Visible</label>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="form-check radio-primary">
                                              <input className="form-check-input" type="radio" name="posVisible" id="posVisibleEnable" defaultValue="1" defaultChecked />
                                              <label className="form-check-label" htmlFor="posVisibleEnable">Enable</label>
                                          </div>
                                          <div className="form-check radio-primary">
                                              <input className="form-check-input" type="radio" name="posVisible" id="posVisibleDisable" defaultValue="0" />
                                              <label className="form-check-label" htmlFor="posVisibleDisable">Disable</label>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="col-6">
                                      <label className="form-label">Web Visible</label>
                                      <div className="d-flex align-items-center gap-3">
                                          <div className="form-check radio-primary">
                                              <input className="form-check-input" type="radio" name="webVisible" id="webVisibleVisible" defaultValue="1" defaultChecked />
                                              <label className="form-check-label" htmlFor="webVisibleVisible">Visible</label>
                                          </div>
                                          <div className="form-check radio-primary">
                                              <input className="form-check-input" type="radio" name="webVisible" id="webVisibleHidden" defaultValue="0" />
                                              <label className="form-check-label" htmlFor="webVisibleHidden">Hidden</label>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="col-12">
                                      <label className="form-label">Status</label>
                                      <div id="brandStatusSelect"></div>
                                  </div>
                              </div>
                              <div className="d-flex gap-2 mt-7">
                                  <button type="button" className="btn btn-light w-100" data-bs-dismiss="modal">Close</button>
                                  <button type="submit" className="btn btn-primary w-100" id="saveBrandBtn">Add Brand</button>
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
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Brands?</h5>
                      <input type="hidden" id="deleteSubCategoryId" />
                      <div className="d-flex justify-content-center align-items-center gap-2">
                          <button type="button" className="btn btn-danger" id="confirmDeleteBtn">Delete</button>
                          <button type="button" className="btn btn-link text-reset" data-bs-dismiss="modal">Cancel</button>
                      </div>
                  </div>
              </div>
          </div>
      {showImport && (
        <ImportModal
          entityName="Brands"
          fields={BRAND_IMPORT_FIELDS}
          onImport={(rows) => {
            console.log('Imported brands:', rows)
            setShowImport(false)
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
