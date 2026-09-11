import { Link } from 'react-router-dom'

export default function NotificationSettings() {
  return (
    <div className="container-fluid">
      <div className="position-relative">
              <div className="main-profile-bg position-relative">
                  <div className="size-48 square-1"></div>
                  <div className="profile-bg bg-primary-subtle"></div>
                  <img src="../assets/user-14-BWimhkHc.png" alt="Avatar" className="avatar-1 size-16 rounded-circle d-none d-md-block" />
                  <img src="../assets/user-54-BgoCiuFl.png" alt="Avatar" className="avatar-2 size-16 rounded-circle d-none d-md-block" />
                  <img src="../assets/user-57-BgWfHmFH.png" alt="Avatar" className="avatar-3 size-16 rounded-circle d-none d-md-block" />
                  <img src="../assets/user-5-BsT8d_Co.png" alt="Avatar" className="avatar-4 size-16 rounded-circle d-none d-md-block" />
                  <div className="row g-0 d-none d-md-block">
                      <div className="col-7 col-xl-6 col-xxl-5 offset-5 offset-lg-4 offset-xl-5 offset-xxl-6">
                          <h3 className="fw-medium line-clamp-2 lh-base py-12 overflow-hidden">A powerful POS admin dashboard to manage sales, inventory, and daily store operations</h3>
                      </div>
                  </div>
              </div>
              <div className="card border-0 border-bottom rounded-0 user-card">
                  <div className="card-body px-6 pb-0">
                      <div className="d-flex flex-wrap gap-3 justify-content-between align-items-end mb-3">
                          <img src="../assets/user-71-RNjOCE17.png" loading="lazy" alt="user-45" className="size-36 mt-n28 rounded-5 border border-5 border-light" />
                          <div className="d-flex flex-wrap align-items-center gap-3">
                              <div className="border py-1 px-2 d-flex align-items-center gap-3 h-100 rounded">
                                  <i className="ri-error-warning-fill text-secondary fs-xl"></i>
                                  <p>POS Offline Mode</p>
                                  <div className="form-switch switch-light-primary my-auto d-flex">
                                      <input type="checkbox" id="switch-light-1" /><label className="label" htmlFor="switch-light-1"></label>
                                  </div>
                              </div>
                              <a href="pos.html" className="btn btn-primary py-2">Open POS</a>
                          </div>
                      </div>
                      <div className="avatar justify-content-start gap-1 mb-1">
                          <h5 className="mt-2 mb-1">Lucas Ethan</h5>
                          <i data-lucide="badge-check" className="size-5 icon-primary"></i>
                      </div>
                      <ul className="text-muted avatar justify-content-start gap-2 flex-wrap ps-0 mb-5">
                          <li className="d-flex align-items-center gap-2">
                              <i data-lucide="building-2" className="size-4"></i>
                              <span>Store Manager · Main Branch</span>
                          </li>
                          <li className="d-flex align-items-center gap-2">
                              <i data-lucide="map-pin" className="size-4"></i>
                              <span>Buenos Aires, Argentina</span>
                          </li>
                          <li className="d-flex align-items-center gap-2">
                              <i data-lucide="calendar-days" className="size-4"></i>
                              <span>Joined on 24 April, 2024</span>
                          </li>
                      </ul>
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-4 mb-9">
                          <div className="d-flex flex-wrap gap-3 align-items-center">
                              <div className="py-6px px-3 border rounded">
                                  <i className="ri-calendar-fill me-2"></i>Last Login: May 17, 2025 | 10:00 AM

                              </div>
                              <div className="py-6px px-3 text-white bg-primary border-primary border rounded">9 Active Staff</div>
                          </div>
                          <div className="d-flex flex-wrap gap-3 align-items-center">
                              <a href="http://localhost:8080/index.html" className="link link-custom-primary py-6px px-3 border rounded">http://localhost:8080/index.html</a>
                              <button type="button" className="btn btn-indigo btn-icon size-9"><i className="ri-facebook-fill fs-16"></i></button>
                              <button type="button" className="btn btn-pink btn-icon size-9"><i className="ri-instagram-fill fs-16"></i></button>
                              <button type="button" className="btn btn-info btn-icon size-9"><i className="ri-twitter-fill fs-16"></i></button>
                          </div>
                      </div>
                      <div>
                          <ul className="nav nav-underline gap-1 gap-lg-4">
                              <li className="nav-item">
                                  <a className="nav-link" aria-current="page" href="pages-account-settings.html">
                                      <i data-lucide="user-round" className="size-4 me-1"></i>
                                      Account
                                  </a>
                              </li>
                              <li className="nav-item">
                                  <a className="nav-link" aria-current="page" href="pages-account-security.html">
                                      <i data-lucide="shield-check" className="size-4 me-1"></i>
                                      Security
                                  </a>
                              </li>
                              <li className="nav-item">
                                  <a className="nav-link" aria-current="page" href="pages-account-billing-plan.html">
                                      <i data-lucide="gem" className="size-4 me-1"></i>
                                      Billing &amp; Plans
                                  </a>
                              </li>
                              <li className="nav-item">
                                  <a className="nav-link active" aria-current="page" href="pages-account-notification.html">
                                      <i data-lucide="bell" className="size-4 me-1"></i>
                                      Notification
                                  </a>
                              </li>
                              <li className="nav-item">
                                  <a className="nav-link" aria-current="page" href="pages-account-statements.html">
                                      <i data-lucide="list-tree" className="size-4 me-1"></i>
                                      Statements
                                  </a>
                              </li>
                              <li className="nav-item">
                                  <a className="nav-link" aria-current="page" href="pages-account-logs.html">
                                      <i data-lucide="log-out" className="size-4 me-1"></i>
                                      Logs
                                  </a>
                              </li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>
          <div className="d-flex align-items-lg-center my-5 flex-lg-row flex-column gap-3">
              <div className="flex-grow-1">
                  <h6 className="mb-1">Notifications</h6>
                  <p className="text-muted">Where would you like to receive notifications?</p>
              </div>
              <div className="flex-shrink-0">
                  <a href="#" className="link link-custom-primary">Reset to Default Settings</a>
              </div>
          </div>
          <div className="card">
              <div className="card-header">
                  <h6 className="card-title mb-0">Receive notifications about new activities in projects you're involved in</h6>
              </div>
              <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                      <label htmlFor="notification1" className="cursor-pointer mb-0 fw-medium flex-grow-1">New comments by others comments</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification1" checked />
                          <label className="label" htmlFor="notification1"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification2" className="cursor-pointer mb-0 fw-medium flex-grow-1">Comments fro you tasks</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification2" />
                          <label className="label" htmlFor="notification2"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification3" className="cursor-pointer mb-0 fw-medium flex-grow-1">New tasks assigned to you</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification3" />
                          <label className="label" htmlFor="notification3"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification4" className="cursor-pointer mb-0 fw-medium flex-grow-1">Tasks completed (For tasks you created or assigned to)</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification4" />
                          <label className="label" htmlFor="notification4"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification5" className="cursor-pointer mb-0 fw-medium flex-grow-1">You are mentioned in a projects, task, etc,.</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification5" />
                          <label className="label" htmlFor="notification5"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification6" className="cursor-pointer mb-0 fw-medium flex-grow-1">Change in status of a task you're</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification6" />
                          <label className="label" htmlFor="notification6"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification7" className="cursor-pointer mb-0 fw-medium flex-grow-1">Added new projects</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification7" />
                          <label className="label" htmlFor="notification7"></label>
                      </div>
                  </div>
              </div>
          </div>
          <div className="card">
              <div className="card-header">
                  <h6 className="card-title mb-0">Get notified wherever you are</h6>
              </div>
              <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                      <label htmlFor="notification8" className="cursor-pointer mb-0 fw-medium flex-grow-1">Email notifications</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification8" checked />
                          <label className="label" htmlFor="notification8"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification9" className="cursor-pointer mb-0 fw-medium flex-grow-1">Notifications via gotpos</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification9" checked />
                          <label className="label" htmlFor="notification9"></label>
                      </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mt-4">
                      <label htmlFor="notification10" className="cursor-pointer mb-0 fw-medium flex-grow-1">Browser push notifications</label>
                      <div className="form-switch switch-outline-primary">
                          <input type="checkbox" id="notification10" checked />
                          <label className="label" htmlFor="notification10"></label>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
