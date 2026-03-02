/**
 * Toast Notification System
 * Display beautiful in-app notifications without browser alerts
 */

const Toast = (() => {
  let toastContainer = null;

  function ensureContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(toastContainer);
    }
  }

  function createToastElement(type, message, duration = 3000) {
    const bgColor = {
      'success': '#16A34A',
      'error': '#DC2626',
      'warning': '#F59E0B',
      'info': '#0891B2'
    }[type] || '#0891B2';

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 14px;
      font-family: 'Montserrat', sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.3s ease-out;
    `;

    const icon = {
      'success': '✓',
      'error': '✕',
      'warning': '⚠',
      'info': 'ℹ'
    }[type] || 'ℹ';

    toast.innerHTML = `
      <span style="font-size: 18px; font-weight: bold;">${icon}</span>
      <span>${message}</span>
    `;

    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }

    return toast;
  }

  // Add animations to document if not already added
  if (!document.querySelector('style[data-toast-animations]')) {
    const style = document.createElement('style');
    style.setAttribute('data-toast-animations', 'true');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return {
    success: (message, duration = 3000) => {
      ensureContainer();
      const toast = createToastElement('success', message, duration);
      toastContainer.appendChild(toast);
    },
    error: (message, duration = 4000) => {
      ensureContainer();
      const toast = createToastElement('error', message, duration);
      toastContainer.appendChild(toast);
    },
    warning: (message, duration = 3500) => {
      ensureContainer();
      const toast = createToastElement('warning', message, duration);
      toastContainer.appendChild(toast);
    },
    info: (message, duration = 3000) => {
      ensureContainer();
      const toast = createToastElement('info', message, duration);
      toastContainer.appendChild(toast);
    },
    loading: (message) => {
      ensureContainer();
      const toast = document.createElement('div');
      toast.style.cssText = `
        background: #3B82F6;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        font-family: 'Montserrat', sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      toast.innerHTML = `
        <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
        <span>${message}</span>
      `;
      toastContainer.appendChild(toast);
      
      // Add dismiss method to toast
      toast.dismiss = () => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          if (toast && toast.parentNode) toast.remove();
        }, 300);
      };
      
      return toast;
    },
    dismiss: (toastElement) => {
      if (!toastElement) return;
      toastElement.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (toastElement && toastElement.parentNode) toastElement.remove();
      }, 300);
    }
  };
})();
