import React, { MouseEvent, useRef, useState } from 'react';

const Screen = () => {
  const parentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mouse, setMouse] = useState({
    startX: 0,
    startY: 0,
  });
  const [draging, setDraging] = useState(false);

  const handleMouseDown = (ev: MouseEvent) => {
    setMouse({
      startX: ev.pageX - (canvasRef.current?.getBoundingClientRect().left || 0),
      startY: ev.pageY - (canvasRef.current?.getBoundingClientRect().top || 0),
    });
    const ctx = canvasRef.current;
    if (ctx) {
      ctx.width = window.innerWidth || 1000;
      ctx.height = window.innerHeight || 1000;
    }

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

      ctx.clearRect(
        0,
        0,
        parentRef.current?.clientWidth || 1000,
        parentRef.current?.clientHeight || 1000
      );
      ctx.fillStyle = 'red';
      ctx.fillRect(mouse.startX, mouse.startY, width, height);
    }
  };

  const handleMouseUp = () => {
    setDraging(false);
  };

  return (
    <div
      style={{ cursor: draging ? 'crosshair' : 'default' }}
      className="w-full h-full"
      ref={parentRef}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </div>
  );
};

export default Screen;
