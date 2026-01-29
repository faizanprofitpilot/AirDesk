// Simple toast utility for notifications
// In production, consider using a library like sonner or react-hot-toast

let toastContainer: HTMLDivElement | null = null;

function ensureContainer() {
  if (typeof window === 'undefined') return;
  
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(toastContainer);
  }
}

export function toast(message: string, type: 'success' | 'error' = 'success') {
  if (typeof window === 'undefined') return;
  
  ensureContainer();
  if (!toastContainer) return;

  const toastEl = document.createElement('div');
  toastEl.className = `px-4 py-3 rounded-lg shadow-lg text-sm font-medium min-w-[200px] max-w-[400px] animate-in slide-in-from-right ${
    type === 'success' 
      ? 'bg-[#059669] text-white' 
      : 'bg-[#DC2626] text-white'
  }`;
  toastEl.textContent = message;

  toastContainer.appendChild(toastEl);

  // Auto remove after 3 seconds
  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      toastEl.remove();
    }, 300);
  }, 3000);
}

export function toastSuccess(message: string) {
  toast(message, 'success');
}

export function toastError(message: string) {
  toast(message, 'error');
}
