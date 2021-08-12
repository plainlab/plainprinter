import React, { MouseEvent, useRef, useState } from 'react';

const Screen = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [mouse, setMouse] = useState({
    startX: 0,
    startY: 0,
  });
  const [draging, setDraging] = useState(true);

  const handleMouseDown = (ev: MouseEvent) => {
    setMouse({
      startX: ev.pageX - (canvasRef.current?.getBoundingClientRect().left || 0),
      startY: ev.pageY - (canvasRef.current?.getBoundingClientRect().top || 0),
    });

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

      ctx.clearRect(0, 0, 1000, 1000);
      ctx.fillStyle = 'red';
      ctx.fillRect(mouse.startX, mouse.startY, width, height);
    }
  };

  const handleMouseUp = () => {
    setDraging(false);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: draging ? 'crosshair' : 'default' }}
      className="relative w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};

export default Screen;
