import { Link } from 'react-router-dom'

export default function Chat() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Default Chat</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Chats</a></li>
                  <li className="breadcrumb-item active">Default Chat</li>
              </ul>
          </div>
          <div className="row">
              <div className="col-xl-4 col-xxl-3">
                  <div className="card card-h-100 chat-list">
                      <div className="card-body pb-0">
                          <div className="position-relative">
                              <input type="text" id="chatSearch" className="form-control ps-9 pe-4" placeholder="Search for ..." />
                              <div className="position-absolute top-50 translate-middle-y d-flex align-items-center">
                                  <i data-lucide="search" className="size-4 ms-3 text-muted"></i>
                              </div>
                          </div>
                          <div className="py-4 d-flex align-items-center justify-content-between">
                              <div className="dropdown float-end">
                                  <a href="#" className="link link-custom-primary d-flex align-items-center dropdown-toggle" aria-label="Dropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                      Latest First
                                  </a>
                                  <div className="dropdown-menu">
                                      <a className="dropdown-item" href="#">Latest First</a>
                                      <a className="dropdown-item" href="#">Weekly</a>
                                      <a className="dropdown-item" href="#">Monthly</a>
                                      <a className="dropdown-item" href="#">Yearly</a>
                                  </div>
                              </div>
                              <div className="d-flex align-items-center gap-1" data-bs-toggle="modal" data-bs-target="#addNewChatModals">
                                  <a href="#" className="me-1 link link-custom-primary">New Conversation</a>
                                  <button type="button" className="btn btn-primary btn-icon size-6 rounded-1"><i data-lucide="plus" className="size-4"></i></button>
                              </div>
                          </div>
                          <div className="chat-list-height mx-n5 px-5 pt-2" data-simplebar>
                              <ul className="d-flex flex-column list-unstyled mb-0" id="chatList">
                                  <li>
                                      <a href="#" className="chat-list-item active">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle">
                                              <img src="../assets/user-40-C_LQmwB0.png" alt="User 13" className="img-fluid rounded-circle" />
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Dawn Teague</h6>
                                              <p className="text-muted text-truncate">Hello, How are you?</p>
                                          </div>
                                          <div className="flex-shrink-0">
                                              <span className="badge bg-danger-subtle text-danger">2</span>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle">
                                              <img src="../assets/user-11-bzS6tHsV.png" alt="User 11" className="img-fluid rounded-circle" />
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">David Johnson</h6>
                                              <p className="text-muted text-truncate">Here are some of very cute illustration.</p>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle">
                                              <img src="../assets/user-18-C5ehJukC.png" alt="User 18" className="img-fluid rounded-circle" />
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Andrew Gilbert</h6>
                                              <p className="unread text-muted text-truncate">Use tools like Trello, Asana, or Jira for task management and progress tracking.</p>
                                          </div>
                                          <div className="flex-shrink-0">
                                              <span className="badge bg-danger-subtle text-danger">2</span>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle">
                                              <img src="../assets/user-20-BaxQ31Jt.png" alt="User 20" className="img-fluid rounded-circle" />
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Tyron Derby</h6>
                                              <p className="unread text-muted text-truncate">Regularly review and improve communication practices based on team feedback and project needs.</p>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle avatar">
                                              <span className="fw-semibold">SL</span>
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Susan Liles</h6>
                                              <p className="text-muted text-truncate">Schedule regular check-ins to address any roadblocks and keep everyone aligned.</p>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle avatar">
                                              <span className="fw-semibold">JD</span>
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Josh Doyle</h6>
                                              <p className="text-muted text-truncate">No further questions.</p>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle avatar">
                                              <img src="../assets/user-3-Bz6g7hsE.png" alt="User 3" className="img-fluid rounded-circle" />
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Nicholas Hope</h6>
                                              <p className="text-muted text-truncate">Sure, I can help with that. Let's have a quick call after this meeting to debug the issue.</p>
                                          </div>
                                          <div className="flex-shrink-0">
                                              <span className="badge bg-danger-subtle text-danger">1</span>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle avatar">
                                              <span className="fw-semibold">LB</span>
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Louise Bryan</h6>
                                              <p className="text-muted text-truncate">I'll share the meeting minutes and action items shortly.</p>
                                          </div>
                                      </a>
                                  </li>
                                  <li>
                                      <a href="#" className="chat-list-item">
                                          <div className="position-relative size-10 bg-light flex-shrink-0 rounded-circle avatar">
                                              <img src="../assets/user-6-BIO7_TUU.png" alt="User 6" className="img-fluid rounded-circle" />
                                              <span className="status-indicator bg-success rounded-circle size-2-5"></span>
                                          </div>
                                          <div className="flex-grow-1 overflow-hidden">
                                              <h6 className="mb-1 lh-sm">Sirkka Hakola</h6>
                                              <p className="text-muted text-truncate">Let's reconvene next week for our regular check-in. Have a productive week!</p>
                                          </div>
                                      </a>
                                  </li>
                              </ul>
                              <div id="noResult" className="text-center d-none">
                                  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" className="mx-auto size-12" viewBox="0 0 48 48">
                                      <linearGradient id="SVGID_1__h35ynqzIJzH4_gr1" x1="34.598" x2="15.982" y1="15.982" y2="34.598" gradientUnits="userSpaceOnUse">
                                          <stop offset="0" stopColor="#60e8fe"></stop>
                                          <stop offset=".033" stopColor="#6ae9fe"></stop>
                                          <stop offset=".197" stopColor="#97f0fe"></stop>
                                          <stop offset=".362" stopColor="#bdf5ff"></stop>
                                          <stop offset=".525" stopColor="#dafaff"></stop>
                                          <stop offset=".687" stopColor="#eefdff"></stop>
                                          <stop offset=".846" stopColor="#fbfeff"></stop>
                                          <stop offset="1" stopColor="#fff"></stop>
                                      </linearGradient>
                                      <path fill="url(#SVGID_1__h35ynqzIJzH4_gr1)" d="M40.036,33.826L31.68,25.6c0.847-1.739,1.335-3.684,1.335-5.748c0-7.27-5.894-13.164-13.164-13.164 S6.688,12.582,6.688,19.852c0,7.27,5.894,13.164,13.164,13.164c2.056,0,3.995-0.485,5.728-1.326l3.914,4.015l4.331,4.331 c1.715,1.715,4.496,1.715,6.211,0C41.751,38.321,41.751,35.541,40.036,33.826z"></path>
                                      <path fill="none" stroke="#10cfe3" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="3" d="M31.95,25.739l8.086,8.086c1.715,1.715,1.715,4.496,0,6.211l0,0c-1.715,1.715-4.496,1.715-6.211,0 l-4.331-4.331"></path>
                                      <path fill="none" stroke="#10cfe3" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="3" d="M7.525,24.511c-1.771-4.694-0.767-10.196,3.011-13.975c3.847-3.847,9.48-4.817,14.228-2.912"></path>
                                      <path fill="none" stroke="#10cfe3" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="3" d="M30.856,12.603c3.376,5.114,2.814,12.063-1.688,16.565c-4.858,4.858-12.565,5.129-17.741,0.814"></path>
                                  </svg>
                                  <p className="mt-2 text-center text-muted">No matching records found</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
              <div className="col-xl-8 col-xxl-9">
                  <div className="card overflow-hidden meassages card-h-100">
                      <div className="card-body py-0 h-100">
                          <div className="mx-n5 chat-height" data-simplebar>
                              <div className="card-body d-flex align-items-center gap-3 border-bottom position-sticky top-0 chat-toolbar">
                                  <div className="size-10 flex-shrink-0 rounded-circle bg-light avatar">
                                      <img src="../assets/user-13-NgroKY8u.png" alt="User" className="img-fluid rounded-circle" />
                                  </div>
                                  <div className="flex-grow-1">
                                      <h6 className="mb-1 lh-sm">
                                          <a href="#" className="text-body">Dawn Teague</a>
                                      </h6>
                                      <p className="text-muted">Online • Last seen 2 hr</p>
                                  </div>
                                  <button type="button" className="btn btn-active-dark text-muted btn-icon" data-bs-toggle="modal" data-bs-target="#callModal"><i data-lucide="phone" className="size-5"></i></button>
                                  <button type="button" className="btn btn-active-dark text-muted btn-icon" data-bs-toggle="modal" data-bs-target="#videoCallModal"><i data-lucide="video" className="size-5"></i></button>
                              </div>
                              <div className="card-body">
                                  <div className="d-flex flex-column gap-5 mt-auto h-100" id="chat-messages">
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="card-body">
                          <div className="d-flex align-items-center gap-2 p-2 border rounded-3" id="messageForm">
                              <button type="button" className="btn btn-active-secondary btn-icon flex-shrink-0">
                                  <i data-lucide="audio-lines" className="size-5"></i>
                              </button>
                              <input type="text" className="form-control border-0 flex-grow-1" placeholder="Type something ..." />

                              <button type="button" className="btn btn-active-primary btn-icon flex-shrink-0"><i data-lucide="send" className="size-5"></i></button>
                              <div className="flex-shrink-0">
                                  <label htmlFor="sendImages" className="btn btn-active-dark text-muted btn-icon">
                                      <i data-lucide="image" className="size-5"></i>
                                  </label>
                                  <input type="file" id="sendImages" className="d-none" />
                              </div>
                              <button type="button" className="btn btn-active-dark btn-icon flex-shrink-0">😊</button>

                              <div className="dropdown">
                                  <button className="btn btn-active-dark text-muted btn-icon" type="button" id="chatSettingDropdown" data-bs-toggle="dropdown" aria-expanded="true" title="dropdown-button">
                                      <i data-lucide="ellipsis" className="size-5"></i>
                                  </button>
                                  <ul className="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="chatSettingDropdown">
                                      <li>
                                          <a href="#" className="dropdown-item">
                                              <i className="ri-chat-4-line me-1"></i>
                                              <span>Clear Chat</span>
                                          </a>
                                      </li>
                                      <li>
                                          <a href="#" className="dropdown-item">
                                              <i className="ri-delete-bin-line me-1"></i>
                                              <span>Delete</span>
                                          </a>
                                      </li>
                                  </ul>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
