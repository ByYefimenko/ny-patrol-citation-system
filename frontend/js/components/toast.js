// Toast helper. The host element is created on demand if a page didn't
// add one already.

let host = null;


function ensureHost() {
  if (host) return host;
  host = document.querySelector("[data-component='toast-host']");
  if (!host) {
    host = document.createElement("div");
    host.dataset.component = "toast-host";
    document.body.appendChild(host);
  }
  host.classList.add("toast-host");
  return host;
}


export function toast({ title, message, variant = "info", timeout = 4500 } = {}) {
  const root = ensureHost();
  const node = document.createElement("div");
  node.className = `toast toast--${variant}`;
  node.setAttribute("role", variant === "error" ? "alert" : "status");

  if (title) {
    const t = document.createElement("div");
    t.className = "toast__title";
    t.textContent = title;
    node.appendChild(t);
  }
  if (message) {
    const m = document.createElement("div");
    m.className = "toast__message";
    m.textContent = message;
    node.appendChild(m);
  }
  root.appendChild(node);

  const remove = () => {
    node.classList.add("is-leaving");
    setTimeout(() => node.remove(), 220);
  };

  if (timeout > 0) setTimeout(remove, timeout);
  node.addEventListener("click", remove);
  return remove;
}


export const success = (message, title = "Success") =>
  toast({ title, message, variant: "success" });
export const error = (message, title = "Something went wrong") =>
  toast({ title, message, variant: "error", timeout: 6000 });
export const info = (message, title = "Heads up") => toast({ title, message });
export const warning = (message, title = "Warning") =>
  toast({ title, message, variant: "warning" });
