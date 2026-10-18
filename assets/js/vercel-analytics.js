/**
 * Vercel Web Analytics (static site).
 * Equivalent to inject() from @vercel/analytics — loads /_vercel/insights/script.js on Vercel.
 */
(function () {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return;

  if (document.querySelector("script[data-vercel-analytics]")) return;

  window.va =
    window.va ||
    function () {
      (window.vaq = window.vaq || []).push(arguments);
    };

  var script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  script.setAttribute("data-vercel-analytics", "");
  document.head.appendChild(script);
})();
