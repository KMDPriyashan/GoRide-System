import { Component } from 'react'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('GoRide interface error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <main className="ui-error-state" role="alert">
        <span className="ui-error-icon"><FiAlertTriangle aria-hidden="true" /></span>
        <span className="ui-empty-state-eyebrow">SOMETHING WENT WRONG</span>
        <h1>This page could not be loaded.</h1>
        <p>Your account data is safe. Reload the page to try again.</p>
        <button className="ui-empty-state-action" type="button" onClick={() => window.location.reload()}><FiRefreshCw /> Reload page</button>
      </main>
    )
  }
}