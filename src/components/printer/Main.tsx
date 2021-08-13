import React, { useState } from 'react';
import { ipcRenderer } from 'electron';

interface Coord {
  select: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const Main = () => {
  const [frameCoord, setFrameCoord] = useState<Coord>();
  const [nextCoord, setNextCoord] = useState<Coord>();

  const handleCloseScreen = (c: Coord) => {
    if (c.select === 'frame') {
      setFrameCoord({ ...c });
    } else if (c.select === 'next') {
      setNextCoord({ ...c });
    }
  };

  const handleOpenScreen = (select: string) => {
    if (select === 'frame') {
      setFrameCoord(undefined);
    } else {
      setNextCoord(undefined);
    }

    ipcRenderer.invoke('open-screen', { select });
  };

  ipcRenderer.on('close-screen', (_, c: Coord) => {
    handleCloseScreen(c);
  });

  return (
    <section className="flex flex-col items-start justify-center p-8 space-y-8">
      <section className="flex items-center justify-start">
        <button
          type="button"
          onClick={() => handleOpenScreen('frame')}
          className="btn"
        >
          Select screenshot frame...
        </button>
        {frameCoord ? (
          <p>
            Frame: ({frameCoord.x0}, {frameCoord.y0}) and ({frameCoord.x1},{' '}
            {frameCoord.y1})
          </p>
        ) : (
          <p />
        )}
      </section>

      <section className="flex items-center justify-start">
        <button
          type="button"
          onClick={() => handleOpenScreen('next')}
          className="btn"
        >
          Select next button...
        </button>
        {nextCoord ? (
          <p>
            Next button: ({(nextCoord.x0 + nextCoord.x1) / 2},{' '}
            {(nextCoord.y0 + nextCoord.y1) / 2})
          </p>
        ) : (
          <p />
        )}
      </section>
    </section>
  );
};

export default Main;
