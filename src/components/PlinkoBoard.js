import React from 'react';
import Matter from 'matter-js';
import './PlinkoBoard.css';

const { Engine, Render, World, Bodies, Events } = Matter;

const PlinkoBoard = ({ wager, sessionKey, onResult, dropBall, muteEffects }) => {
  const sceneRef = React.useRef(null);
  const engineRef = React.useRef(null);
  const [ball, setBall] = React.useState(null);
  const [result, setResult] = React.useState(null);

  React.useEffect(() => {
    const engine = Engine.create();
    engineRef.current = engine;
    const render = Render.create({
      element: sceneRef.current,
      engine,
      options: { width: 600, height: 400, wireframes: false, background: 'transparent' },
    });

    const pegs = [];
    for (let row = 0; row < 10; row++) {
      const pegCount = 11 - row;
      const spacing = 600 / (pegCount + 1);
      for (let col = 0; col < pegCount; col++) {
        pegs.push(Bodies.circle(spacing * (col + 1), 40 + row * 35, 5, { isStatic: true }));
      }
    }

    const multipliers = [0, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5];
    const slotWidth = 600 / 11;
    const slots = multipliers.map((_, i) =>
      Bodies.rectangle(slotWidth * i + slotWidth / 2, 380, slotWidth, 20, {
        isStatic: true,
        isSensor: true,
        label: `slot-${i}`,
      })
    );

    const walls = [
      Bodies.rectangle(300, 0, 600, 20, { isStatic: true }),
      Bodies.rectangle(0, 200, 20, 400, { isStatic: true }),
      Bodies.rectangle(600, 200, 20, 400, { isStatic: true }),
    ];

    World.add(engine.world, [...pegs, ...slots, ...walls]);
    Engine.run(engine);
    Render.run(render);

    Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label?.startsWith('ball') && bodyB.label?.startsWith('slot')) {
          const slotIndex = parseInt(bodyB.label.split('-')[1], 10);
          const multiplier = multipliers[slotIndex];
          const payout = result?.payout || wager * multiplier;
          const tickets = result?.tickets || wager + Math.floor(payout);
          setResult({ multiplier, payout, tickets });
          onResult({ payout, tickets });
          if (!muteEffects) {
            const audio = new Audio(multiplier > 0 ? '/sounds/win.mp3' : '/sounds/lose.mp3');
            audio.play();
          }
          World.remove(engine.world, bodyA);
          setBall(null);
        }
      });
    });

    return () => {
      Render.stop(render);
      Engine.clear(engine);
      render.canvas.remove();
    };
  }, [ball, wager, onResult, result, muteEffects]);

  const handleDrop = async () => {
    if (!sessionKey || ball) return;

    setBall({ type: 'earth' });
    const txResult = await dropBall(wager);
    if (txResult) setResult(txResult);

    const newBall = Bodies.circle(300, 20, 10, {
      label: 'ball',
      restitution: 0.5,
      friction: 0.1,
    });
    World.add(engineRef.current.world, newBall);
    if (!muteEffects) {
      const audio = new Audio('/sounds/drop.mp3');
      audio.play();
    }
  };

  return (
    <div className="plinko-board">
      <div ref={sceneRef} />
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