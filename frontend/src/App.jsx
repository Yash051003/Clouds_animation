import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const colorStops = [
  [0, 0, 0],        // Black
  [255, 105, 180],  // Pink
  [135, 206, 235]   // Sky Blue
];

const interpolateColor = (c1, c2, t) =>
  c1.map((v, i) => Math.round(v + (c2[i] - v) * t));

const CloudScene = ({ scrollProgress }) => {
  const mountRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const cloudsRef = useRef([]);
  const frameRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Better lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const loadCloudTextures = () => {
      return new Promise((resolve) => {
        const textureLoader = new THREE.TextureLoader();
        const cloudTextures = [];
        const loadPromises = [];
        
        // Load 5 cloud textures
        for (let i = 1; i <= 5; i++) {
          const promise = new Promise((resolveTexture) => {
            textureLoader.load(
              `/clouds/cloud${i}.png`,
              (texture) => {
                // Configure texture properties
                texture.transparent = true;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.needsUpdate = true;
                
                cloudTextures[i - 1] = texture;
                console.log(`✓ Loaded cloud${i}.png (${texture.image.width}x${texture.image.height})`);
                resolveTexture(texture);
              },
              undefined,
              (error) => {
                console.warn(`Could not load cloud${i}.png, creating fallback`);
                // Create a simple fallback texture
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                
                ctx.clearRect(0, 0, 512, 512);
                
                // Create simple cloud shape
                const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 200);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);
                
                const fallbackTexture = new THREE.CanvasTexture(canvas);
                fallbackTexture.transparent = true;
                fallbackTexture.wrapS = THREE.RepeatWrapping;
                fallbackTexture.wrapT = THREE.RepeatWrapping;
                fallbackTexture.minFilter = THREE.LinearFilter;
                fallbackTexture.magFilter = THREE.LinearFilter;
                fallbackTexture.needsUpdate = true;
                
                cloudTextures[i - 1] = fallbackTexture;
                resolveTexture(fallbackTexture);
              }
            );
          });
          loadPromises.push(promise);
        }
        
        Promise.all(loadPromises)
          .then(() => {
            console.log(`All cloud textures loaded: ${cloudTextures.length}`);
            resolve(cloudTextures);
          });
      });
    };

    const createClouds = async () => {
      try {
        const cloudTextures = await loadCloudTextures();
        const clouds = [];
      
        // Create foreground clouds
        const foregroundCount = 80;
        for (let i = 0; i < foregroundCount; i++) {
          const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)];
          
          const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7 + Math.random() * 0.3,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
          });
          
          const geometry = new THREE.PlaneGeometry(
            2 + Math.random() * 4,
            1 + Math.random() * 2
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          
          // Position clouds in a more visible area
          cloud.position.set(
            (Math.random() - 0.5) * 40, // -20 to 20
            (Math.random() - 0.5) * 10 - 2, // -7 to 3 (slightly lower)
            (Math.random() - 0.5) * 20 // -10 to 10
          );
          
          cloud.rotation.z = (Math.random() - 0.5) * 0.4;
          
          const scale = 0.5 + Math.random() * 1.5;
          cloud.scale.set(scale, scale, scale);
          
          // Add movement properties
          cloud.userData = {
            baseSpeed: 0.3 + Math.random() * 0.7,
            floatSpeed: 0.5 + Math.random() * 0.5,
            floatAmount: 0.1 + Math.random() * 0.2,
            originalY: cloud.position.y,
            isBackground: false
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        
        // Create background clouds
        const backgroundCount = 40;
        for (let i = 0; i < backgroundCount; i++) {
          const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)];
          
          const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            opacity: 0.3 + Math.random() * 0.4,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
          });
          
          const geometry = new THREE.PlaneGeometry(
            3 + Math.random() * 5,
            1.5 + Math.random() * 3
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          
          // Position background clouds further back
          cloud.position.set(
            (Math.random() - 0.5) * 60, // -30 to 30
            (Math.random() - 0.5) * 15 - 1, // -8.5 to 6.5
            -15 + Math.random() * 10 // -15 to -5
          );
          
          cloud.rotation.z = (Math.random() - 0.5) * 0.3;
          
          const scale = 0.8 + Math.random() * 1.2;
          cloud.scale.set(scale, scale, scale);
          
          // Add movement properties
          cloud.userData = {
            baseSpeed: 0.1 + Math.random() * 0.3,
            floatSpeed: 0.3 + Math.random() * 0.3,
            floatAmount: 0.05 + Math.random() * 0.1,
            originalY: cloud.position.y,
            isBackground: true
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        
        cloudsRef.current = clouds;
        console.log(`Created ${clouds.length} clouds successfully`);
      } catch (error) {
        console.error('Error creating clouds:', error);
        // Create fallback clouds without textures
        const clouds = [];
        for (let i = 0; i < 20; i++) {
          const material = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          
          const geometry = new THREE.PlaneGeometry(
            2 + Math.random() * 3,
            1 + Math.random() * 2
          );
          
          const cloud = new THREE.Mesh(geometry, material);
          cloud.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 10 - 2,
            (Math.random() - 0.5) * 20
          );
          
          cloud.userData = {
            baseSpeed: 0.3 + Math.random() * 0.7,
            floatSpeed: 0.5 + Math.random() * 0.5,
            floatAmount: 0.1 + Math.random() * 0.2,
            originalY: cloud.position.y,
            isBackground: false
          };
          
          scene.add(cloud);
          clouds.push(cloud);
        }
        cloudsRef.current = clouds;
      }
    };

    createClouds();

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;
      
      cloudsRef.current.forEach((cloud) => {
        const userData = cloud.userData;
        
        // Horizontal movement with scroll influence
        const speedMultiplier = 1 + (scrollProgress * 2);
        const moveSpeed = userData.baseSpeed * speedMultiplier;
        cloud.position.x += moveSpeed * 0.016; // Normalize to 60fps
        
        // Vertical floating
        const floatOffset = Math.sin(time * userData.floatSpeed) * userData.floatAmount;
        cloud.position.y = userData.originalY + floatOffset;
        
        // Reset position when cloud moves off screen
        if (cloud.position.x > 30) {
          cloud.position.x = -30 - Math.random() * 10;
          // Randomize Y position on reset
          const yRange = userData.isBackground ? 15 : 10;
          const yOffset = userData.isBackground ? -1 : -2;
          cloud.position.y = (Math.random() - 0.5) * yRange + yOffset;
          userData.originalY = cloud.position.y;
        }
      });
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (cameraRef.current) {
      // Slight camera movement based on scroll
      const targetY = scrollProgress * 2;
      const targetZ = 5 - scrollProgress * 2;
      cameraRef.current.position.y = targetY;
      cameraRef.current.position.z = targetZ;
    }
  }, [scrollProgress]);

  return <div ref={mountRef} className="fixed inset-0 -z-10" />;
};

const App = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(scrollTop / docHeight, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateBackground = () => {
      const p = scrollProgress;
      let startColor, endColor, t;
      
      if (p < 0.5) {
        startColor = colorStops[0];
        endColor = colorStops[1];
        t = p / 0.5;
      } else {
        startColor = colorStops[1];
        endColor = colorStops[2];
        t = (p - 0.5) / 0.5;
      }
      
      const [r, g, b] = interpolateColor(startColor, endColor, t);
      document.body.style.background = `linear-gradient(180deg, rgb(${r}, ${g}, ${b}) 0%, rgb(${Math.floor(r*0.7)}, ${Math.floor(g*0.7)}, ${Math.floor(b*0.7)}) 100%)`;
    };

    updateBackground();
  }, [scrollProgress]);

  return (
    <div className="relative z-10">
      <CloudScene scrollProgress={scrollProgress} />
      <div className="relative z-10">
        {[
          {
            title: "Say hello to",
            subtitle: "the ultimate",
            description: "shader editor.",
            detail: "Create, fork and publish shader graphs with the world using an intuitive and easy to use tool built for all."
          },
          {
            title: "Ethereal Awakening",
            subtitle: "Pink dreams emerge from shadow",
            description: "Creative Expression.",
            detail: "Watch as vibrant hues illuminate the path ahead, revealing new dimensions of artistic possibility."
          },
          {
            title: "Celestial Horizon",
            subtitle: "Transformation reaches the sky",
            description: "Infinite Potential.",
            detail: "Transcend the boundaries of imagination as blue heavens open to endless creative opportunities."
          },
          {
            title: "Beyond the Clouds",
            subtitle: "Where sky meets eternity",
            description: "Pure Artistry.",
            detail: "Experience the ultimate synthesis of color and motion in this realm of digital creativity."
          }
        ].map((section, idx) => (
          <section key={idx} className="h-screen flex items-center justify-center bg-transparent px-8">
            <div className="text-center text-white max-w-4xl">
              <div className="mb-8">
                <h2 className="text-5xl md:text-7xl font-bold mb-2 tracking-tight drop-shadow-2xl leading-tight">
                  {section.title}
                </h2>
                <h3 className="text-5xl md:text-7xl font-bold mb-2 tracking-tight drop-shadow-2xl leading-tight">
                  {section.subtitle}
                </h3>
                <h4 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight drop-shadow-2xl leading-tight">
                  {section.description}
                </h4>
              </div>
              <p className="text-lg md:text-xl font-normal leading-relaxed opacity-90 max-w-2xl mx-auto drop-shadow-md mb-8">
                {section.detail}
              </p>
              {idx === 0 && (
                <button className="bg-white bg-opacity-10 backdrop-blur-md border border-white border-opacity-20 text-white px-8 py-4 rounded-full font-medium hover:bg-opacity-20 transition-all duration-300 drop-shadow-lg">
                  Open App →
                </button>
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="fixed bottom-8 right-8 z-20">
        <div className="bg-black bg-opacity-30 backdrop-blur-md rounded-2xl px-6 py-4 border border-white border-opacity-10">
          <div className="text-white text-sm font-medium tracking-wide">
            Scroll: {Math.round(scrollProgress * 100)}%
          </div>
          <div className="w-24 h-1 bg-white bg-opacity-20 rounded-full mt-2">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;