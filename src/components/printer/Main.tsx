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

  const [pages, setPages] = useState(1);
  const [delay, setDelay] = useState(1);
  const [pageNum, setPageNum] = useState(0);
  const [printing, setPrinting] = useState(false);

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
    if (printing) {
      setPrinting(false);
      ipcRenderer.invoke('stop-printing');
    } else {
      setPrinting(true);
      setPageNum(0);
      ipcRenderer.invoke('start-printing', {
        frameCoord,
        nextCoord,
        pages,
        delay,
      });
    }
  };

  ipcRenderer.on('close-screen', (_, c: Coord) => {
    handleCloseScreen(c);
  });

  ipcRenderer.on(
    'print-progress',
    (_, { page, done }: { page: number; done: boolean }) => {
      setPageNum(page);
      if (done) {
        setPrinting(false);
      }
    }
  );

  return (
    <section className="absolute inset-0 flex flex-col items-stretch justify-center p-8 space-y-8 bg-gray-100">
      <section className="flex flex-col items-stretch justify-end flex-1 px-4 py-6 space-y-8 border rounded">
        <section className="flex items-center justify-start space-x-4">
          <button
            type="button"
            onClick={() => handleOpenScreen('frame')}
            className="btn"
          >
            Select printing area...
          </button>
          {frameCoord ? (
            <p className="opacity-70">
              Rectangle: ({frameCoord.x0}, {frameCoord.y0}) ({frameCoord.x1},{' '}
              {frameCoord.y1})
            </p>
          ) : (
            <p />
          )}
        </section>

        <section className="flex flex-col items-start justify-center space-y-3">
          <section className="flex items-center justify-start space-x-4">
            <button
              type="button"
              onClick={() => handleOpenScreen('next')}
              className="btn"
            >
              Select next button...
            </button>
            {nextCoord ? (
              <p className="opacity-70">
                Point: ({(nextCoord.x0 + nextCoord.x1) / 2},{' '}
                {(nextCoord.y0 + nextCoord.y1) / 2})
              </p>
            ) : (
              <p />
            )}
          </section>

          <section
            className={`flex items-center justify-start ml-5 space-x-2 ${
              nextCoord ? 'opacity-90' : 'opacity-50'
            }`}
          >
            <p>Click next button every:</p>
            <input
              value={delay}
              onChange={(e) => setDelay(parseInt(e.target.value, 10))}
              type="number"
              className="w-10"
              disabled={!nextCoord}
            />
            <p>second{delay === 1 ? '' : 's'}</p>
          </section>

          <section
            className={`flex items-center justify-start ml-5 space-x-2 ${
              nextCoord ? 'opacity-90' : 'opacity-50'
            }`}
          >
            <p>Total clicks:</p>
            <input
              value={pages}
              onChange={(e) => setPages(parseInt(e.target.value, 10))}
              type="number"
              className="w-20"
              disabled={!nextCoord}
            />
            <p className="text-red-600">
              {pageNum > 0 && printing
                ? `(Printing page ${pageNum} of ${pages}...)`
                : null}
            </p>
          </section>
        </section>
      </section>

      <section className="flex flex-col items-center space-y-4">
        <button
          type="button"
          onClick={handlePrint}
          className="w-full py-1 text-base btn"
          disabled={!frameCoord || !pages}
        >
          {printing ? 'Stop printing' : 'Start printing'}
        </button>
      </section>
    </section>
  );
};

export default Main;
