import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light p-4">
          <div className="card shadow-sm border-0 text-center p-4 p-md-5" style={{ maxWidth: 520, borderRadius: 16 }}>
            <div className="mb-3">
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle bg-danger-subtle text-danger"
                style={{ width: 64, height: 64, fontSize: 28 }}
              >
                <i className="ri-error-warning-line"></i>
              </span>
            </div>
            <h4 className="fw-bold mb-2 text-dark">Something went wrong</h4>
            <p className="text-muted small mb-4">
              {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <button
                type="button"
                className="btn btn-primary px-4 py-2 fw-medium"
                onClick={this.handleReset}
              >
                <i className="ri-refresh-line me-1"></i> Reload Page
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2 fw-medium"
                onClick={() => { window.location.href = '/dashboard' }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
