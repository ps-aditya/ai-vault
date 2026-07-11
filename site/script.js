// Small, deliberate touch: sequence/principle cards fade in as they enter
// view. No scroll libraries, no parallax — just enough motion to feel
// intentional rather than static.
const revealTargets = document.querySelectorAll(
  ".sequence-rail article, .principle-grid article, .md-card"
);

if ("IntersectionObserver" in window && revealTargets.length) {
  revealTargets.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    el.style.transition = "opacity 500ms ease, transform 500ms ease";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el) => observer.observe(el));
}
