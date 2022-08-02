import { MouseEvent, useRef, useState, useEffect } from 'react';

const Screen = ({ select }: { select: string }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mouse, setMouse] = useState({
    select,
    startX: 0,
    startY: 0,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
  });
  const [draging, setDraging] = useState(false);

  const closeScreen = () => {
    window.electron.ipcRenderer.invoke('close-screen', { ...mouse });
  };

  const setCanvasSize = () => {
    const ctx = canvasRef.current;
    if (ctx) {
      ctx.width = window.innerWidth || 1000;
      ctx.height = window.innerHeight || 1000;
    }
  };

  const handleMouseDown = (ev: MouseEvent) => {
    setMouse({
      ...mouse,
      startX: ev.pageX - (canvasRef.current?.getBoundingClientRect().left || 0),
      startY: ev.pageY - (canvasRef.current?.getBoundingClientRect().top || 0),
      x0: ev.screenX,
      y0: ev.screenY,
    });

    setCanvasSize();
    setDraging(true);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    if (!draging) {
      return;
    }

    const ctx = canvasRef.current?.getContext('2d');

    if (ctx) {
      const width =
        ev.pageX -
        (canvasRef.current?.getBoundingClientRect().left || 0) -
        mouse.startX;
      const height =
        ev.pageY -
        (canvasRef.current?.getBoundingClientRect().top || 0) -
        mouse.startY;

      setMouse({
        ...mouse,
        x1: ev.screenX,
        y1: ev.screenY,
      });

      ctx.clearRect(
        0,
        0,
        parentRef.current?.clientWidth || 1000,
        parentRef.current?.clientHeight || 1000
      );
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(mouse.startX, mouse.startY, width, height);
    }
  };

  const handleMouseUp = () => {
    setDraging(false);
    closeScreen();
  };

  useEffect(() => {
    window.onresize = setCanvasSize;
  }, []);

  window.electron.ipcRenderer.on('screen-show', () => {
    setCanvasSize();
  });

  return (
    <div
      style={{ cursor: draging ? 'crosshair' : 'default' }}
      className="w-full h-full"
      ref={parentRef}
    >
      <canvas
        ref={canvasRef}
        className="bg-gray-50 opacity-20"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

export default Screen;
