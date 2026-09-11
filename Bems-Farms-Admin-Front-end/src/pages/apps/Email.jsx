import { Link } from 'react-router-dom'

export default function Email() {
  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Mailbox</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Apps</a></li>
                  <li className="breadcrumb-item active">Mailbox</li>
              </ul>
          </div>
          <div className="mb-5">
              <button className="btn btn-primary d-block d-xxl-none" id="mailboxSidebarToggle" type="button">
                  <i data-lucide="menu" className="size-4 me-2"></i>Menu
              </button>
          </div>
          <div className="mailbox-wrapper">
              <div className="card mailbox-left">
                  <div className="dropdown">
                      <a href="#" className="card-header d-flex align-items-center gap-2 text-reset" type="button" id="mailboxDropdownButton" data-bs-toggle="dropdown" aria-expanded="false">
                          <img src="../assets/img-04-BSvpIvZZ.png" loading="lazy" alt="img-04" className="size-9" />
                          <div className="flex-grow-1">
                              <h6 className="mb-0">SRBThemes Account</h6>
                              <p className="text-muted">lucas@gotpos.com</p>
                          </div>
                          <i data-lucide="chevron-down" className="size-4"></i>
                      </a>
                      <ul className="dropdown-menu w-72" aria-labelledby="mailboxDropdownButton">
                          <li>
                              <a href="#" className="dropdown-item d-flex align-items-center gap-2 mt-1">
                                  <img src="../assets/img-05-CZAuy0l0.png" loading="lazy" alt="img-05" className="size-9" />
                                  <div className="flex-grow-1">
                                      <h6 className="mb-0">GotPOS</h6>
                                      <p className="text-muted fs-sm">lucas@gotpos.com</p>
                                  </div>
                              </a>
                          </li>
                          <li>
                              <a href="#" className="dropdown-item d-flex align-items-center gap-2 mt-1">
                                  <img src="data:image/png;base64,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" loading="lazy" alt="img-06" className="size-9" />
                                  <div className="flex-grow-1">
                                      <h6 className="mb-0">Pixel Account</h6>
                                      <p className="text-muted fs-sm">shopia@pixel.com</p>
                                  </div>
                              </a>
                          </li>
                          <li>
                              <a href="#" className="dropdown-item d-flex align-items-center gap-2 mt-1">
                                  <img src="data:image/png;base64,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" loading="lazy" alt="img-07" className="size-9" />
                                  <div className="flex-grow-1">
                                      <h6 className="mb-0">Global World</h6>
                                      <p className="text-muted fs-sm">world@global.com</p>
                                  </div>
                              </a>
                          </li>
                      </ul>
                  </div>
                  <div className="card-body">
                      <div className="main-simplebar inbox-message px-5 mx-n5" data-simplebar>
                          <h6 className="mb-1">Inbox Messages</h6>
                          <p className="text-muted">1487 messages - 26 unread</p>
                          <ul className="mt-5 inbox-message-list">
                              <li>
                                  <a href="#" className="active">
                                      <i data-lucide="inbox" className="size-4"></i>
                                      Inbox
                                      <span className="ms-auto flex-shrink-0 badge bg-body-tertiary text-muted border">12</span>
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="star" className="size-4"></i>
                                      Starred
                                      <span className="ms-auto flex-shrink-0 badge bg-body-tertiary text-muted border">2</span>
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="send-horizontal" className="size-4"></i>
                                      Sent
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="square-pen" className="size-4"></i>
                                      Drafts
                                      <span className="ms-auto flex-shrink-0 badge bg-body-tertiary text-muted border">2</span>
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="circle-alert" className="size-4"></i>
                                      Spam
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="trash-2" className="size-4"></i>
                                      Trash
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="step-forward" className="size-4"></i>
                                      Important
                                  </a>
                              </li>
                              <li>
                                  <a href="#">
                                      <i data-lucide="calendar" className="size-4"></i>
                                      Scheduled
                                  </a>
                              </li>
                          </ul>
                          <div className="d-flex mt-4">
                              <h6 className="flex-grow-1 mb-0">Labels</h6>
                              <a href="#" className="flex-shrink-0 link link-custom-primary"><i data-lucide="plus" className="size-4"></i></a>
                          </div>
                          <ul className="mt-5 d-flex flex-column gap-3 mb-0 ps-0 list-unstyled">
                              <li>
                                  <a href="#" className="d-flex gap-2 align-items-center link link-custom">
                                      <i data-lucide="diamond" className="size-4 text-danger"></i>
                                      Team Meetings
                                      <span className="ms-auto text-muted">3</span>
                                  </a>
                              </li>
                              <li>
                                  <a href="#" className="d-flex gap-2 align-items-center link link-custom">
                                      <i data-lucide="diamond" className="size-4 text-success"></i>
                                      Application
                                      <span className="ms-auto text-muted">2</span>
                                  </a>
                              </li>
                              <li>
                                  <a href="#" className="d-flex gap-2 align-items-center link link-custom">
                                      <i data-lucide="diamond" className="size-4 text-warning"></i>
                                      Developers
                                      <span className="ms-auto text-muted">4</span>
                                  </a>
                              </li>
                              <li>
                                  <a href="#" className="d-flex gap-2 align-items-center link link-custom">
                                      <i data-lucide="diamond" className="size-4 text-primary"></i>
                                      Photographer
                                      <span className="ms-auto text-muted">1</span>
                                  </a>
                              </li>
                          </ul>
                      </div>
                      <button type="button" className="w-100 mt-4 btn btn-primary" data-bs-toggle="modal" data-bs-target="#addComposeModals">Compose</button>
                  </div>
              </div>
              <div className="offcanvas-backdrop" style={{display: "none"}}></div>

              <div className="mailbox-list card flex-grow-1">
                  <div className="card-body px-0 pb-0">
                      <div data-simplebar>
                          <div className="mailbox-user-list d-flex gap-4 px-5">
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border h5 size-12 mx-auto mb-1">
                                      S
                                      <span className="mailbox-user-noti avatar size-5 badge bg-primary">5</span>
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Lucas Ethan</h6>
                              </a>
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border size-12 mx-auto mb-1">
                                      <img src="data:image/png;base64,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" loading="lazy" alt="Brand" className="size-6" />
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Windows Social Media</h6>
                              </a>
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border h5 size-12 mx-auto mb-1">
                                      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAHYAAAB2AH6XKZyAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAACj9JREFUeJzVm3tw1NUVxz/nt5vdPGAhPEISIDykCgkoCLUgoyRgCVB8tDZYmc7UYn1Ba2W07TitNtqiY+3YqRIQ0aG11tE4Wh+MAiKJVUErqMAUpRYBIVNMAiSRkGR/+7unf0CAJLv7+22yG/Q7k0nmnnPvOff7u/fccx8RegEPvzo35Mt0rhe1rlZ0PGgAZI/AUxm0/fnHJdWtveFHNEiqDayonlOm6HKUnOga+i6WWYSJHFhSUn0s1f50RsoIUEUqqkvvF/jVSUN7jOp9ljHVIultxrKXArd3qvYJyB8H1/X9y4IFzzmp8u1MpIyAiqo5D4LeASDCfYNqQ/csWPBcGKBiU+kvEZYB/hjVnxtcF/phu34qEcuBHqGiavY1oHegGCxuXly8fnW7bHl16T0odwMI+oxiZYFeDvoEWO8j+hBKWW3Ol0eBm1Lh35mwkt1gRVXpGEQeO9l6+ZIOnZ/zXVHuQjECtywu2XCtUSoAEKtkScm6VShXqxAW1RuWb5ozK9n+dUZSCVBFQP+GEhJYu3jG+t+3y1aun50jqmsAQeR3i0vWPwqgrbIFxaA66vF1pQOWlKxfBywHxBL9TTL9i4akToEV1bMXgkxFaBIn7WYRtF1mgvwWpR/C5rrqqffCOgBunfdaU0VVaQ0wvC1oCoAj6a0sawuyWGHGyjfnTlLH5Csy68Ahu1/6tW/cUC6YZPmctBFQWVkWUJH7AFDuvmXW2pp22arXLytA5UZAxeit5eXlHTsgHAVQ9Q1sL1JhByDGmG0qrEV0aUODs+jI4yXbKyvxJcvvpBFQN7ixTJQC0BqnxXr0TJmd5rueE6Nt3eKZG7ZFqd4AYIn5SUVV6aa2IF+IctFJWYeVquFLZ/zbTcU7y8uLkzJ6kxgDrNtO/JYHb533Wlt7qSoiyqITf8vyM8tXbJo9uWJT6b0o4wAU+QFQgsvUbGgy4+qHyu6fPTw32FOvk5IHPLpxbqHjM/8GbQkTzl9aUt3QLnvkzXkTLOPsABqOh3VYRpCLUblS4ApgeCJ2dn7cxvHW07OnX8jalx7wrQQQS8PimHr1+49nLtz4otc4kZRhZCzzfQBUXlw683TnASzjzARAsDIDchClfzJsAjQ2mZGNmAc6lobJfXLWEnhjhZc2kkKAis4FQWAtwMo35g9Vy74cuMoIJaKAEkqGLS9w1FwM9A4BlZVlgTqaJgKocFFFVeltBnsKJ6eXaNzqKUHEMNarbrcJqKws89UObJxeZzUuBEk/Wfzz7raXTDi2DvOqmxABD20uywiGGy9TrPl12nSFILmJu5d6tNma7VXX0ypQUVU6B7gJtBQko9ue9RCdV4FYEIEBQ+3MPy3Y0uKm6zoCKqpKxwCvAtIL5ydJgSoE7azpwEY3XfdESOSbJLHnfitA0N+HoL9PspqMikjETPfkj7uKjum+G0JuaCzn5FzCoKzR9MscSp/g4FNS22nhSPN+dhz8B5/Wvtl9M1EQMWaiFz1XAtQwShL8/oIwLm8OF464hlB67DiZ5stgSGgsWWeQkiwYg6cP50qAJYxKZCnPzhzOrHG/IKfvuZ7rHDz6YQIWvMG2Nd+LnvsIgFFejQ7uO4b55y8jI62f1yq0hBuoP/aZZ32vsG1vmWfcILhq6+Q0wFNSEUrP5coLHkio8wAHGz4Ckp8uhm38SytLB7jpxSWgrTGnANwPHwRh5tjbCfizEnDxBFIx/E9ASbOdYjetuAT4LeNp+J87ZCb5/Sd4dKwjDqSMADARM81NJ24MUGGUl9E5YdiVMWW1TbvZ9b911Dd/hqqDiI/szOHkhQrJzhrBsdZadwPdhGP0fDed+AQYHSUua2C/jPyYEf+/tf/k9V33o51YrG3aze5DrklajxFx1HUEx50ClrivAENCsXeeW/f/vUvnexMRW4a46cQlQBFXAgZkjYgpaw4fcaueUoRt45pvu+0FRrs14LPSYsqK8ua5VU8p7Ihadzw5O+5HjEnAg+tnZwGuOarE4XDq6OuYVLCAs7mLtCRSHFceS9An4C0DbA4fjiMVpo1exFUT/0AoI89Lc0mHOqfuF6IiJgHGQwAEONS4y1Unv/8ErpmygvH58700mVTYqoXx5DEJUGN5JqCxpcZVL82XwaXn/pTZhXeS5uu9QyXHZmQ8eUwCLHFfQwEU5Z09q/Gaz4/JmcH883+P39fjSx1PsCNmUDx5vCngugK0Y1/9u7y396+encrrV8TswjvpjeDYamtGucb50LEEot5GQDu27X+GzXtWo+rt5nrkwKmcl5vy9w8YBwk/XRwzJY6TB8jIRI19dOB5Xt5+J81t8VaG07iwYEGiJrqFiOO7NJYsKgGrqi4fBPTtjrGahu08u/UWahq2u+pmZxaQnVnQHTMJwVGdEksWlQBjwp7nfzS02k28sv3X1DTscNUd3LcHZ64e4UT0vFiy6ARYic3/qG1ohI0fP4DRSFy9zIDnS5xuw45ozGEWKwZ4JCB+FG9uO8zhY3vj6hhN/XtIO0JMlqMSoOItCfrWqB8xecS1cTZEQjAtfiiJOKl/JtwW1mB5ZVkgmizqgYjXJXBY9kSGhMYyLq+UnQdf5pNDG2iLnH7uO37o/Lj3AgCHm/d5MdUjqCptkfppQJfbl1gnQq4E+H3BUwEslJ7L9DE3MnX0dXzRtJsWu4F+GfkM6nNO3DZsp4XDKTgSj4ZIRC7BCwHl5eUWbHF9uzMkNA5LOlb3WYGEDkc/ra0mYlL+HBiAiMOkaOVdYkDe9LeHAa6Jel4o7ibLFY6x2X7ghR61kZi96HecXQhwfGme5n+f9J7d572/7ymOHj/QozYSQcTWodHKuxCgHneBb326ko8OPO859z8T2w+8wAefP5twvZ7AtjXqlVW3CXBMmM17VvP8h0v5/Mj7eNkOHw8f5fVd9/POnse8mEgq2mz85WuKuzzR6xIELcMoTWCXWtu0m7U77qJveg4jB04jNzSW7KwCAr7ME4Yjxzhy/HP2H/4Xe+u34PRS0OsKpSVgzQBeOrO06zIoMro7l5Vfttays+Yldta85K58luAY3zQ6EdDtKfB1hGObLucCHQhYU1WcjuEr+fQtGYg42iUz60BAi6aPiHvQ/zWHHdEuV2UdYoBKa41K+vdQikR0gsJ4Ub4BxL7++RrBtk2XnZlrvF+1dXKa05A9XP1WEWpNBi1UoUgMY3t7tHh9KBkPw/unFyxbtOFUBub6RuimKdts4LOTP6+0lz/x9hV9W8KthYhMEBjP6R/XG9mzBZ9f1AlExgGnCEj6ufSKt76TrRGnSNQUqkURKoXABXi4Z3RDoiPA8qEZQTmaHvC9F/CZpzP28kx5eXWHI6peu7V8ZMO3831pVqFCkYoUWkqRik5CyfTahhsBXjrcGWf18W9lZZmvfsDREeq3ikSlEKXIWEwW5TyiPM7qTIDfh8nI8NUF/PKB1w53xlfy9fOaquL0ZhMsFGE8FkUoE1Qo+vg/rbmC1AYDstmfxtMZC6te6en/EP4falW2UGoFLzMAAAAASUVORK5CYII=" loading="lazy" alt="Brand" className="size-6" />
                                      <span className="mailbox-user-noti avatar size-5 badge bg-primary">5</span>
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Shopify</h6>
                              </a>
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border size-12 mx-auto mb-1">
                                      <img src="data:image/png;base64,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" loading="lazy" alt="Brand" className="size-6" />
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Payment</h6>
                              </a>
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border size-12 mx-auto mb-1">
                                      <img src="data:image/png;base64,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" loading="lazy" alt="Brand" className="size-6" />
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Social Media</h6>
                              </a>
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border size-12 mx-auto mb-1">
                                      <img src="data:image/png;base64,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" loading="lazy" alt="Brand" className="size-6" />
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Romero</h6>
                              </a>
                              <a href="#" className="mailbox-user-item p-2 text-center rounded-2 w-24 flex-shrink-0">
                                  <div className="avatar text-muted bg-body-secondary border size-12 mx-auto mb-1">
                                      <img src="data:image/png;base64,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" loading="lazy" alt="Brand" className="size-6" />
                                  </div>
                                  <h6 className="fw-medium text-body  mb-0 text-truncate text-body">Romero</h6>
                              </a>
                          </div>
                      </div>
                  </div>
                  <div className="card-body px-0">
                      <div className="d-flex align-items-center gap-2 px-5 border-bottom pb-4">
                          <div className="form-check check-primary flex-shrink-0">
                              <input className="form-check-input" type="checkbox" id="allCheckMail" />
                              <label className="form-check-label d-none" htmlFor="allCheckMail">
                                  All Check Mail List
                              </label>
                          </div>
                          <h6 className="flex-grow-1 mb-0">Main Inbox <small id="message-count" className="fw-normal text-muted fs-sm ms-1">12 messages</small></h6>
                          <div className="d-flex align-items-center gap-4 flex-shrink-0">
                              <a href="#" id="deleteBtn" className="link link-danger d-none"><i data-lucide="trash" className="size-4"></i></a>
                              <div className="dropdown float-end">
                                  <a href="#" className="link link-custom-primary" type="button" id="moreOptionDropdownButtons" data-bs-toggle="dropdown" aria-expanded="false">
                                      <i data-lucide="ellipsis" className="size-5"></i>
                                  </a>
                                  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="moreOptionDropdownButtons">
                                      <li>
                                          <a href="#" className="dropdown-item">Show more messages</a>
                                      </li>
                                      <li>
                                          <a href="#" className="dropdown-item">Hide section when empty</a>
                                      </li>
                                      <li>
                                          <a href="#" className="dropdown-item">Manage Inbox settings</a>
                                      </li>
                                      <li>
                                          <a href="#" className="dropdown-item">Mark all as read</a>
                                      </li>
                                  </ul>
                              </div>
                              <a href="#" className="link link-custom-primary">
                                  <i data-lucide="rotate-ccw" className="size-4"></i>
                              </a>
                              <a href="#" className="link link-custom-primary" data-bs-toggle="modal" data-bs-target="#searchMailModal"><i data-lucide="search" className="size-4"></i></a>
                          </div>
                      </div>
                      <div className="mailbox-list-wrapper" data-simplebar>
                          <div id="mailbox-list" className="px-0"></div>
                      </div>
                  </div>
              </div>

              <div className="mail-overview card flex-grow-1" style={{display: "none"}} id="mailOverview">
                  <div className="card-header">
                      <div className="d-flex align-items-center gap-2 flex-md-row flex-column">
                          <div className="d-flex align-items-center gap-2">
                              <a href="#" className="btn btn-icon btn-active-dark">
                                  <i data-lucide="arrow-left" className="size-4"></i>
                              </a>
                              <a href="#" className="btn btn-icon btn-active-dark">
                                  <i data-lucide="archive" className="size-4"></i>
                              </a>
                              <a href="#" className="btn btn-icon btn-active-dark">
                                  <i data-lucide="octagon-alert" className="size-4"></i>
                              </a>
                          </div>
                          <nav aria-label="Page navigation example" className="mx-auto">
                              <ul className="pagination flex-nowrap pagination-modern mb-0">
                                  <li className="page-item"><a className="page-link border-0" href="#"><i data-lucide="chevron-left" className="size-5"></i></a></li>
                                  <li className="page-item disabled"><a className="page-link border-0 text-nowrap" href="#">06 of 12</a></li>
                                  <li className="page-item"><a className="page-link border-0" href="#"><i data-lucide="chevron-right" className="size-4"></i></a></li>
                              </ul>
                          </nav>
                          <div className="d-flex align-items-center gap-2">
                              <a href="#" className="btn btn-icon btn-active-dark">
                                  <i data-lucide="reply" className="size-4"></i>
                              </a>
                              <a href="#" className="btn btn-icon btn-active-dark">
                                  <i data-lucide="clock-3" className="size-4"></i>
                              </a>
                              <a href="#" className="btn btn-icon btn-active-danger" data-bs-toggle="modal" data-bs-target="#deleteModal">
                                  <i data-lucide="trash-2" className="size-4"></i>
                              </a>
                          </div>
                      </div>
                  </div>
                  <div className="card-body">
                      <div className="mail-overview-wrapper px-5 mx-n5" data-simplebar>
                          <div className="d-flex align-items-center gap-2">
                              <div className="avatar text-danger rounded-circle bg-danger-subtle shrink-0 size-10">
                                  <img src="../assets/user-11-bzS6tHsV.png" loading="lazy" alt="user-11" className="rounded-circle size-10" />
                              </div>
                              <div className="flex-grow-1">
                                  <h6 className="mb-0">Armand Noto</h6>
                              </div>
                              <p className="fs-12 text-muted flex-shrink-0">15 June, 01:22AM</p>
                          </div>
                          <div className="mt-5">
                              <h6 className="mb-3">Report - GotPOS Projects</h6>
                              <div className="d-flex flex-column gap-2">
                                  <p>Please see the project status in the pdf I attached. The project looks good, and we are confident that we will complete it on time.</p>
                              </div>
                              <div className="row mt-4 g-3" id="attachmentFiles">
                                  <div className="col-md-6">
                                      <a href="#" className="d-flex align-items-center gap-2 p-2 border border-dashed rounded text-reset">
                                          <div className="avatar fs-4 text-muted bg-body-tertiary rounded-circle size-10">
                                              <i data-lucide="file-text" className="size-4"></i>
                                          </div>
                                          <div className="flex-grow-1">
                                              <h6 className="mb-0">shopify-docs.txt</h6>
                                              <p className="fs-sm text-muted">154 kb</p>
                                          </div>
                                          <div className="flex-shrink-0">
                                              <i data-lucide="download" className="size-5 icon-dark"></i>
                                          </div>
                                      </a>
                                  </div>
                                  <div className="col-md-6">
                                      <a href="#" className="d-flex align-items-center gap-2 p-2 border border-dashed rounded text-reset">
                                          <div className="avatar fs-4 text-muted bg-body-tertiary rounded-circle size-10">
                                              <i data-lucide="image" className="size-4"></i>
                                          </div>
                                          <div className="flex-grow-1">
                                              <h6 className="text-body  mb-0">main-logo.png</h6>
                                              <p className="mb-0 fs-sm text-muted">467 kb</p>
                                          </div>
                                          <div className="flex-shrink-0">
                                              <i data-lucide="download" className="size-5 icon-dark"></i>
                                          </div>
                                      </a>
                                  </div>
                              </div>
                              <p className="mt-4">Best regards,</p>
                              <p>Armand Noto</p>
                          </div>
                          <div className="mt-4">
                              <div className="d-flex align-items-center gap-2">
                                  <div className="avatar text-success bg-success-subtle rounded-circle shrink-0 size-10">
                                      <img src="../assets/user-45-B1WJJY3O.png" loading="lazy" alt="user-45" className="rounded-circle size-10" />
                                  </div>
                                  <div className="flex-grow-1">
                                      <h6 className="mb-0">Lucas Ethan</h6>
                                      <a href="#" className="link link-custom-primary">lucas@gotpos.com</a>
                                  </div>
                                  <p className="fs-12 text-muted flex-shrink-0">15 June, 02:00AM</p>
                              </div>
                              <div className="mt-5">
                                  <h6 className="mb-3">Re: Report - GotPOS Projects</h6>
                                  <div className="d-flex flex-column gap-2">
                                      <p>Thanks, Armand. The status looks good. Let's discuss the next steps in our upcoming meeting.</p>
                                  </div>
                                  <p className="mt-4">Best regards,</p>
                                  <p>Lucas Ethan</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="card-body pt-0">
                      <div className="mb-0 shadow-none card">
                          <form action="#!">
                              <div className="p-4">
                                  <div className="d-flex align-items-center gap-2">
                                      <label htmlFor="toEmailInput" className="form-label mb-0">To:</label>
                                      <input type="text" id="toEmailInput" className="form-control p-0 h-auto border-0" placeholder="Type email" defaultValue="armand@gotpos.com" />
                                      <a href="#" className="link link-custom-primary">Cc</a>
                                      <a href="#" className="link link-custom-primary">Bcc</a>
                                  </div>
                              </div>
                              <div className="p-4 pt-1 card-body">
                                  <label htmlFor="typeEmailMessageInput" className="d-none">Type something</label>
                                  <textarea form="typeEmailMessageInput" className="form-control p-0 h-auto border-0 resize-none" rows="3" placeholder="Type something ..."></textarea>
                                  <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
                                      <div className="shrink-0">
                                          <label htmlFor="sendImages" className="btn btn-icon btn-active-dark">
                                              <i data-lucide="image" className="size-5"></i>
                                          </label>
                                          <input type="file" id="sendImages" className="d-none" />
                                      </div>
                                      <a href="#" className="link link-custom-primary flex-shrink-0"><i data-lucide="link" className="size-5"></i></a>
                                      <a href="#" className="link link-custom-primary flex-shrink-0"><i data-lucide="pencil" className="size-5"></i></a>
                                      <a href="#" className="link link-custom-warning flex-shrink-0"><i data-lucide="smile" className="size-5"></i></a>
                                      <button type="button" className="ms-auto btn btn-light">Draft</button>
                                      <button type="submit" className="btn btn-primary ms-auto">Send Now</button>
                                  </div>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="addComposeModals" tabIndex="-1" aria-labelledby="addComposeModalsLabel" aria-hidden="true">
              <div className="modal-dialog modal-lg">
                  <div className="modal-content">
                      <div className="modal-body">
                          <form>
                              <div className="d-flex align-items-center gap-2 py-2">
                                  <label htmlFor="toEmailInput" className="form-label mb-0">To:</label>
                                  <input type="text" id="toEmailInput" className="form-control p-0 h-auto border-0" placeholder="Type email" />
                                  <a href="#" className="link link-custom-primary">Cc</a>
                                  <a href="#" className="link link-custom-primary">Bcc</a>
                              </div>
                              <div className="py-2 border-top border-bottom">
                                  <label htmlFor="subjectInputModal" className="form-label mb-0 d-none">Subject</label>
                                  <input type="text" className="h-auto p-0 border-0 form-control" id="subjectInputModal" placeholder="Subject" />
                              </div>
                              <div className="py-2 card-body">
                                  <label htmlFor="typeEmailMessageInput" className="d-none">Type something</label>
                                  <textarea form="typeEmailMessageInput" className="form-control p-0 h-auto border-0 resize-none" rows="3" placeholder="Type something ..."></textarea>
                                  <div className="d-flex align-items-center gap-3 mt-2">
                                      <div className="shrink-0">
                                          <label htmlFor="sendImages" className="btn btn-icon btn-active-dark">
                                              <i data-lucide="image" className="size-5"></i>
                                          </label>
                                          <input type="file" id="sendImages" className="d-none" />
                                      </div>
                                      <a href="#" className="link link-custom-primary flex-shrink-0"><i data-lucide="link" className="size-5"></i></a>
                                      <a href="#" className="link link-custom-primary flex-shrink-0"><i data-lucide="pencil" className="size-5"></i></a>
                                      <a href="#" className="link link-custom-warning flex-shrink-0"><i data-lucide="smile" className="size-5"></i></a>
                                      <button type="button" className="ms-auto btn btn-light">Draft</button>
                                      <button type="submit" className="btn btn-primary">Send Now</button>
                                  </div>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="searchMailModal" tabIndex="-1" aria-labelledby="searchMailModalLabel" aria-hidden="true">
              <div className="modal-dialog">
                  <div className="modal-content">
                      <div className="modal-body">
                          <div className="position-relative">
                              <input type="text" className="form-control ps-9 pe-4" placeholder="Search anythings ..." id="searchResults" />
                              <div className="position-absolute top-50 translate-middle-y d-flex align-items-center">
                                  <i data-lucide="search" className="size-4 ms-3 icon-dark"></i>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>


          <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered modal-xs mx-auto">
                  <div className="modal-content p-7 text-center">
                      <div className="avatar size-14 bg-danger-subtle rounded-circle mx-auto mb-4">
                          <i data-lucide="trash-2" className="size-6 text-danger"></i>
                      </div>
                      <h5 className="mb-4 lh-base">Are you sure you want to delete this Email?</h5>
                      <div className="d-flex justify-content-center align-items-center gap-2">
                          <button type="button" className="btn btn-danger" id="deleteButton" data-bs-dismiss="modal">Delete</button>
                          <button type="button" className="btn btn-link link-primary text-dark" data-bs-dismiss="modal">Cancel</button>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
