const Utils = (() => {
  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const toISODate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  };

  const diffDays = (from, to) => {
    const ms = new Date(to).setHours(0, 0, 0, 0) - new Date(from).setHours(0, 0, 0, 0);
    return Math.round(ms / 864e5);
  };

  const parseTags = (value) => {
    if (!value) return [];
    return value
      .split(/[,;]+/) 
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => tag.toLowerCase());
  };

  const showToast = (message) => {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toast.dismissTimer);
    toast.dismissTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const chooseRandom = (items) => items[Math.floor(Math.random() * items.length)];

  const cleanNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  return {
    formatDate,
    toISODate,
    diffDays,
    parseTags,
    showToast,
    clamp,
    chooseRandom,
    cleanNumber,
  };
})();
