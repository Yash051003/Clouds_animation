import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const colorStops = [
  [255, 255, 255],  // White
  [255, 165, 0],    // Orange
  [255, 105, 180]   // Pink
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
    renderer.setClearColor(0x87ceeb, 1);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Load cloud textures
    const textureLoader = new THREE.TextureLoader();
    const cloudTextures = [];
    
    // Load multiple cloud textures
    const loadTextures = async () => {
      const texturePromises = [];
      
      // Try to load cloud1.png and cloud2.png, add more as needed
      for (let i = 1; i <= 2; i++) {
        const promise = new Promise((resolve, reject) => {
          textureLoader.load(
            `/clouds/cloud${i}.png`,
            (texture) => {
              texture.transparent = true;
              texture.alphaTest = 0.1;
              resolve(texture);
            },
            undefined,
            (error) => {
              console.warn(`Could not load cloud${i}.png:`, error);
              resolve(null);
            }
          );
        });
        texturePromises.push(promise);
      }
      
      const loadedTextures = await Promise.all(texturePromises);
      cloudTextures.push(...loadedTextures.filter(tex => tex !== null));
      
      // If no textures loaded, create a fallback
      if (cloudTextures.length === 0) {
        console.warn('No cloud textures loaded, using fallback');
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create a simple cloud-like gradient
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        const fallbackTexture = new THREE.CanvasTexture(canvas);
        cloudTextures.push(fallbackTexture);
      }
      
      createClouds();
    };

    const createClouds = () => {
      const clouds = [];
      
      // Create horizontal cloud band - evenly distributed across screen width
      const totalClouds = 120;
      const bandWidth = 60; // Total width of the cloud band
      const bandHeight = 4; // Height of the cloud band (thin horizontal strip)
      const bandCenterY = 0; // Center the band vertically
      
      for (let i = 0; i < totalClouds; i++) {
        // Random texture selection
        const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)].clone();
        texture.needsUpdate = true;
        
        // Create shader material without rotation effects
        const cloudMaterial = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: texture },
            time: { value: 0 },
            scrollProgress: { value: 0 },
            color1: { value: new THREE.Color(0xffffff) },
            color2: { value: new THREE.Color(0xffa500) },
            color3: { value: new THREE.Color(0xff69b4) },
            opacity: { value: 0.4 + Math.random() * 0.5 } // Varying opacity for natural effect
          },
          vertexShader: `
            uniform float time;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
              vUv = uv;
              vPosition = position;
              
              vec3 pos = position;
              // Very subtle vertical floating only - no rotation
              pos.y += sin(time * 0.2 + position.x * 0.02) * 0.03;
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D map;
            uniform float time;
            uniform float scrollProgress;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            uniform float opacity;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
              vec4 texColor = texture2D(map, vUv);
              
              // Color interpolation based on scroll progress
              vec3 color;
              if (scrollProgress < 0.5) {
                color = mix(color1, color2, scrollProgress * 2.0);
              } else {
                color = mix(color2, color3, (scrollProgress - 0.5) * 2.0);
              }
              
              // Apply color tint to the cloud
              vec3 finalColor = texColor.rgb * color;
              
              // Maintain alpha from texture
              float alpha = texColor.a * opacity;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        });
        
        // Use plane geometry for cloud sprites - consistent sizing
        const cloudGeometry = new THREE.PlaneGeometry(
          1.5 + Math.random() * 2.5, // Width: 1.5-4
          1 + Math.random() * 1.5     // Height: 1-2.5
        );
        
        const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        // Position clouds in horizontal band formation
        // Distribute evenly across width with some randomness
        const baseX = -bandWidth/2 + (i / totalClouds) * bandWidth;
        const randomOffsetX = (Math.random() - 0.5) * 3; // Small random offset
        const xPosition = baseX + randomOffsetX;
        
        // Keep clouds in thin horizontal band
        const yPosition = bandCenterY + (Math.random() - 0.5) * bandHeight;
        
        // Multiple depth layers for richness
        const zPosition = -20 + (Math.random() * 25);
        
        cloudMesh.position.set(xPosition, yPosition, zPosition);
        
        // NO rotation applied - clouds maintain original orientation
        cloudMesh.rotation.set(0, 0, 0);
        
        // Varying scale for natural effect
        const scale = 0.6 + Math.random() * 0.8;
        cloudMesh.scale.set(scale, scale, scale);
        
        scene.add(cloudMesh);
        clouds.push(cloudMesh);
      }
      
      // Add additional background layer for more density
      for (let i = 0; i < 60; i++) {
        const texture = cloudTextures[Math.floor(Math.random() * cloudTextures.length)].clone();
        texture.needsUpdate = true;
        
        const cloudMaterial = new THREE.ShaderMaterial({
          uniforms: {
            map: { value: texture },
            time: { value: 0 },
            scrollProgress: { value: 0 },
            color1: { value: new THREE.Color(0xffffff) },
            color2: { value: new THREE.Color(0xffa500) },
            color3: { value: new THREE.Color(0xff69b4) },
            opacity: { value: 0.2 + Math.random() * 0.3 } // Lower opacity for background
          },
          vertexShader: `
            uniform float time;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
              vUv = uv;
              vPosition = position;
              
              vec3 pos = position;
              // Minimal movement for background clouds
              pos.y += sin(time * 0.1 + position.x * 0.01) * 0.02;
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D map;
            uniform float time;
            uniform float scrollProgress;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            uniform float opacity;
            
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
              vec4 texColor = texture2D(map, vUv);
              
              vec3 color;
              if (scrollProgress < 0.5) {
                color = mix(color1, color2, scrollProgress * 2.0);
              } else {
                color = mix(color2, color3, (scrollProgress - 0.5) * 2.0);
              }
              
              vec3 finalColor = texColor.rgb * color;
              float alpha = texColor.a * opacity;
              
              gl_FragColor = vec4(finalColor, alpha);
            }
          `,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.NormalBlending
        });
        
        const cloudGeometry = new THREE.PlaneGeometry(
          2 + Math.random() * 3,
          1.5 + Math.random() * 2
        );
        
        const backgroundCloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
        
        // Distribute background clouds across wider area
        const xPosition = -bandWidth/2 + (Math.random() * bandWidth * 1.2);
        const yPosition = bandCenterY + (Math.random() - 0.5) * (bandHeight * 1.5);
        const zPosition = -35 + (Math.random() * 20);
        
        backgroundCloud.position.set(xPosition, yPosition, zPosition);
        
        // NO rotation for background clouds either
        backgroundCloud.rotation.set(0, 0, 0);
        
        const scale = 0.4 + Math.random() * 0.6;
        backgroundCloud.scale.set(scale, scale, scale);
        
        scene.add(backgroundCloud);
        clouds.push(backgroundCloud);
      }
      
      cloudsRef.current = clouds;
      
      // Start animation loop
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        
        clouds.forEach((cloudMesh, index) => {
          // Update shader uniforms only
          cloudMesh.material.uniforms.time.value = time;
          cloudMesh.material.uniforms.scrollProgress.value = scrollProgress;
          
          // No rotation animations - clouds maintain original orientation
        });
        
        renderer.render(scene, camera);
      };
      
      animate();
    };

    // Start loading textures
    loadTextures();

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
      const targetZ = 5 - scrollProgress * 15;
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
    let animationFrameId;

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
      document.documentElement.style.background = `rgba(${r}, ${g}, ${b}, 0.9)`;
      animationFrameId = requestAnimationFrame(updateBackground);
    };

    updateBackground();
    return () => cancelAnimationFrame(animationFrameId);
  }, [scrollProgress]);

  return (
    <div className="relative z-10">
      <CloudScene scrollProgress={scrollProgress} />
      <div className="relative z-10">
        {['Cloud Journey', 'Dawn Approaches', 'Sunset Dreams', 'Beyond the Horizon'].map((title, idx) => (
          <section key={idx} className="h-screen flex items-center justify-center bg-transparent px-8">
            <div className="text-center text-white max-w-2xl">
              <h2 className="text-4xl font-bold mb-6 drop-shadow-lg">{title}</h2>
              <p className="text-xl drop-shadow-md leading-relaxed">
                {idx === 0
                  ? "Scroll to explore the sky with realistic cloud textures"
                  : "Experience the transformation of the sky as you move forward in your cloud journey."}
              </p>
            </div>
          </section>
        ))}
      </div>
      <div className="fixed bottom-8 right-8 z-20">
        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full p-4">
          <div className="text-white text-sm">
            Scroll: {Math.round(scrollProgress * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;