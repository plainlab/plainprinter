import React from 'react';
import { ipcRenderer } from 'electron';

const Main = () => {
  const handleScreenSelect = async () => {
    await ipcRenderer.invoke('open-screen');
  };

  return (
    <section className="flex flex-1">
      <button type="button" onClick={handleScreenSelect}>
        Open
      </button>
    </section>
  );
};

export default Main;
