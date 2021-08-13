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
  const [pages, setPages] = useState(0);

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

  const handlePrint = () => {
    ipcRenderer.invoke('start-printing', { frameCoord, nextCoord, pages });
  };

  ipcRenderer.on('close-screen', (_, c: Coord) => {
    handleCloseScreen(c);
  });

  return (
    <section className="absolute inset-0 flex flex-col items-stretch justify-center p-8 space-y-8 bg-gray-100">
      <section className="flex flex-col items-stretch flex-1 p-4 border rounded space-y-7">
        <section className="flex items-center justify-start space-x-4">
          <button
            type="button"
            onClick={() => handleOpenScreen('frame')}
            className="btn"
          >
            Select screenshot frame...
          </button>
          {frameCoord ? (
            <p>
              Rect: ({frameCoord.x0}, {frameCoord.y0}) and ({frameCoord.x1},{' '}
              {frameCoord.y1})
            </p>
          ) : (
            <p />
          )}
        </section>

        <section className="flex items-center justify-start space-x-4">
          <button
            type="button"
            onClick={() => handleOpenScreen('next')}
            className="btn"
          >
            Select next button...
          </button>
          {nextCoord ? (
            <p>
              Point: ({(nextCoord.x0 + nextCoord.x1) / 2},{' '}
              {(nextCoord.y0 + nextCoord.y1) / 2})
            </p>
          ) : (
            <p />
          )}
        </section>

        <section className="flex items-center justify-start ml-1 space-x-4">
          <p>Total pages:</p>
          <input
            value={pages}
            onChange={(e) => setPages(parseInt(e.target.value, 10))}
            type="number"
          />
        </section>
      </section>

      <section className="flex flex-col items-center space-y-4">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full py-2 text-base btn"
          disabled={!frameCoord || !nextCoord || !pages}
        >
          Start printing
        </button>
        <p className="opacity-50">
          You can stop printing anytime by pressing the &quot;ESC&quot; button
        </p>
      </section>
    </section>
  );
};

export default Main;
