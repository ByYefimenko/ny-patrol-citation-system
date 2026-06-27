// Lightweight modal helper. Returns a controller with `promise` so callers
// can await confirmation. Esc or backdrop click resolves with false.

let activeBackdrop = null;


function ensureHost() {
  let host = document.querySelector("[data-component='modal-host']");
  if (!host) {
    host = document.createElement("div");
    host.dataset.component = "modal-host";
    document.body.appendChild(host);
  }
  return host;
}


export function openModal({ title, render, footer, size = "md" } = {}) {
  closeActive();
  const host = ensureHost();

  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const modal = document.createElement("div");
  modal.className = `modal modal--${size}`;
  backdrop.appendChild(modal);

  const header = document.createElement("header");
  header.className = "modal__header";
  const h = document.createElement("h2");
  h.className = "modal__title";
  h.textContent = title || "";
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal__close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close dialog");
  closeBtn.innerHTML = "&times;";
  header.append(h, closeBtn);
  modal.appendChild(header);

  const body = document.createElement("div");
  body.className = "modal__body";
  modal.appendChild(body);

  const close = (value = false) => {
    if (backdrop._closed) return;
    backdrop._closed = true;
    document.removeEventListener("keydown", onKey);
    backdrop.remove();
    if (activeBackdrop === backdrop) activeBackdrop = null;
    resolve(value);
  };

  const content = typeof render === "function" ? render({ close }) : render;
  if (typeof content === "string") body.innerHTML = content;
  else if (content instanceof Node) body.appendChild(content);

  if (footer) {
    const footerEl = document.createElement("footer");
    footerEl.className = "modal__footer";
    const nodes = footer({ close });
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((n) => {
      if (n instanceof Node) footerEl.appendChild(n);
    });
    modal.appendChild(footerEl);
  }

  closeBtn.addEventListener("click", () => close(false));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close(false);
  });

  function onKey(e) {
    if (e.key === "Escape") close(false);
  }
  document.addEventListener("keydown", onKey);

  host.appendChild(backdrop);
  activeBackdrop = backdrop;

  setTimeout(() => modal.querySelector("input,select,button,textarea")?.focus(), 50);

  return { close, promise };
}


export function confirmModal({
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false
} = {}) {
  return openModal({
    title,
    render: () => {
      const p = document.createElement("p");
      p.textContent = message || "";
      return p;
    },
    footer: ({ close }) => {
      const cancel = document.createElement("button");
      cancel.className = "btn btn--text";
      cancel.type = "button";
      cancel.textContent = cancelLabel;
      cancel.addEventListener("click", () => close(false));

      const ok = document.createElement("button");
      ok.className = `btn ${destructive ? "btn--danger" : "btn--primary"}`;
      ok.type = "button";
      ok.textContent = confirmLabel;
      ok.addEventListener("click", () => close(true));

      return [cancel, ok];
    }
  }).promise;
}


function closeActive() {
  if (activeBackdrop) {
    activeBackdrop.remove();
    activeBackdrop = null;
  }
}
