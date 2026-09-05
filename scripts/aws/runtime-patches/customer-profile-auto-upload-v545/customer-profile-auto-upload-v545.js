;(() => {
  'use strict'
  if (window.__orimiaCustomerProfileAutoUploadV545) return
  window.__orimiaCustomerProfileAutoUploadV545 = true

  const FORM_MARKER = 'customerProfileAutoUploadV545'
  const INPUT_MARKER = 'customerProfileAutoUploadBoundV545'
  const CROP_READY_EVENT = 'orimia:customer-profile-crop-ready-v545'
  let uploadInProgress = false

  function addStyles() {
    if (document.querySelector('#customer-profile-auto-upload-v545-style')) return
    const style = document.createElement('style')
    style.id = 'customer-profile-auto-upload-v545-style'
    style.textContent = `
      form[data-customer-profile-auto-upload-v545="1"] label[data-customer-profile-image-picker-v545="1"]{min-height:44px;padding-inline:16px;border-color:#ddcfc8;color:#5f453d;transition:border-color .18s ease,background .18s ease,opacity .18s ease}
      form[data-customer-profile-auto-upload-v545="1"] label[data-customer-profile-image-picker-v545="1"]:hover{border-color:#c99585;background:#fff8f5}
      form[data-customer-profile-auto-upload-v545="1"] label[data-customer-profile-image-picker-v545="1"][aria-disabled="true"]{cursor:wait;opacity:.58}
      form[data-customer-profile-auto-upload-v545="1"] [data-profile-upload-button-v424],form[data-customer-profile-auto-upload-v545="1"] button[type="submit"]{display:none!important}
      [data-profile-upload-status-v545]{width:100%;margin:2px 0 0;color:#786b64;font-size:12px;font-weight:700;line-height:1.6;text-align:center}
      [data-profile-upload-status-v545][data-state="success"]{color:#426b50}
      [data-profile-upload-status-v545][data-state="error"]{color:#a23c32}
    `
    document.head.appendChild(style)
  }

  function ensureStatus(form) {
    let status = form.querySelector('[data-profile-upload-status-v545]')
    if (status) return status
    status = form.querySelector('[data-profile-upload-status-v424]') || document.createElement('p')
    status.removeAttribute('style')
    status.dataset.profileUploadStatusV545 = '1'
    status.setAttribute('role', 'status')
    status.setAttribute('aria-live', 'polite')
    if (!status.isConnected) form.appendChild(status)
    return status
  }

  function liveProfileForm(fallback) {
    return document.querySelector('input[type="file"][name="profileImage"]')?.closest('form') || fallback
  }

  async function uploadCroppedImage(file, input, form) {
    if (!file || uploadInProgress) return

    uploadInProgress = true
    input.dataset.profileUploadBusyV545 = '1'
    const label = input.closest('label')
    const status = ensureStatus(form)
    status.dataset.state = 'loading'
    status.textContent = 'プロフィール画像を更新しています...'
    input.disabled = true
    label?.setAttribute('aria-disabled', 'true')
    form.setAttribute('aria-busy', 'true')

    try {
      const body = new FormData()
      body.append('profileImage', file, file.name)
      const response = await fetch('/api/customer/profile-image', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'プロフィール画像を更新できませんでした。')

      const liveForm = liveProfileForm(form)
      const liveStatus = ensureStatus(liveForm)
      liveStatus.dataset.state = 'success'
      liveStatus.textContent = payload.message || 'プロフィール画像を更新しました。'
      input.value = ''
      const liveInput = liveForm.querySelector('input[type="file"][name="profileImage"]')
      if (liveInput && liveInput !== input) liveInput.value = ''
      if (payload.imageUrl) {
        document.querySelectorAll('img[alt$="のプロフィール画像"]').forEach(image => {
          image.src = payload.imageUrl
        })
      }
      document.dispatchEvent(new CustomEvent('orimia:customer-profile-image-updated', {
        detail: { imageUrl: payload.imageUrl || '' },
      }))
    } catch (error) {
      input.value = ''
      const liveStatus = ensureStatus(liveProfileForm(form))
      liveStatus.dataset.state = 'error'
      liveStatus.textContent = error instanceof Error ? error.message : 'プロフィール画像を更新できませんでした。'
    } finally {
      uploadInProgress = false
      delete input.dataset.profileUploadBusyV545
      input.disabled = false
      label?.removeAttribute('aria-disabled')
      form.removeAttribute('aria-busy')
    }
  }

  function bindProfileImageForm() {
    if (location.pathname !== '/u/profile' || document.documentElement.dataset.orimiaUiReady !== 'v516') return
    const input = document.querySelector('input[type="file"][name="profileImage"]')
    const form = input?.closest('form')
    if (!input || !form) return

    addStyles()
    form.dataset[FORM_MARKER] = '1'
    input.required = false

    const label = input.closest('label')
    if (label) {
      label.dataset.customerProfileImagePickerV545 = '1'
    }

    if (input.dataset[INPUT_MARKER] === '1') return
    input.dataset[INPUT_MARKER] = '1'
    input.addEventListener(CROP_READY_EVENT, event => {
      const file = event instanceof CustomEvent ? event.detail?.file : null
      void uploadCroppedImage(file || input.files?.[0], input, form)
    })
  }

  let bindScheduled = false
  const scheduleBind = () => {
    if (bindScheduled) return
    bindScheduled = true
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bindScheduled = false
      bindProfileImageForm()
    }))
  }

  const start = () => {
    const observer = new MutationObserver(scheduleBind)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    window.addEventListener('orimia:ui-transition-finished', scheduleBind)
    window.addEventListener('popstate', scheduleBind)

    if (document.documentElement.dataset.orimiaUiReady === 'v516') scheduleBind()
    else {
      const waitForReady = window.setInterval(() => {
        if (document.documentElement.dataset.orimiaUiReady !== 'v516') return
        window.clearInterval(waitForReady)
        scheduleBind()
      }, 50)
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()

/* customer-profile-auto-upload-v545 */
