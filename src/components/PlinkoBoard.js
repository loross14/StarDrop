import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import styled from 'styled-components';

const PlinkoBoard = ({ wager, sessionKey, onResult, dropBall, muteEffects, onDrop }) => {
  const mountRef = useRef(null);
  const slotsRef = useRef([]);
  const [ball, setBall] = useState(null);
  const [result, setResult] = useState(null);
  const scene = useRef(new THREE.Scene());
  const camera = useRef(null);
  const renderer = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    console.log('PlinkoBoard mounted, sessionKey:', sessionKey);

    const width = window.innerWidth * 0.9;
    const height = window.innerHeight * 0.85;
    camera.current = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    renderer.current = new THREE.WebGLRenderer({ alpha: true });
    renderer.current.setSize(width, height);
    mountRef.current.appendChild(renderer.current.domElement);

    scene.current.background = new THREE.Color(0x0a0015);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.current.add(ambientLight);
    const pointLight = new THREE.PointLight(0x32CD32, 1.5, 1000); // Lime green
    pointLight.position.set(0, height / 2, 100);
    scene.current.add(pointLight);

    const pegs = [];
    for (let row = 0; row < 20; row++) {
      const pegCount = 15 - Math.floor(row / 2);
      const spacing = width / (pegCount + 1);
      for (let col = 0; col < pegCount; col++) {
        const geometry = new THREE.SphereGeometry(10, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0x757575, shininess: 100 });
        const peg = new THREE.Mesh(geometry, material);
        peg.position.set(spacing * (col + 1) - width / 2, height - (50 + row * 30) - height / 2, 0);
        pegs.push(peg);
        scene.current.add(peg);
      }
    }

    const multipliers = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 10, 20];
    const slotWidth = width / 12;
    slotsRef.current = multipliers.map((_, i) => {
      const colors = [0xd32f2f, 0xf57c00, 0xfbc02d, 0x388e3c, 0x0288d1, 0x1976d2, 0x7b1fa2, 0xc2185b, 0xe91e63, 0x32CD32, 0x4caf50, 0x9c27b0];
      const geometry = new THREE.BoxGeometry(slotWidth - 10, 40, 15);
      const material = new THREE.MeshPhongMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.2 });
      const slot = new THREE.Mesh(geometry, material);
      slot.position.set(slotWidth * i + slotWidth / 2 - width / 2, -height / 2 + 20, 0);
      slot.userData = { id: `slot-${i}`, multiplier: multipliers[i] };
      scene.current.add(slot);
      return slot;
    });

    const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x263238, shininess: 50 });
    const walls = [
      new THREE.Mesh(new THREE.BoxGeometry(width, 20, 10), wallMaterial),
      new THREE.Mesh(new THREE.BoxGeometry(20, height, 10), wallMaterial),
      new THREE.Mesh(new THREE.BoxGeometry(20, height, 10), wallMaterial),
    ];
    walls[0].position.set(0, height / 2 - 10, 0);
    walls[1].position.set(-width / 2, 0, 0);
    walls[2].position.set(width / 2, 0, 0);
    walls.forEach(wall => scene.current.add(wall));

    camera.current.position.z = 500;

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.current.render(scene.current, camera.current);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.current.domElement) {
        mountRef.current.removeChild(renderer.current.domElement);
      }
    };
  }, [muteEffects, sessionKey]);

  const handleDrop = async () => {
    if (!sessionKey || ball) {
      console.log('Drop blocked:', { sessionKey, ball });
      return;
    }

    console.log('Starting drop—waiting for tx');
    setBall({ type: 'rocket' });

    try {
      const txResult = await dropBall(wager);
      console.log('Drop tx completed:', txResult);
      if (txResult) {
        setResult(txResult);

        const oldBall = scene.current.children.find(child => child.userData && child.userData.id === 'ball');
        if (oldBall) {
          scene.current.remove(oldBall);
          console.log('Old ball removed from scene');
        }

        const geometry = new THREE.SphereGeometry(15, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x32CD32, emissiveIntensity: 0.3 });
        const newBall = new THREE.Mesh(geometry, material);
        newBall.position.set(0, window.innerHeight * 0.85 / 2 - 20, 0);
        newBall.userData = { id: 'ball' };
        scene.current.add(newBall);

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

        gsap.to(newBall.position, {
          y: -window.innerHeight * 0.85 / 2 + 20,
          x: (Math.random() - 0.5) * (window.innerWidth * 0.9 - 100),
          duration: 4,
          ease: 'power1.inOut',
          onUpdate: () => {
            const pegs = scene.current.children.filter(child => child.geometry instanceof THREE.SphereGeometry && !child.userData.id);
            pegs.forEach(peg => {
              const dist = newBall.position.distanceTo(peg.position);
              if (dist < 25) {
                gsap.to(newBall.position, { x: newBall.position.x + (Math.random() - 0.5) * 50, duration: 0.2 });
              }
            });
          },
          onComplete: () => {
            const slotWidth = (window.innerWidth * 0.9) / 12;
            const slot = slotsRef.current.find(s => Math.abs(s.position.x - newBall.position.x) < slotWidth / 2);
            if (slot) {
              console.log('Ball landed in:', slot.userData.id, 'Multiplier:', slot.userData.multiplier);
              gsap.to(slot.material.emissive, { intensity: 0.8, duration: 0.5, yoyo: true, repeat: 1 });
            }
            scene.current.remove(newBall);
            setBall(null);
            console.log('Ball animation complete and removed');
          },
        });

        console.log('New ball added and animated');
      }
    } catch (error) {
      console.error('Drop tx failed:', error);
      setBall(null);
    }
  };

  // Expose handleDrop via prop
  useEffect(() => {
    if (onDrop) onDrop(handleDrop);
  }, [wager, sessionKey, dropBall, muteEffects, onDrop]);

  return (
    <BoardContainer>
      <Canvas ref={mountRef} />
    </BoardContainer>
  );
};

const BoardContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  height: 85vh;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 0 30px rgba(50, 205, 50, 0.5); /* Lime green */
`;

const Canvas = styled.div`
  width: 100%;
  height: 100%;
`;

export default PlinkoBoard;