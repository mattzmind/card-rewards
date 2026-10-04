/* Browser stand-in for the phone's key-value storage, used only for previewing screens on the web. */
const Storage = {
  getItemSync: (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } },
  setItemSync: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};
export default Storage;
