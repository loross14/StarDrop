import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import './PlinkoBoard.css';

const { Engine, Render, World, Bodies, Events, Runner } = Matter;

const PlinkoBoard = ({ wager, sessionKey, onResult, dropBall, muteEffects }) => {
  const sceneRef = useRef(null);
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const [ball, setBall] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!sceneRef.current) return;
    console.log('PlinkoBoard mounted, sessionKey:', sessionKey);

    const engine = Engine.create();
    engineRef.current = engine;

    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: {
        width: 600,
        height: 400,
        wireframes: false,
        background: '#222222',
      },
    });
    renderRef.current = render;

    if (!sceneRef.current.querySelector('canvas')) {
      sceneRef.current.appendChild(render.canvas);
      console.log('Canvas manually appended to sceneRef');
    }
    render.canvas.style.width = '600px';
    render.canvas.style.height = '400px';

    const pegs = [];
    for (let row = 0; row < 10; row++) {
      const pegCount = 11 - row;
      const spacing = 600 / (pegCount + 1);
      for (let col = 0; col < pegCount; col++) {
        pegs.push(
          Bodies.circle(spacing * (col + 1), 40 + row * 35, 5, {
            isStatic: true,
            render: { fillStyle: '#ffffff' },
          })
        );
      }
    }

    const multipliers = [0, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5];
    const slotWidth = 600 / 11;
    const slots = multipliers.map((_, i) =>
      Bodies.rectangle(slotWidth * i + slotWidth / 2, 380, slotWidth - 5, 30, {
        isStatic: true,
        isSensor: true,
        label: `slot-${i}`,
        render: { fillStyle: '#666666' },
      })
    );

    const walls = [
      Bodies.rectangle(300, 0, 600, 20, { isStatic: true, render: { fillStyle: '#333333' } }),
      Bodies.rectangle(0, 200, 20, 400, { isStatic: true, render: { fillStyle: '#333333' } }),
      Bodies.rectangle(600, 200, 20, 400, { isStatic: true, render: { fillStyle: '#333333' } }),
    ];

    World.add(engine.world, [...pegs, ...slots, ...walls]);
    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    Events.on(engine, 'collisionStart', (event) => {
      console.log('Collision event fired');
      const pairs = event.pairs;
      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        console.log('Collision pair:', { bodyA: bodyA.label, bodyB: bodyB.label });
        if (bodyA.label?.startsWith('ball') && bodyB.label?.startsWith('slot')) {
          World.remove(engine.world, bodyA);
          setBall(null);
          console.log('Ball reset after collision');
        }
      });
    });

    return () => {
      Runner.stop(runner);
      Render.stop(render);
      Engine.clear(engine);
      if (render.canvas && render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas);
      }
    };
  }, [muteEffects, sessionKey]);

  const handleDrop = async () => {
    if (!sessionKey || ball) {
      console.log('Drop blocked:', { sessionKey, ball });
      return;
    }

    console.log('Starting drop—waiting for tx');
    setBall({ type: 'earth' });

    if (!muteEffects) {
      const audioFile = '/sounds/drop.mp3';
      console.log('Attempting to play drop sound:', audioFile);
      try {
        const audio = new Audio(audioFile);
        await audio.play();
        console.log('Drop sound played successfully');
      } catch (error) {
        console.error('Drop sound failed:', error);
      }
    }

    try {
      const txResult = await dropBall(wager);
      console.log('Drop tx completed:', txResult);
      if (txResult) {
        setResult(txResult);
        const newBall = Bodies.circle(300, 20, 10, {
          label: 'ball',
          restitution: 0.5,
          friction: 0.1,
          render: { fillStyle: '#ff0000', strokeStyle: '#000000', lineWidth: 1 },
        });
        if (engineRef.current) {
          World.add(engineRef.current.world, newBall);
          console.log('Ball added to world after tx confirmed');
        }
        setBall(null); // Reset immediately after adding
        console.log('Ball forced reset after tx confirmed');
      }
    } catch (error) {
      console.error('Drop tx failed:', error);
      setBall(null);
    }
  };

  return (
    <div className="plinko-board">
      <div ref={sceneRef} className="plinko-canvas" />
      <button onClick={handleDrop} disabled={!sessionKey || ball}>
        Drop! (Wager: {wager} ETH)
      </button>
      {result && (
        <div className="result">
          <p>Multiplier: {result.multiplier}x</p>
          <p>Payout: {result.payout} ETH</p>
          <p>Tickets: {result.tickets}</p>
        </div>
      )}
    </div>
  );
};

export default PlinkoBoard;