import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// Cloud Scene Component
const CloudScene = ({ scrollProgress }) => {
  const mountRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const cloudsRef = useRef([]);
  const frameRef = useRef();

  useEffect(() => {
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1); // Sky blue background
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Cloud shader material
    const cloudVertexShader = `
      uniform float time;
      uniform float scrollProgress;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        vPosition = position;
        vNormal = normal;
        
        vec3 pos = position;
        // Add some movement based on time and scroll
        pos.x += sin(time * 0.5 + position.y * 0.1) * 0.1;
        pos.z += cos(time * 0.3 + position.x * 0.1) * 0.1;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const cloudFragmentShader = `
      uniform float time;
      uniform float scrollProgress;
      uniform vec3 color1;
      uniform vec3 color2;
      uniform vec3 color3;
      varying vec3 vPosition;
      varying vec3 vNormal;
      
      void main() {
        // Create cloud-like noise
        float noise = sin(vPosition.x * 2.0 + time) * 
                     cos(vPosition.y * 3.0 + time * 0.7) * 
                     sin(vPosition.z * 2.5 + time * 0.5);
        
        // Interpolate between colors based on scroll progress
        vec3 color;
        if (scrollProgress < 0.5) {
          color = mix(color1, color2, scrollProgress * 2.0);
        } else {
          color = mix(color2, color3, (scrollProgress - 0.5) * 2.0);
        }
        
        // Add some transparency and glow
        float alpha = 0.7 + noise * 0.3;
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Create cloud material
    const cloudMaterial = new THREE.ShaderMaterial({
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      uniforms: {
        time: { value: 0 },
        scrollProgress: { value: 0 },
        color1: { value: new THREE.Color(0xffffff) }, // White
        color2: { value: new THREE.Color(0xffa500) }, // Orange
        color3: { value: new THREE.Color(0xffc0cb) }  // Pink
      },
      transparent: true,
      side: THREE.DoubleSide
    });

    // Create cloud geometries
    const clouds = [];
    const cloudGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    
    for (let i = 0; i < 20; i++) {
      const cloudGroup = new THREE.Group();
      
      // Create multiple spheres for each cloud
      for (let j = 0; j < 5; j++) {
        const sphere = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
        sphere.position.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        sphere.scale.set(
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.5
        );
        cloudGroup.add(sphere);
      }
      
      // Position clouds in 3D space
      cloudGroup.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20 - 10
      );
      
      scene.add(cloudGroup);
      clouds.push(cloudGroup);
    }
    
    cloudsRef.current = clouds;

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // Update shader uniforms
      clouds.forEach(cloud => {
        cloud.children.forEach(sphere => {
          sphere.material.uniforms.time.value = time;
          sphere.material.uniforms.scrollProgress.value = scrollProgress;
        });
      });
      
      renderer.render(scene, camera);
    };
    
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update camera position based on scroll
  useEffect(() => {
    if (cameraRef.current) {
      const targetZ = 5 - scrollProgress * 15; // Move forward as we scroll
      cameraRef.current.position.z = targetZ;
    }
  }, [scrollProgress]);

  return <div ref={mountRef} className="fixed inset-0 -z-10" />;
};

// Main App Component
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

  return (
    <div className="relative">
      <CloudScene scrollProgress={scrollProgress} />
      
      {/* Content sections for scrolling */}
      <div className="relative z-10">
        <section className="h-screen flex items-center justify-center bg-transparent">
          <div className="text-center text-white">
            <h1 className="text-6xl font-bold mb-4 drop-shadow-lg">
              Cloud Journey
            </h1>
            <p className="text-2xl drop-shadow-md">
              Scroll to explore the sky
            </p>
          </div>
        </section>

        <section className="h-screen flex items-center justify-center bg-transparent">
          <div className="text-center text-white max-w-2xl px-8">
            <h2 className="text-4xl font-bold mb-6 drop-shadow-lg">
              Dawn Approaches
            </h2>
            <p className="text-xl drop-shadow-md leading-relaxed">
              As you journey through the clouds, watch as the colors transform
              from pure white to the warm hues of sunrise. The world awakens
              with golden light painting the sky.
            </p>
          </div>
        </section>

        <section className="h-screen flex items-center justify-center bg-transparent">
          <div className="text-center text-white max-w-2xl px-8">
            <h2 className="text-4xl font-bold mb-6 drop-shadow-lg">
              Sunset Dreams
            </h2>
            <p className="text-xl drop-shadow-md leading-relaxed">
              Continue your journey as the sky blushes with pink and orange,
              creating a magical atmosphere that stretches endlessly
              in all directions.
            </p>
          </div>
        </section>

        <section className="h-screen flex items-center justify-center bg-transparent">
          <div className="text-center text-white max-w-2xl px-8">
            <h2 className="text-4xl font-bold mb-6 drop-shadow-lg">
              Beyond the Horizon
            </h2>
            <p className="text-xl drop-shadow-md leading-relaxed">
              You've traveled far through the ethereal cloudscape.
              The journey continues infinitely, with new colors and
              formations waiting to be discovered.
            </p>
          </div>
        </section>
      </div>

      {/* Scroll indicator */}
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