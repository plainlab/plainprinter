import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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

    window.electron?.ipcRenderer.invoke('open-screen', { select });
  };

  const handlePrint = () => {
    if (printing) {
      setPrinting(false);
      window.electron?.ipcRenderer.invoke('stop-printing');
    } else {
      setPrinting(true);
      setPageNum(0);
      window.electron?.ipcRenderer.invoke('start-printing', {
        frameCoord,
        nextCoord,
        pages: nextCoord ? pages : 1,
        delay,
      });
    }
  };

  window.electron?.ipcRenderer.on('close-screen', (_, c: Coord) => {
    console.log('close', c);
    handleCloseScreen(c);
  });

  window.electron?.ipcRenderer.on(
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
      <section className="flex flex-col items-stretch justify-center flex-1 px-4 py-4 space-y-6 border rounded">
        <section className="flex items-center justify-start space-x-4">
          <button
            type="button"
            onClick={() => handleOpenScreen('frame')}
            className="btn"
          >
            Select printing area...
          </button>
          {frameCoord ? (
            <span className="flex items-center justify-center space-x-2 opacity-70">
              <p>
                Rectangle: ({frameCoord.x0}, {frameCoord.y0}) ({frameCoord.x1},{' '}
                {frameCoord.y1})
              </p>
              <FontAwesomeIcon
                onClick={() => setFrameCoord(undefined)}
                icon="times-circle"
                className="w-3 h-3 cursor-pointer hover:opacity-50"
              />
            </span>
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
              <span className="flex items-center justify-center space-x-2 opacity-70">
                <p>
                  Point: ({(nextCoord.x0 + nextCoord.x1) / 2},{' '}
                  {(nextCoord.y0 + nextCoord.y1) / 2})
                </p>
                <FontAwesomeIcon
                  onClick={() => setNextCoord(undefined)}
                  icon="times-circle"
                  className="w-3 h-3 cursor-pointer hover:opacity-50"
                />
              </span>
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
          disabled={!frameCoord || (nextCoord && !pages)}
        >
          {printing ? 'Stop printing' : 'Start printing'}
        </button>
      </section>
    </section>
  );
};

export default Main;
