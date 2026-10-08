import { FiAlertTriangle } from 'react-icons/fi'
import Modal from './Modal.jsx'

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
  isBusy = false,
}) {
  return (
    <Modal
      open={open}
      onClose={isBusy ? undefined : onCancel}
      title={title}
      size="small"
      footer={(
        <>
          <button className="ui-button ui-button--quiet" type="button" onClick={onCancel} disabled={isBusy}>{cancelLabel}</button>
          <button className={`ui-button ui-button--${tone}`} type="button" onClick={onConfirm} disabled={isBusy}>
            {tone === 'danger' && <FiAlertTriangle aria-hidden="true" />}
            {isBusy ? 'Please wait...' : confirmLabel}
          </button>
        </>
      )}
    >
      {message && <p className="ui-confirm-message">{message}</p>}
    </Modal>
  )
}