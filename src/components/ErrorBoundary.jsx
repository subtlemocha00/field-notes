import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center-screen">
          <div className="card login-card">
            <h1 className="login-card__title">Something went wrong</h1>
            <p className="text-muted">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              className="btn btn--block"
              onClick={this.handleReload}
            >
              Reload app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
