import React from 'react';
import { ipcRenderer } from 'electron';

const Printer = () => {
  const handleScreenSelect = async () => {
    await ipcRenderer.invoke('open-selector');
  };

  return (
    <section className="flex flex-1">
      <button type="button" onClick={handleScreenSelect}>
        Open
      </button>
    </section>
  );
};

export default Printer;
