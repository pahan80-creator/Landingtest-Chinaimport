/* Restore the saved design before styles load, avoiding a flash of the other theme. */
(() => {
  let theme = 'day';
  try {
    if (localStorage.getItem('china-import-theme') === 'night') theme = 'night';
  } catch {
    // The switch still works when browser storage is unavailable.
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
