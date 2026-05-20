export function ThemeScript() {
  const code = `
    try {
      var storedTheme = localStorage.getItem("laundry-theme");
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (storedTheme === "dark" || (!storedTheme && prefersDark)) {
        document.documentElement.classList.add("dark");
      }
    } catch {}
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
