import { useEffect } from 'react'

export default function Calendar() {
  useEffect(() => {
    const calendarEl = document.getElementById('calendar')
    if (!calendarEl || !window.FullCalendar) return
    // Destroy previous instance if navigating back
    if (calendarEl._fcAPI) { calendarEl._fcAPI.destroy() }
    const calendar = new window.FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
      },
      editable: true,
      droppable: true,
      events: [
        { title: 'Farm Harvest Day',    start: new Date().toISOString().slice(0,10) },
        { title: 'Supplier Meeting',    start: new Date(Date.now()+2*86400000).toISOString().slice(0,10) },
        { title: 'Staff Training',      start: new Date(Date.now()+5*86400000).toISOString().slice(0,10) },
        { title: 'Delivery Review',     start: new Date(Date.now()+7*86400000).toISOString().slice(0,10) },
      ],
    })
    calendar.render()
    calendarEl._fcAPI = calendar
    return () => { calendar.destroy() }
  }, [])

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row">
              <h6 className="flex-grow-1 mb-0">Default</h6>
              <ul className="breadcrumb flex-shrink-0 mb-0">
                  <li className="breadcrumb-item"><a href="#">Calendar</a></li>
                  <li className="breadcrumb-item active">Default</li>
              </ul>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3" id="external-events">
              <div id="external-events" className="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                  <div className="btn btn-secondary text-white draggable-event" draggable="true">
                      <div className="fc-event-main fs-13">Events</div>
                  </div>
                  <div className="btn btn-primary text-white draggable-event" draggable="true">
                      <div className="fc-event-main fs-13">Personal</div>
                  </div>
                  <div className="btn btn-success text-white draggable-event" draggable="true">
                      <div className="fc-event-main fs-13">Meeting</div>
                  </div>
                  <div className="btn btn-info text-white draggable-event" draggable="true">
                      <div className="fc-event-mai fs-13n">Festival Function</div>
                  </div>
              </div>

              <button type="button" className="btn btn-primary d-flex align-items-center" id="newEvent" data-bs-toggle="modal" data-bs-target="#addEventModal">
                  <i data-lucide="circle-plus" className="size-4 me-1"></i>
                  Add Event
              </button>
          </div>

          <div className="card">
              <div className="card-body">
                  <div id='calendar'></div>
              </div>
          </div>


          <div className="modal fade" id="addEventModal" tabIndex="-1" aria-labelledby="addEventModalLabel" aria-hidden="true">
              <div className="modal-dialog modal-lg modal-dialog-centered">
                  <div className="modal-content">
                      <div className="modal-header">
                          <h6 className="mb-0" id="modalTitle">Add Event</h6>
                          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div className="modal-body">
                          <form id="eventForm" action="#!">
                              <div className="row g-5">
                                  <div className="col-12">
                                      <label htmlFor="eventNameInput" className="form-label">Event Name</label>
                                      <input type="text" id="eventNameInput" className="form-control" placeholder="Enter Event Name" />
                                  </div>
                                  <div className="col-4">
                                      <div>
                                          <label htmlFor="eventDateInput" className="form-label">Event Date</label>
                                          <div className="position-relative">
                                              <input type="date" className="form-control ps-9" id="eventDateInput" placeholder="Select date" />
                                              <i data-lucide="calendar-check" className="size-4 text-muted position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="col-4">
                                      <div>
                                          <label htmlFor="endEventDateInput" className="form-label">End Date</label>
                                          <div className="position-relative">
                                              <input type="date" className="form-control ps-9" id="endEventDateInput" placeholder="Select date" />
                                              <i data-lucide="calendar-check" className="size-4 text-muted position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="col-4">
                                      <div>
                                          <label htmlFor="eventTimeInput" className="form-label">Event Time</label>
                                          <div className="position-relative">
                                              <input type="time" className="form-control ps-9" id="eventTimeInput" placeholder="Select time" />
                                              <i data-lucide="clock" className="size-4 text-muted position-absolute top-50 start-0 ms-3 translate-middle-y"></i>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="ColorSelect" className="form-label">Color</label>
                                      <div id="ColorSelect"></div>
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="locationInput" className="form-label">Location</label>
                                      <input type="text" id="locationInput" className="form-control" placeholder="Enter Location" />
                                  </div>
                                  <div className="col-12">
                                      <label htmlFor="guestInput" className="form-label">Add Guests</label>
                                      <div className="position-relative">
                                          <input type="text" id="guestInput" className="form-control" placeholder="example@domain.com" />
                                          <button type="button" id="addGuestBtn" className="btn btn-sub-primary btn-sm position-absolute top-50 translate-middle-y end-0 me-2">Add</button>
                                      </div>
                                      <div className="d-flex gap-2 mt-2 flex-wrap" id="guestList">

                                      </div>
                                  </div>
                              </div>
                              <div className="d-flex justify-content-end gap-2 mt-3">
                                  <button type="button" className="btn btn-active-danger" data-bs-dismiss="modal">Cancel</button>
                                  <button type="submit" id="submitEventBtn" className="btn btn-primary">Create Event</button>
                              </div>
                          </form>
                      </div>
                  </div>
              </div>
          </div>
    </div>
  )
}
